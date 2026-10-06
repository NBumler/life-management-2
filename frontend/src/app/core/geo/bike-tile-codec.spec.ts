import { BIKE_COST_CLASS, decodeBikeTile } from './bike-tile-codec';

/** A `scripts/build-geo-assets.mjs` kódolásának tükre, a dekódoló formátum-szerződésének teszteléséhez. */
function encode(ways: { cls: number; points: number[][] }[]): ArrayBuffer {
	const bytes: number[] = [];
	const pushInt = (value: number, size: 2 | 4) => {
		const view = new DataView(new ArrayBuffer(size));
		if (size === 2) {
			view.setInt16(0, value, true);
		} else {
			view.setInt32(0, value, true);
		}
		for (let i = 0; i < size; i++) {
			bytes.push(view.getUint8(i));
		}
	};
	bytes.push(0x4c, 0x4d, 0x42, 0x4b); // "LMBK"
	pushInt(1, 4);
	pushInt(ways.length, 4);
	for (const way of ways) {
		bytes.push(way.cls);
		const count = way.points.length;
		bytes.push(count & 0xff, count >> 8);
		pushInt(Math.round(way.points[0][0] * 1e6), 4);
		pushInt(Math.round(way.points[0][1] * 1e6), 4);
		for (let i = 1; i < count; i++) {
			const dLon = Math.round((way.points[i][0] - way.points[i - 1][0]) * 1e6);
			const dLat = Math.round((way.points[i][1] - way.points[i - 1][1]) * 1e6);
			if (dLon >= -32767 && dLon <= 32767 && dLat >= -32767 && dLat <= 32767) {
				pushInt(dLon, 2);
				pushInt(dLat, 2);
			} else {
				pushInt(-32768, 2);
				pushInt(Math.round(way.points[i][0] * 1e6), 4);
				pushInt(Math.round(way.points[i][1] * 1e6), 4);
			}
		}
	}
	return new Uint8Array(bytes).buffer;
}

describe('decodeBikeTile', () => {
	it('decodes delta-encoded ways with their cost class', () => {
		const buffer = encode([
			{ cls: BIKE_COST_CLASS.CYCLEWAY, points: [[19.0, 47.5], [19.001, 47.5005], [19.0015, 47.501]] },
			{ cls: BIKE_COST_CLASS.MAIN_ROAD, points: [[20.1, 46.9], [20.1002, 46.9]] },
		]);

		const ways = decodeBikeTile(buffer);

		expect(ways.length).toBe(2);
		expect(ways[0].costClass).toBe(BIKE_COST_CLASS.CYCLEWAY);
		expect(ways[0].coordinates[1][0]).toBeCloseTo(19.001, 6);
		expect(ways[0].coordinates[2][1]).toBeCloseTo(47.501, 6);
		expect(ways[1].costClass).toBe(BIKE_COST_CLASS.MAIN_ROAD);
		expect(ways[1].coordinates[1][0]).toBeCloseTo(20.1002, 6);
	});

	it('restores absolute coordinates after an escape (jump larger than int16 delta)', () => {
		const buffer = encode([{ cls: BIKE_COST_CLASS.ROAD, points: [[17.0, 47.0], [17.5, 47.0], [17.5005, 47.0003]] }]);

		const [way] = decodeBikeTile(buffer);

		expect(way.coordinates[1][0]).toBeCloseTo(17.5, 6);
		expect(way.coordinates[2][0]).toBeCloseTo(17.5005, 6);
		expect(way.coordinates[2][1]).toBeCloseTo(47.0003, 6);
	});

	it('rejects a buffer with a foreign header', () => {
		const buffer = encode([]);
		new Uint8Array(buffer)[0] = 0x58;

		expect(() => decodeBikeTile(buffer)).toThrowError(/fejléc/);
	});

	it('rejects trailing bytes instead of silently ignoring them', () => {
		const buffer = encode([{ cls: 0, points: [[19.0, 47.5], [19.0001, 47.5]] }]);
		const padded = new Uint8Array(buffer.byteLength + 3);
		padded.set(new Uint8Array(buffer));

		expect(() => decodeBikeTile(padded.buffer)).toThrowError(/maradt/);
	});
});

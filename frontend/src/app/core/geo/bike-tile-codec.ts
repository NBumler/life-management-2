/**
 * backlog/150 — a bicikli-úthálózat csempéjének (build asset, `scripts/build-geo-assets.mjs`) dekódolója.
 * A formátum leírása a script fejlécében van; ezt a fájlt az kódolja, tehát a kettőt együtt kell
 * tartani. Little-endian, a koordináták 1e-6 fokos egész számok.
 */

/** Költségosztály a build-ben rögzített úttípusból (a szorzókat a bike-routing-profile adja). */
export const BIKE_COST_CLASS = {
	CYCLEWAY: 0,
	OFFROAD: 1,
	QUIET_ROAD: 2,
	ROAD: 3,
	MAIN_ROAD: 4,
} as const;

export interface BikeWay {
	costClass: number;
	/** `[lon, lat]` pairs, GeoJSON order. */
	coordinates: number[][];
}

const MAGIC = 'LMBK';
const VERSION = 1;
const COORD_SCALE = 1_000_000;
const ESCAPE = -32768;

export function decodeBikeTile(buffer: ArrayBuffer): BikeWay[] {
	const view = new DataView(buffer);
	const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
	if (magic !== MAGIC) {
		throw new Error(`Bicikli csempe: ismeretlen fejléc (${magic})`);
	}
	const version = view.getUint32(4, true);
	if (version !== VERSION) {
		throw new Error(`Bicikli csempe: nem támogatott verzió (${version})`);
	}
	const wayCount = view.getUint32(8, true);
	const ways: BikeWay[] = [];
	let o = 12;
	for (let w = 0; w < wayCount; w++) {
		const costClass = view.getUint8(o);
		const pointCount = view.getUint16(o + 1, true);
		let lon = view.getInt32(o + 3, true);
		let lat = view.getInt32(o + 7, true);
		o += 11;
		const coordinates: number[][] = [[lon / COORD_SCALE, lat / COORD_SCALE]];
		for (let i = 1; i < pointCount; i++) {
			const dLon = view.getInt16(o, true);
			if (dLon === ESCAPE) {
				lon = view.getInt32(o + 2, true);
				lat = view.getInt32(o + 6, true);
				o += 10;
			} else {
				lon += dLon;
				lat += view.getInt16(o + 2, true);
				o += 4;
			}
			coordinates.push([lon / COORD_SCALE, lat / COORD_SCALE]);
		}
		ways.push({ costClass, coordinates });
	}
	if (o !== buffer.byteLength) {
		throw new Error(`Bicikli csempe: ${buffer.byteLength - o} bájt maradt a dekódolás után`);
	}
	return ways;
}

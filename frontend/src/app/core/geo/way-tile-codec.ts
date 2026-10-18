/**
 * backlog/150 + backlog/151 — útvonal-csempe (build asset, `scripts/build-geo-assets.mjs`) dekódolója.
 * Közös formátum a bicikli- és a turistaút-hálózatnak is (`core/geo/bike-routing-profile.ts` és
 * `hike-routing-profile.ts`): az osztálybájt jelentése profil-függő (bicikliben úttípus-költség,
 * turistaútban egységesen 0, mert a hegyi út nem preferáltabb egy másiknál). A formátum leírása a
 * build-script fejlécében van; ezt a fájlt az kódolja, tehát a kettőt együtt kell tartani.
 * Little-endian, a koordináták 1e-6 fokos egész számok.
 */

export interface WayFeature {
	/** Profil-függő osztály (bicikliben úttípus-költség, turistaútban mindig 0). */
	costClass: number;
	/** `[lon, lat]` pairs, GeoJSON order. */
	coordinates: number[][];
}

const MAGIC = 'LMBK';
const VERSION = 1;
const COORD_SCALE = 1_000_000;
const ESCAPE = -32768;

export function decodeWayTile(buffer: ArrayBuffer): WayFeature[] {
	const view = new DataView(buffer);
	const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
	if (magic !== MAGIC) {
		throw new Error(`Útvonal-csempe: ismeretlen fejléc (${magic})`);
	}
	const version = view.getUint32(4, true);
	if (version !== VERSION) {
		throw new Error(`Útvonal-csempe: nem támogatott verzió (${version})`);
	}
	const wayCount = view.getUint32(8, true);
	const ways: WayFeature[] = [];
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
		throw new Error(`Útvonal-csempe: ${buffer.byteLength - o} bájt maradt a dekódolás után`);
	}
	return ways;
}

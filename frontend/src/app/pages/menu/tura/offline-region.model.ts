import { Bbox } from '../../../core/data/trail-segment.repository';
import { TrailSegment } from '../../../api/model/trailSegment';

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — egy régiónként letöltött offline terület: a hozzá
 * tartozó csempék és turistaút-szakaszok metaadata. A "régió" nyitott kérdést (közigazgatási határ
 * vs. rács vs. szabadon rajzolt terület) a legegyszerűbb, extra UI nélküli megoldással zártuk le: a
 * felhasználó aktuális térkép-nézete (viewport bbox-a) a letöltés pillanatában.
 */
export interface OfflineRegion {
	id: string;
	name: string;
	bbox: Bbox;
	tileCount: number;
	approxSizeBytes: number;
	createdAt: string;
}

/** Egy régió teljes tartalma (csempe-koordináták + turistaút-szakaszok) — a törléshez és az offline útvonal-graf felépítéséhez kell, nem a listázó panelhez, ezért külön fájlban, nem a könnyű `regions.json` indexben. */
export interface OfflineRegionManifest {
	tiles: TileRef[];
	segments: TrailSegment[];
}

export interface TileRef {
	z: number;
	x: number;
	y: number;
}

/** Egyetlen, mindenki számára ingyenes, kulcs nélküli alaptérkép támogatott offline letöltésre — ld. tura.page.ts BASE_STYLE megjegyzését: a topo/szatellit réteg csak online marad, hogy a letöltés/tárhely-kezelés ne hármas komplexitású legyen. */
export const OFFLINE_BASEMAP_ID = 'osm';

/** Túrázási léptékhez elég részletes (utak/ösvények jól látszanak), de nem robbantja fel a csempeszámot. */
export const OFFLINE_TILE_MIN_ZOOM = 12;
export const OFFLINE_TILE_MAX_ZOOM = 15;

/** Biztonsági korlát: ennél nagyobb (pl. véletlenül ország-léptékű) terület letöltését elutasítjuk, hogy ne fussunk neki több tízezer csempe letöltésének. */
export const OFFLINE_TILE_MAX_COUNT = 2_500;

export function offlineZoomLevels(): number[] {
	const levels: number[] = [];
	for (let z = OFFLINE_TILE_MIN_ZOOM; z <= OFFLINE_TILE_MAX_ZOOM; z++) {
		levels.push(z);
	}
	return levels;
}

function lonToTileX(lon: number, z: number): number {
	return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latToTileY(lat: number, z: number): number {
	const latRad = (lat * Math.PI) / 180;
	return Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z);
}

/** Szabványos slippy-map csempe-tartomány egy bbox-hoz adott zoom-szinten (Web Mercator). */
export function tilesInBboxAtZoom(bbox: Bbox, z: number): TileRef[] {
	const [minLon, minLat, maxLon, maxLat] = bbox;
	const minX = lonToTileX(minLon, z);
	const maxX = lonToTileX(maxLon, z);
	// A tileY lat-tal fordítva nő (északról délre) — a bbox északi (max lat) éle adja a kisebb Y-t.
	const minY = latToTileY(maxLat, z);
	const maxY = latToTileY(minLat, z);
	const tiles: TileRef[] = [];
	for (let x = minX; x <= maxX; x++) {
		for (let y = minY; y <= maxY; y++) {
			tiles.push({ z, x, y });
		}
	}
	return tiles;
}

export function tilesInBbox(bbox: Bbox): TileRef[] {
	const tiles: TileRef[] = [];
	for (const z of offlineZoomLevels()) {
		tiles.push(...tilesInBboxAtZoom(bbox, z));
	}
	return tiles;
}

export function tileKey(tile: TileRef): string {
	return `${tile.z}:${tile.x}:${tile.y}`;
}

export function bboxIntersects(a: Bbox, b: Bbox): boolean {
	const [aMinLon, aMinLat, aMaxLon, aMaxLat] = a;
	const [bMinLon, bMinLat, bMaxLon, bMaxLat] = b;
	return aMinLon <= bMaxLon && aMaxLon >= bMinLon && aMinLat <= bMaxLat && aMaxLat >= bMinLat;
}

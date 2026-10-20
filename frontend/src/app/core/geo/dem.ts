/**
 * backlog/150 — DEM-rács (build asset) mintavétele. A rács egyenletes lat/lon lépésű, sorfolytonosan
 * tárolt `int16` méter-értékekkel. A `noData` érték (és a rácson kívüli pontok) `null`-t adnak —
 * soha nem 0, hogy a hiányzó magasság ne lássék valódi 0 m-nek (Backend-offline first §14).
 *
 * backlog/217 — a rács a szélső cellaközéppontokon túl még egy fél cellát lefed (a szélső értékkel):
 * a szomszédos csempék szélső középpontjai között egy cellányi sáv van, ami különben egyik csempéből
 * sem kapna magasságot ({@link demTileContains} ugyanezt a tartományt fogadja el).
 */
export interface DemGrid {
	originLon: number;
	originLat: number;
	stepLon: number;
	stepLat: number;
	cols: number;
	rows: number;
	values: ArrayLike<number>;
	noData: number;
}

export function sampleElevation(grid: DemGrid, lon: number, lat: number): number | null {
	const rawX = (lon - grid.originLon) / grid.stepLon;
	const rawY = (grid.originLat - lat) / grid.stepLat;
	if (rawX < -0.5 || rawY < -0.5 || rawX > grid.cols - 0.5 || rawY > grid.rows - 0.5) {
		return null;
	}
	const x = Math.min(Math.max(rawX, 0), grid.cols - 1);
	const y = Math.min(Math.max(rawY, 0), grid.rows - 1);
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const x1 = Math.min(x0 + 1, grid.cols - 1);
	const y1 = Math.min(y0 + 1, grid.rows - 1);
	const fx = x - x0;
	const fy = y - y0;
	const v00 = grid.values[y0 * grid.cols + x0];
	const v10 = grid.values[y0 * grid.cols + x1];
	const v01 = grid.values[y1 * grid.cols + x0];
	const v11 = grid.values[y1 * grid.cols + x1];
	if (v00 === grid.noData || v10 === grid.noData || v01 === grid.noData || v11 === grid.noData) {
		return null;
	}
	const top = v00 + (v10 - v00) * fx;
	const bottom = v01 + (v11 - v01) * fx;
	return top + (bottom - top) * fy;
}

/**
 * A csempe cellaközpontjainak tartománya (a szélső félcella nélkül a mintavétel nem értelmezett).
 * backlog/217 — a katalógus-import (scripts/import-curated-routes.mjs) is ezt használja.
 */
export function demTileContains(
	tile: Pick<DemGrid, 'originLon' | 'originLat' | 'stepLon' | 'stepLat' | 'cols' | 'rows'>,
	lon: number,
	lat: number,
): boolean {
	const minLon = tile.originLon - tile.stepLon / 2;
	const maxLon = tile.originLon + (tile.cols - 0.5) * tile.stepLon;
	const maxLat = tile.originLat + tile.stepLat / 2;
	const minLat = tile.originLat - (tile.rows - 0.5) * tile.stepLat;
	return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

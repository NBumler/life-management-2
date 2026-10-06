/**
 * backlog/150 — DEM-rács (build asset) mintavétele. A rács egyenletes lat/lon lépésű, sorfolytonosan
 * tárolt `int16` méter-értékekkel. A `noData` érték (és a rácson kívüli pontok) `null`-t adnak —
 * soha nem 0, hogy a hiányzó magasság ne lássék valódi 0 m-nek (Backend-offline first §14).
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
	const x = (lon - grid.originLon) / grid.stepLon;
	const y = (grid.originLat - lat) / grid.stepLat;
	if (x < 0 || y < 0 || x > grid.cols - 1 || y > grid.rows - 1) {
		return null;
	}
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

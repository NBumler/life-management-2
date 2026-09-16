import {
	OFFLINE_TILE_MAX_ZOOM,
	OFFLINE_TILE_MIN_ZOOM,
	bboxIntersects,
	offlineZoomLevels,
	tileKey,
	tilesInBbox,
	tilesInBboxAtZoom,
} from './offline-region.model';

describe('offline-region.model', () => {
	describe('offlineZoomLevels', () => {
		it('spans the configured min..max zoom range inclusive', () => {
			expect(offlineZoomLevels()).toEqual(
				Array.from({ length: OFFLINE_TILE_MAX_ZOOM - OFFLINE_TILE_MIN_ZOOM + 1 }, (_, i) => OFFLINE_TILE_MIN_ZOOM + i),
			);
		});
	});

	describe('tilesInBboxAtZoom', () => {
		it('returns a single tile for a point-sized bbox', () => {
			const tiles = tilesInBboxAtZoom([19.05, 47.5, 19.05, 47.5], 12);
			expect(tiles.length).toBe(1);
			expect(tiles[0].z).toBe(12);
		});

		it('returns a grid covering a larger bbox (more tiles at higher zoom)', () => {
			const bbox: [number, number, number, number] = [19.0, 47.4, 19.2, 47.6];
			const low = tilesInBboxAtZoom(bbox, 10);
			const high = tilesInBboxAtZoom(bbox, 14);
			expect(high.length).toBeGreaterThan(low.length);
		});
	});

	describe('tilesInBbox', () => {
		it('sums tiles across every configured zoom level', () => {
			const bbox: [number, number, number, number] = [19.0, 47.4, 19.2, 47.6];
			const total = tilesInBbox(bbox).length;
			const expected = offlineZoomLevels().reduce((sum, z) => sum + tilesInBboxAtZoom(bbox, z).length, 0);
			expect(total).toBe(expected);
		});
	});

	describe('tileKey', () => {
		it('produces distinct keys for distinct tiles and equal keys for equal tiles', () => {
			expect(tileKey({ z: 12, x: 1, y: 2 })).toBe(tileKey({ z: 12, x: 1, y: 2 }));
			expect(tileKey({ z: 12, x: 1, y: 2 })).not.toBe(tileKey({ z: 12, x: 2, y: 1 }));
		});
	});

	describe('bboxIntersects', () => {
		it('detects overlapping bboxes', () => {
			expect(bboxIntersects([19.0, 47.0, 19.2, 47.2], [19.1, 47.1, 19.3, 47.3])).toBeTrue();
		});

		it('detects disjoint bboxes', () => {
			expect(bboxIntersects([19.0, 47.0, 19.2, 47.2], [20.0, 48.0, 20.2, 48.2])).toBeFalse();
		});
	});
});

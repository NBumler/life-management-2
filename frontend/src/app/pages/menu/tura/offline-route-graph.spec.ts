import { TrailSegment } from '../../../api/model/trailSegment';
import { suggestRouteOffline } from './offline-route-graph';

function segment(coordinates: number[][]): TrailSegment {
	return { id: 's', countryCode: 'HU', symbol: 'PIROS_SAV', coordinates };
}

describe('suggestRouteOffline', () => {
	it('finds a direct path along a single segment', () => {
		const result = suggestRouteOffline(
			[segment([[19.0, 47.0], [19.1, 47.0]])],
			[19.0, 47.0],
			[19.1, 47.0],
		);

		expect(result.found).toBeTrue();
		expect(result.coordinates[0]).toEqual([19.0, 47.0]);
		expect(result.coordinates[result.coordinates.length - 1]).toEqual([19.1, 47.0]);
		expect(result.distanceMeters).toBeGreaterThan(0);
	});

	it('finds a path across two connected segments (shared endpoint)', () => {
		const result = suggestRouteOffline(
			[segment([[19.0, 47.0], [19.1, 47.0]]), segment([[19.1, 47.0], [19.1, 47.1]])],
			[19.0, 47.0],
			[19.1, 47.1],
		);

		expect(result.found).toBeTrue();
		expect(result.coordinates.length).toBeGreaterThanOrEqual(3);
	});

	it('snaps a click near (but not exactly on) an edge onto the trail', () => {
		const result = suggestRouteOffline(
			[segment([[19.0, 47.0], [19.1, 47.0]])],
			[19.05, 47.0001],
			[19.1, 47.0],
		);

		expect(result.found).toBeTrue();
	});

	it('reports not found when there is no connecting trail data', () => {
		const result = suggestRouteOffline([], [19.0, 47.0], [19.1, 47.0]);

		expect(result).toEqual({ found: false, coordinates: [], distanceMeters: 0 });
	});

	it('reports not found when the requested points are too far from any known trail', () => {
		const result = suggestRouteOffline(
			[segment([[19.0, 47.0], [19.1, 47.0]])],
			[10.0, 40.0],
			[19.1, 47.0],
		);

		expect(result.found).toBeFalse();
	});

	it('reports not found when the two points are on disconnected segments', () => {
		const result = suggestRouteOffline(
			[segment([[19.0, 47.0], [19.1, 47.0]]), segment([[25.0, 47.0], [25.1, 47.0]])],
			[19.0, 47.0],
			[25.1, 47.0],
		);

		expect(result.found).toBeFalse();
	});
});

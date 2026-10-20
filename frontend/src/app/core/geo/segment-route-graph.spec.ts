import { TrailSegment } from '../../api/model/trailSegment';
import {
	MIN_ROUTE_GRAPH_MARGIN_METERS,
	ROUTE_GRAPH_MARGIN_FACTOR,
	isNearLoadedTrail,
	routeGraphBbox,
	suggestRouteOffline,
	trailSegmentBbox,
} from './segment-route-graph';

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

	// backlog/181
	it('leaves segments far from both points out of the graph', () => {
		// A → 55 km észak → kelet → vissza B-be: a középső szakasz egészen kívül esik a környezeten,
		// ezért a lánc megszakad, pedig a teljes halmazban A és B össze van kötve.
		const detour = [
			segment([[19.0, 47.0], [19.0, 47.5]]),
			segment([[19.0, 47.5], [19.01, 47.5]]),
			segment([[19.01, 47.5], [19.01, 47.0]]),
		];
		expect(suggestRouteOffline(detour, [19.0, 47.0], [19.01, 47.0]).found).toBeFalse();

		const near = segment([[19.0, 47.0], [19.01, 47.0]]);
		expect(suggestRouteOffline([...detour, near], [19.0, 47.0], [19.01, 47.0]).found).toBeTrue();
	});

	it('routeGraphBbox: at least MIN_ROUTE_GRAPH_MARGIN_METERS around close points, proportional for distant ones', () => {
		const close = routeGraphBbox([19.0, 47.0], [19.0, 47.001]);
		expect(close[1]).toBeCloseTo(47.0 - MIN_ROUTE_GRAPH_MARGIN_METERS / 111_195, 3);

		const distant = routeGraphBbox([19.0, 47.0], [19.0, 47.5]);
		const directMeters = 0.5 * 111_195;
		expect(distant[3]).toBeCloseTo(47.5 + (directMeters * ROUTE_GRAPH_MARGIN_FACTOR) / 111_195, 3);
	});

	it('trailSegmentBbox: caches per segment object', () => {
		const s = segment([[19.2, 47.1], [19.0, 47.3]]);
		expect(trailSegmentBbox(s)).toEqual([19.0, 47.1, 19.2, 47.3]);
		expect(trailSegmentBbox(s)).toBe(trailSegmentBbox(s));
	});
});

describe('isNearLoadedTrail (backlog/221)', () => {
	const segment: TrailSegment = {
		id: 'n1',
		countryCode: 'HU',
		symbol: 'KEK_SAV',
		coordinates: [
			[19.0, 47.0],
			[19.1, 47.0],
		],
	};

	it('is true within the hike snap distance (2 km) of a loaded segment', () => {
		expect(isNearLoadedTrail([segment], [19.05, 47.015])).toBeTrue();
	});

	it('is false farther away, or with nothing loaded', () => {
		expect(isNearLoadedTrail([segment], [19.05, 47.03])).toBeFalse();
		expect(isNearLoadedTrail([], [19.05, 47.0])).toBeFalse();
	});
});

import { HikeRoute } from '../../../api/model/hikeRoute';
import { draftRouteToFeatureCollection, draftWaypointsToFeatureCollection, hikeRoutesToFeatureCollection } from './hike-routes-geojson';

function route(overrides: Partial<HikeRoute> = {}): HikeRoute {
	return {
		id: 'r1',
		name: 'Kilátó túra',
		coordinates: [
			[19.0, 47.0],
			[19.1, 47.1],
		],
		deleted: false,
		...overrides,
	};
}

describe('hikeRoutesToFeatureCollection', () => {
	it('returns an empty FeatureCollection for an empty route list', () => {
		expect(hikeRoutesToFeatureCollection([])).toEqual({ type: 'FeatureCollection', features: [] });
	});

	it('maps each route to a LineString feature carrying its name', () => {
		const result = hikeRoutesToFeatureCollection([route()]);

		expect(result.features).toEqual([
			{
				type: 'Feature',
				id: 'r1',
				geometry: {
					type: 'LineString',
					coordinates: [
						[19.0, 47.0],
						[19.1, 47.1],
					],
				},
				properties: { name: 'Kilátó túra' },
			},
		]);
	});
});

describe('draftRouteToFeatureCollection', () => {
	it('returns no features for fewer than 2 waypoints', () => {
		expect(draftRouteToFeatureCollection([])).toEqual({ type: 'FeatureCollection', features: [] });
		expect(draftRouteToFeatureCollection([[19.0, 47.0]])).toEqual({ type: 'FeatureCollection', features: [] });
	});

	it('returns a single LineString feature for 2+ waypoints', () => {
		const result = draftRouteToFeatureCollection([
			[19.0, 47.0],
			[19.1, 47.1],
		]);

		expect(result.features).toEqual([
			{
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[19.0, 47.0],
						[19.1, 47.1],
					],
				},
				properties: {},
			},
		]);
	});
});

describe('draftWaypointsToFeatureCollection', () => {
	it('returns one Point feature per waypoint', () => {
		const result = draftWaypointsToFeatureCollection([
			[19.0, 47.0],
			[19.1, 47.1],
		]);

		expect(result.features).toEqual([
			{ type: 'Feature', geometry: { type: 'Point', coordinates: [19.0, 47.0] }, properties: {} },
			{ type: 'Feature', geometry: { type: 'Point', coordinates: [19.1, 47.1] }, properties: {} },
		]);
	});
});

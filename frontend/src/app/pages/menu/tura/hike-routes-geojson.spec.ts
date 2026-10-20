import { HikeRoute } from '../../../api/model/hikeRoute';
import {
	dayBreakIndexes,
	draftRouteToFeatureCollection,
	draftWaypointsToFeatureCollection,
	hikeRouteMarkersToFeatureCollection,
	hikeRoutesToFeatureCollection,
	routeMarkersToFeatureCollection,
} from './hike-routes-geojson';
import { ICON_END, ICON_START, ICON_WAYPOINT, dayIconName, labelIconName } from './map-icons';

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
				properties: { routeId: 'r1', name: 'Kilátó túra', label: labelIconName('Kilátó túra') },
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

describe('route markers (backlog/203)', () => {
	const line = [
		[19.0, 47.0],
		[19.1, 47.1],
		[19.2, 47.2],
		[19.3, 47.3],
		[19.4, 47.4],
	];
	const icons = (collection: GeoJSON.FeatureCollection<GeoJSON.Point>) => collection.features.map((feature) => feature.properties?.['icon']);

	it('start, end, day breaks and the other picked waypoints get distinct icons', () => {
		const result = routeMarkersToFeatureCollection(line, { dayEndIndexes: [2], waypointIndexes: [0, 1, 2, 3, 4] });

		expect(icons(result)).toEqual([ICON_START, ICON_WAYPOINT, dayIconName(1), ICON_WAYPOINT, ICON_END]);
		expect(result.features[2].geometry.coordinates).toEqual([19.2, 47.2]);
	});

	it('no markers for an empty line, only a start for a single point', () => {
		expect(routeMarkersToFeatureCollection([]).features).toEqual([]);
		expect(icons(routeMarkersToFeatureCollection([[19, 47]]))).toEqual([ICON_START]);
	});

	it('saved routes: start, end and every day end but the last', () => {
		const days = [{ endWaypointIndex: 1 }, { endWaypointIndex: 3 }, { endWaypointIndex: 4 }];
		expect(dayBreakIndexes(days)).toEqual([1, 3]);
		expect(dayBreakIndexes(null)).toEqual([]);

		const result = hikeRouteMarkersToFeatureCollection([route({ coordinates: line, days })]);

		expect(icons(result)).toEqual([ICON_START, dayIconName(1), dayIconName(2), ICON_END]);
	});
});

import { HikeRoute } from '../../../api/model/hikeRoute';

/**
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis. Pure conversions, kept separate from TuraPage so
 * they are unit-testable without a MapLibre instance (mirrors trail-segments-geojson.ts).
 */
export function hikeRoutesToFeatureCollection(routes: readonly HikeRoute[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
	return {
		type: 'FeatureCollection',
		features: routes.map((route) => ({
			type: 'Feature',
			id: route.id,
			geometry: { type: 'LineString', coordinates: route.coordinates },
			properties: { name: route.name },
		})),
	};
}

/** The in-progress manually-drawn draft — 0 features until at least 2 waypoints are picked. */
export function draftRouteToFeatureCollection(coordinates: readonly number[][]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
	if (coordinates.length < 2) {
		return { type: 'FeatureCollection', features: [] };
	}
	return {
		type: 'FeatureCollection',
		features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [...coordinates] }, properties: {} }],
	};
}

/** One point feature per draft waypoint, so the user sees exactly where each click landed. */
export function draftWaypointsToFeatureCollection(coordinates: readonly number[][]): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return {
		type: 'FeatureCollection',
		features: coordinates.map((coordinate) => ({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: coordinate },
			properties: {},
		})),
	};
}

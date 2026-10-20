import { HikeRoute } from '../../../api/model/hikeRoute';
import { HikeRouteDay } from '../../../api/model/hikeRouteDay';
import { ICON_END, ICON_START, ICON_WAYPOINT, dayIconName, labelIconName } from './map-icons';

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
			// backlog/202 — a név a vonal mentén, canvasra rajzolt képként (map-icons.ts). backlog/201 — a
			// `routeId` property-ként is megvan: a MapLibre a nem szám feature-id-t eldobja, a koppintás ebből tudja, melyik útvonal.
			properties: { routeId: route.id, name: route.name, label: labelIconName(route.name) },
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

/**
 * backlog/203 — egy útvonal pont-jelölői: zöld indulás, sakktáblás cél, a napváltóknál hold + a nap
 * sorszáma, a többi kijelölt pontnál kis kör. `sortKey`: a fontosabb jelölő kerül felülre.
 */
export function routeMarkersToFeatureCollection(
	coordinates: readonly number[][],
	{ dayEndIndexes = [], waypointIndexes = [] }: { dayEndIndexes?: readonly number[]; waypointIndexes?: readonly number[] } = {},
): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return { type: 'FeatureCollection', features: routeMarkerFeatures(coordinates, dayEndIndexes, waypointIndexes) };
}

/** Az összes mentett útvonal indulás / cél / napváltó jelölője egy rétegben. */
export function hikeRouteMarkersToFeatureCollection(routes: readonly HikeRoute[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return {
		type: 'FeatureCollection',
		features: ([] as GeoJSON.Feature<GeoJSON.Point>[]).concat(...routes.map((route) => routeMarkerFeatures(route.coordinates, dayBreakIndexes(route.days), []))),
	};
}

/** A napváltók: minden nap vége, kivéve az utolsót (az a cél). */
export function dayBreakIndexes(days: readonly Pick<HikeRouteDay, 'endWaypointIndex'>[] | null | undefined): number[] {
	return (days ?? []).slice(0, -1).map((day) => day.endWaypointIndex);
}

function routeMarkerFeatures(coordinates: readonly number[][], dayEndIndexes: readonly number[], waypointIndexes: readonly number[]): GeoJSON.Feature<GeoJSON.Point>[] {
	if (coordinates.length === 0) {
		return [];
	}
	const last = coordinates.length - 1;
	const icons = new Map<number, { icon: string; sortKey: number }>();
	for (const index of waypointIndexes) {
		if (index > 0 && index < last) {
			icons.set(index, { icon: ICON_WAYPOINT, sortKey: 0 });
		}
	}
	dayEndIndexes.forEach((index, i) => {
		if (index > 0 && index < last) {
			icons.set(index, { icon: dayIconName(i + 1), sortKey: 1 });
		}
	});
	if (last > 0) {
		icons.set(last, { icon: ICON_END, sortKey: 2 });
	}
	icons.set(0, { icon: ICON_START, sortKey: 3 });
	return [...icons.entries()]
		.sort(([a], [b]) => a - b)
		.map(([index, properties]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [...coordinates[index]] }, properties }));
}

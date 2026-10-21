import maplibregl from 'maplibre-gl';

import { ROUTE_CASING_COLOR, ROUTE_COLOR, TRACK_CASING_COLOR, TRACK_COLOR } from './map-icons';

const PLAN_SOURCE_ID = 'hike-navigation-plan';
const PLAN_CASING_LAYER_ID = 'hike-navigation-plan-casing-layer';
const PLAN_LAYER_ID = 'hike-navigation-plan-layer';
const TRACK_SOURCE_ID = 'hike-navigation-track';
const TRACK_CASING_LAYER_ID = 'hike-navigation-track-casing-layer';
const TRACK_LAYER_ID = 'hike-navigation-track-layer';
const LINE_LAYOUT: maplibregl.LineLayerSpecification['layout'] = { 'line-join': 'round', 'line-cap': 'round' };

/**
 * backlog/106 — navigáció közben a tervezett útvonal (akkor is, ha a „Saját útvonalak” réteg ki van
 * kapcsolva, vagy az útvonalat közben törölték) és a felvett nyomvonal. A saját helyzet a meglévő kék
 * pont (my-location-control.ts), ezért ezek a rétegek az előtt kerülnek fel.
 */
export function addHikeNavigationLayers(map: maplibregl.Map): void {
	map.addSource(PLAN_SOURCE_ID, { type: 'geojson', data: linesFeatureCollection([]) });
	map.addLayer({ id: PLAN_CASING_LAYER_ID, type: 'line', source: PLAN_SOURCE_ID, layout: LINE_LAYOUT, paint: { 'line-color': ROUTE_CASING_COLOR, 'line-width': 9 } });
	map.addLayer({ id: PLAN_LAYER_ID, type: 'line', source: PLAN_SOURCE_ID, layout: LINE_LAYOUT, paint: { 'line-color': ROUTE_COLOR, 'line-width': 6, 'line-opacity': 0.7 } });
	map.addSource(TRACK_SOURCE_ID, { type: 'geojson', data: linesFeatureCollection([]) });
	map.addLayer({ id: TRACK_CASING_LAYER_ID, type: 'line', source: TRACK_SOURCE_ID, layout: LINE_LAYOUT, paint: { 'line-color': TRACK_CASING_COLOR, 'line-width': 6 } });
	map.addLayer({ id: TRACK_LAYER_ID, type: 'line', source: TRACK_SOURCE_ID, layout: LINE_LAYOUT, paint: { 'line-color': TRACK_COLOR, 'line-width': 3.5 } });
}

export function showHikeNavigation(map: maplibregl.Map, plan: number[][] | null, track: number[][][]): void {
	(map.getSource(PLAN_SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData(linesFeatureCollection(plan === null ? [] : [plan]));
	(map.getSource(TRACK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData(linesFeatureCollection(track));
}

export function linesFeatureCollection(lines: readonly number[][][]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
	return {
		type: 'FeatureCollection',
		features: lines
			.filter((line) => line.length >= 2)
			.map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })),
	};
}

import { TrailSegment } from '../../../api/model/trailSegment';

/**
 * Pure conversion, kept separate from TuraPage so it is unit-testable without a MapLibre instance.
 * `color` is baked into each feature's properties (not computed via a MapLibre style expression)
 * because the symbol→color mapping lives in plain TypeScript, not a `match` expression.
 */
export function trailSegmentsToFeatureCollection(
	segments: readonly TrailSegment[],
	colorFor: (symbol: string) => string,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
	return {
		type: 'FeatureCollection',
		features: segments.map((segment) => ({
			type: 'Feature',
			id: segment.id,
			geometry: { type: 'LineString', coordinates: segment.coordinates },
			properties: { symbol: segment.symbol, color: colorFor(segment.symbol) },
		})),
	};
}

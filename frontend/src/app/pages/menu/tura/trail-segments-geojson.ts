import { TrailSegment } from '../../../api/model/trailSegment';
import { trailSegmentCasingColor, trailSegmentMarkingColorName, trailSegmentSymbolColor } from './trail-segment-symbol-color';

/**
 * Pure conversion, kept separate from TuraPage so it is unit-testable without a MapLibre instance.
 * `color` / `casing` are baked into each feature's properties (not computed via a MapLibre style
 * expression) because the symbol→color mapping lives in plain TypeScript, not a `match` expression.
 * backlog/199: `marked` splits the jelzett utak (full style) from the jelzés nélküli utak (thin, faint,
 * separately switchable layer).
 */
export function trailSegmentsToFeatureCollection(segments: readonly TrailSegment[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
	return {
		type: 'FeatureCollection',
		features: segments.map((segment) => ({
			type: 'Feature',
			id: segment.id,
			geometry: { type: 'LineString', coordinates: segment.coordinates },
			properties: {
				symbol: segment.symbol,
				color: trailSegmentSymbolColor(segment.symbol),
				casing: trailSegmentCasingColor(segment.symbol),
				marked: trailSegmentMarkingColorName(segment.symbol) !== null,
			},
		})),
	};
}

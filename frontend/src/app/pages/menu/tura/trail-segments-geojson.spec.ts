import { TrailSegment } from '../../../api/model/trailSegment';
import { trailSegmentsToFeatureCollection } from './trail-segments-geojson';

function segment(overrides: Partial<TrailSegment> = {}): TrailSegment {
	return {
		id: 's1',
		countryCode: 'HU',
		symbol: 'PIROS_SAV',
		coordinates: [
			[19.0, 47.0],
			[19.1, 47.1],
		],
		...overrides,
	};
}

describe('trailSegmentsToFeatureCollection', () => {
	it('returns an empty FeatureCollection for an empty segment list', () => {
		expect(trailSegmentsToFeatureCollection([])).toEqual({ type: 'FeatureCollection', features: [] });
	});

	it('maps each segment to a LineString feature carrying its symbol and style', () => {
		const result = trailSegmentsToFeatureCollection([segment()]);

		expect(result.features).toEqual([
			{
				type: 'Feature',
				id: 's1',
				geometry: {
					type: 'LineString',
					coordinates: [
						[19.0, 47.0],
						[19.1, 47.1],
					],
				},
				properties: { symbol: 'PIROS_SAV', routeName: null, color: '#d32f2f', casing: '#ffffff', marked: true },
			},
		]);
	});

	it('an EGYEB segment is unmarked (backlog/199)', () => {
		const [feature] = trailSegmentsToFeatureCollection([segment({ symbol: 'EGYEB' })]).features;

		expect(feature.properties).toEqual(jasmine.objectContaining({ color: '#757575', marked: false }));
	});
});

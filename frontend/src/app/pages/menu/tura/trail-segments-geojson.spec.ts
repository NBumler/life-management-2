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
		const result = trailSegmentsToFeatureCollection([], () => '#000');

		expect(result).toEqual({ type: 'FeatureCollection', features: [] });
	});

	it('maps each segment to a LineString feature carrying its symbol and resolved color', () => {
		const colorFor = jasmine.createSpy('colorFor').and.returnValue('#d32f2f');

		const result = trailSegmentsToFeatureCollection([segment()], colorFor);

		expect(colorFor).toHaveBeenCalledWith('PIROS_SAV');
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
				properties: { symbol: 'PIROS_SAV', color: '#d32f2f' },
			},
		]);
	});
});

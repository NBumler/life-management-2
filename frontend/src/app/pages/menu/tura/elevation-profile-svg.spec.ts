import { elevationProfilePolylinePoints } from './elevation-profile-svg';

describe('elevationProfilePolylinePoints', () => {
	it('returns an empty string for an empty profile', () => {
		expect(elevationProfilePolylinePoints([], 300, 60)).toBe('');
	});

	it('maps distance to x and elevation to an inverted y (higher elevation = smaller y)', () => {
		const points = elevationProfilePolylinePoints(
			[
				{ distanceMeters: 0, elevationMeters: 100 },
				{ distanceMeters: 1000, elevationMeters: 200 },
			],
			300,
			60,
		);

		expect(points).toBe('0.0,60.0 300.0,0.0');
	});

	it('does not divide by zero for a flat/zero-length profile', () => {
		const points = elevationProfilePolylinePoints(
			[
				{ distanceMeters: 0, elevationMeters: 300 },
				{ distanceMeters: 0, elevationMeters: 300 },
			],
			300,
			60,
		);

		expect(points).toBe('0.0,60.0 0.0,60.0');
	});
});

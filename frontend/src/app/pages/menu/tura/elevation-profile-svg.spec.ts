import { distancesAlongRoute, elevationProfileChart, elevationProfilePolylinePoints } from './elevation-profile-svg';

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

describe('elevationProfileChart (backlog/219)', () => {
	const profile = [
		{ distanceMeters: 0, elevationMeters: 230 },
		{ distanceMeters: 5000, elevationMeters: 512 },
		{ distanceMeters: 10000, elevationMeters: 300 },
	];

	it('is null for an empty profile', () => {
		expect(elevationProfileChart([], 300, 60)).toBeNull();
	});

	it('gives the elevation range and the total distance for the axis labels', () => {
		const chart = elevationProfileChart(profile, 300, 60)!;

		expect(chart.minElevationMeters).toBe(230);
		expect(chart.maxElevationMeters).toBe(512);
		expect(chart.totalDistanceMeters).toBe(10000);
		expect(chart.points).toBe(elevationProfilePolylinePoints(profile, 300, 60));
	});

	it('places the day-break markers on the distance scale, clamped to the chart', () => {
		const chart = elevationProfileChart(profile, 300, 60, [2500, 7500, 12000])!;

		expect(chart.markerXs).toEqual([75, 225, 300]);
	});
});

describe('distancesAlongRoute (backlog/219)', () => {
	it('measures each index along the line from the start', () => {
		// ~111 m per 0.001° latitude
		const line = [
			[19, 47],
			[19, 47.001],
			[19, 47.002],
		];

		const [first, second] = distancesAlongRoute(line, [1, 2]);

		expect(first).toBeCloseTo(111.2, 0);
		expect(second).toBeCloseTo(222.4, 0);
	});
});

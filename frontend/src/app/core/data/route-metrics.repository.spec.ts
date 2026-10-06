import { TestBed } from '@angular/core/testing';

import { ElevationService } from '../geo/elevation.service';
import { PROFILE_SAMPLE_COUNT } from '../geo/route-metrics';
import { RouteMetricsRepository } from './route-metrics.repository';

/** backlog/151 — metrics are computed on the device; only the elevation lookup is external. */
describe('RouteMetricsRepository', () => {
	let repository: RouteMetricsRepository;
	let elevation: jasmine.SpyObj<ElevationService>;
	const coordinates = [
		[19.0, 47.0],
		[19.0, 47.01],
	];

	beforeEach(() => {
		elevation = jasmine.createSpyObj('ElevationService', ['fetchElevations']);

		TestBed.configureTestingModule({
			providers: [{ provide: ElevationService, useValue: elevation }],
		});
		repository = TestBed.inject(RouteMetricsRepository);
	});

	it('starts with loading=false', () => {
		expect(repository.loading()).toBeFalse();
	});

	it('compute(): asks elevation for the evenly spaced samples and returns full metrics', async () => {
		elevation.fetchElevations.and.callFake(async (points) => points.map(() => 300));

		const result = await repository.compute(coordinates);

		expect(elevation.fetchElevations).toHaveBeenCalledTimes(1);
		expect(elevation.fetchElevations.calls.mostRecent().args[0].length).toBe(PROFILE_SAMPLE_COUNT);
		expect(result.distanceMeters).toBeCloseTo(1112, -1);
		expect(result.elevationGainMeters).toBe(0);
		expect(result.estimatedDurationMinutes).not.toBeNull();
		expect(result.profile?.length).toBe(PROFILE_SAMPLE_COUNT);
	});

	it('compute(): without internet (elevation lookup fails) still returns the distance, the rest is null', async () => {
		elevation.fetchElevations.and.rejectWith(new Error('offline'));

		const result = await repository.compute(coordinates);

		expect(result.distanceMeters).toBeCloseTo(1112, -1);
		expect(result.elevationGainMeters).toBeNull();
		expect(result.elevationLossMeters).toBeNull();
		expect(result.estimatedDurationMinutes).toBeNull();
		expect(result.profile).toBeNull();
		expect(repository.loading()).toBeFalse();
	});

	it('compute(): toggles loading true then false around the call', async () => {
		elevation.fetchElevations.and.callFake(async (points) => points.map(() => 0));

		const promise = repository.compute(coordinates);
		expect(repository.loading()).toBeTrue();
		await promise;
		expect(repository.loading()).toBeFalse();
	});
});

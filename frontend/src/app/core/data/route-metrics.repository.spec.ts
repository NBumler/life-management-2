import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { TuraService } from '../../api/api/tura.service';
import { RouteMetrics } from '../../api/model/routeMetrics';
import { RouteMetricsRequest } from '../../api/model/routeMetricsRequest';
import { RouteMetricsRepository } from './route-metrics.repository';

/** See trail-segment.repository.spec.ts for why this narrower interface exists (overload typing). */
interface RouteMetricsQuery {
	computeRouteMetrics(request: RouteMetricsRequest): Observable<RouteMetrics>;
}

describe('RouteMetricsRepository', () => {
	let repository: RouteMetricsRepository;
	let turaService: jasmine.SpyObj<RouteMetricsQuery>;

	beforeEach(() => {
		turaService = jasmine.createSpyObj('TuraService', ['computeRouteMetrics']);

		TestBed.configureTestingModule({
			providers: [{ provide: TuraService, useValue: turaService }],
		});
		repository = TestBed.inject(RouteMetricsRepository);
	});

	it('starts with loading=false', () => {
		expect(repository.loading()).toBeFalse();
	});

	it('compute(): calls the API with the given coordinates, and returns the result', async () => {
		const metrics: RouteMetrics = {
			distanceMeters: 1000,
			elevationGainMeters: 50,
			elevationLossMeters: 20,
			estimatedDurationMinutes: 25,
			profile: [{ distanceMeters: 0, elevationMeters: 300 }],
		};
		turaService.computeRouteMetrics.and.returnValue(of(metrics));
		const coordinates = [
			[19.0, 47.0],
			[19.1, 47.1],
		];

		const result = await repository.compute(coordinates);

		expect(turaService.computeRouteMetrics).toHaveBeenCalledWith({ coordinates });
		expect(result).toEqual(metrics);
	});

	it('compute(): toggles loading true then false around the call', async () => {
		turaService.computeRouteMetrics.and.returnValue(
			of({ distanceMeters: 0, elevationGainMeters: 0, elevationLossMeters: 0, estimatedDurationMinutes: 0, profile: [] }),
		);

		const promise = repository.compute([
			[19.0, 47.0],
			[19.1, 47.1],
		]);
		expect(repository.loading()).toBeTrue();
		await promise;
		expect(repository.loading()).toBeFalse();
	});
});

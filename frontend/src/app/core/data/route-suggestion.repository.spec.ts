import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { TuraService } from '../../api/api/tura.service';
import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TrailSegment } from '../../api/model/trailSegment';
import { RouteSuggestionRepository } from './route-suggestion.repository';
import { TrailSegmentRepository } from './trail-segment.repository';

/** See trail-segment.repository.spec.ts for why this narrower interface exists (overload typing). */
interface RouteSuggestionQuery {
	suggestRoute(country: string, startLon: number, startLat: number, endLon: number, endLat: number): Observable<RouteSuggestion>;
}

describe('RouteSuggestionRepository', () => {
	let repository: RouteSuggestionRepository;
	let turaService: jasmine.SpyObj<RouteSuggestionQuery>;
	let trailSegments: { segments: () => TrailSegment[] };

	beforeEach(() => {
		turaService = jasmine.createSpyObj('TuraService', ['suggestRoute']);
		trailSegments = { segments: () => [] };

		TestBed.configureTestingModule({
			providers: [
				{ provide: TuraService, useValue: turaService },
				{ provide: TrailSegmentRepository, useValue: trailSegments },
			],
		});
		repository = TestBed.inject(RouteSuggestionRepository);
	});

	it('starts with loading=false', () => {
		expect(repository.loading()).toBeFalse();
	});

	it('suggest(): calls the API with the given country and points, and returns the result', async () => {
		const suggestion: RouteSuggestion = { found: true, coordinates: [[19.0, 47.0], [19.1, 47.1]], distanceMeters: 123 };
		turaService.suggestRoute.and.returnValue(of(suggestion));

		const result = await repository.suggest('HU', [19.0, 47.0], [19.1, 47.1]);

		expect(turaService.suggestRoute).toHaveBeenCalledWith('HU', 19.0, 47.0, 19.1, 47.1);
		expect(result).toEqual(suggestion);
	});

	it('suggest(): toggles loading true then false around the call', async () => {
		turaService.suggestRoute.and.returnValue(of({ found: false, coordinates: [], distanceMeters: 0 }));

		const promise = repository.suggest('HU', [19.0, 47.0], [19.1, 47.1]);
		expect(repository.loading()).toBeTrue();
		await promise;
		expect(repository.loading()).toBeFalse();
	});

	it('suggest(): falls back to the on-device offline route graph when the network call fails', async () => {
		turaService.suggestRoute.and.returnValue(throwError(() => new Error('network down')));
		trailSegments.segments = () => [
			{
				id: 's1',
				countryCode: 'HU',
				symbol: 'PIROS_SAV',
				coordinates: [
					[19.0, 47.0],
					[19.05, 47.0],
				],
			},
		];

		const result = await repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]);

		expect(result.found).toBeTrue();
		expect(repository.loading()).toBeFalse();
	});

	it('suggest(): offline fallback reports not-found when the loaded segments have no connecting path', async () => {
		turaService.suggestRoute.and.returnValue(throwError(() => new Error('network down')));
		trailSegments.segments = () => [];

		const result = await repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]);

		expect(result).toEqual({ found: false, coordinates: [], distanceMeters: 0 });
	});
});

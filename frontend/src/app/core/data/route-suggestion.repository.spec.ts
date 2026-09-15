import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { TuraService } from '../../api/api/tura.service';
import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { RouteSuggestionRepository } from './route-suggestion.repository';

/** See trail-segment.repository.spec.ts for why this narrower interface exists (overload typing). */
interface RouteSuggestionQuery {
	suggestRoute(country: string, startLon: number, startLat: number, endLon: number, endLat: number): Observable<RouteSuggestion>;
}

describe('RouteSuggestionRepository', () => {
	let repository: RouteSuggestionRepository;
	let turaService: jasmine.SpyObj<RouteSuggestionQuery>;

	beforeEach(() => {
		turaService = jasmine.createSpyObj('TuraService', ['suggestRoute']);

		TestBed.configureTestingModule({
			providers: [{ provide: TuraService, useValue: turaService }],
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
});

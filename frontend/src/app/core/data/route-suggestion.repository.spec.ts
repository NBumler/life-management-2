import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { TuraService } from '../../api/api/tura.service';
import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TrailSegment } from '../../api/model/trailSegment';
import { BACKEND_ROUTE_SUGGESTION_TIMEOUT_MS, RouteSuggestionRepository } from './route-suggestion.repository';
import { RoutingService } from '../geo/routing.service';
import { ConnectionState } from '../sync/connection-state';
import { SyncEngineService } from '../sync/sync-engine.service';
import { TrailSegmentRepository } from './trail-segment.repository';

/** See trail-segment.repository.spec.ts for why this narrower interface exists (overload typing). */
interface RouteSuggestionQuery {
	suggestRoute(country: string, startLon: number, startLat: number, endLon: number, endLat: number): Observable<RouteSuggestion>;
}

describe('RouteSuggestionRepository', () => {
	let repository: RouteSuggestionRepository;
	let turaService: jasmine.SpyObj<RouteSuggestionQuery>;
	let trailSegments: { segments: () => TrailSegment[] };
	let routing: jasmine.SpyObj<RoutingService>;
	const connectionState = signal<ConnectionState>('ONLINE');

	beforeEach(() => {
		turaService = jasmine.createSpyObj('TuraService', ['suggestRoute']);
		trailSegments = { segments: () => [] };
		routing = jasmine.createSpyObj('RoutingService', ['route']);
		routing.route.and.resolveTo(null);
		connectionState.set('ONLINE');

		TestBed.configureTestingModule({
			providers: [
				{ provide: TuraService, useValue: turaService },
				{ provide: TrailSegmentRepository, useValue: trailSegments },
				{ provide: RoutingService, useValue: routing },
				{ provide: SyncEngineService, useValue: { connectionState } },
			],
		});
		repository = TestBed.inject(RouteSuggestionRepository);
	});

	it('starts with loading=false', () => {
		expect(repository.loading()).toBeFalse();
	});

	it('suggest(): with no on-device connection, asks the backend (accelerator) and returns its result', async () => {
		const suggestion: RouteSuggestion = { found: true, coordinates: [[19.0, 47.0], [19.1, 47.1]], distanceMeters: 123 };
		turaService.suggestRoute.and.returnValue(of(suggestion));

		const result = await repository.suggest('HU', [19.0, 47.0], [19.1, 47.1]);

		expect(turaService.suggestRoute).toHaveBeenCalledWith('HU', 19.0, 47.0, 19.1, 47.1);
		expect(result).toEqual(suggestion);
		expect(routing.route).not.toHaveBeenCalled();
	});

	it('suggest(): toggles loading true then false around the call', async () => {
		turaService.suggestRoute.and.returnValue(of({ found: false, coordinates: [], distanceMeters: 0 }));

		const promise = repository.suggest('HU', [19.0, 47.0], [19.1, 47.1]);
		expect(repository.loading()).toBeTrue();
		await promise;
		expect(repository.loading()).toBeFalse();
	});

	it('suggest(): finds the route on-device first, without calling the backend or the package (backlog/151)', async () => {
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
		expect(turaService.suggestRoute).not.toHaveBeenCalled();
		expect(routing.route).not.toHaveBeenCalled();
		expect(repository.loading()).toBeFalse();
	});

	it('suggest(): no on-device path, backend unreachable, package also has nothing → the not-found result', async () => {
		turaService.suggestRoute.and.returnValue(throwError(() => new Error('network down')));
		trailSegments.segments = () => [];

		const result = await repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]);

		expect(result).toEqual({ found: false, coordinates: [], distanceMeters: 0 });
	});

	it('suggest(): falls back to the build-asset turistaút-gráf when neither the viewport nor the backend has a route (backlog/105/151)', async () => {
		// Ez a jegy lényege: soha nem letöltött, backendet soha nem elért eszközön is kap útvonalat.
		turaService.suggestRoute.and.returnValue(throwError(() => new Error('FULL_OFFLINE')));
		trailSegments.segments = () => [];
		routing.route.and.resolveTo([[19.0001, 47.0], [19.04, 47.0], [19.0499, 47.0]]);

		const result = await repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]);

		expect(routing.route).toHaveBeenCalledWith('HIKE', [19.0, 47.0], [19.05, 47.0]);
		expect(result.found).toBeTrue();
		expect(result.coordinates[0]).toEqual([19.0, 47.0]);
		expect(result.coordinates[result.coordinates.length - 1]).toEqual([19.05, 47.0]);
	});

	it('suggest(): also tries the package when the backend answers but finds no route (not only on a network error)', async () => {
		turaService.suggestRoute.and.returnValue(of({ found: false, coordinates: [], distanceMeters: 0 }));
		trailSegments.segments = () => [];
		routing.route.and.resolveTo([[19.0, 47.0], [19.05, 47.0]]);

		const result = await repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]);

		expect(result.found).toBeTrue();
	});

	it('suggest(): never asks the package for a country it does not cover', async () => {
		turaService.suggestRoute.and.returnValue(throwError(() => new Error('network down')));
		trailSegments.segments = () => [];

		await repository.suggest('AT', [16.0, 48.0], [16.1, 48.0]);

		expect(routing.route).not.toHaveBeenCalled();
	});
	for (const state of ['BACKEND_OFFLINE', 'FULL_OFFLINE'] as const) {
		it(`suggest(): skips the backend when the connection is known to be ${state} and goes straight to the package (backlog/151)`, async () => {
			connectionState.set(state);
			routing.route.and.resolveTo([[19.0, 47.0], [19.05, 47.0]]);

			const result = await repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]);

			expect(turaService.suggestRoute).not.toHaveBeenCalled();
			expect(routing.route).toHaveBeenCalledWith('HIKE', [19.0, 47.0], [19.05, 47.0]);
			expect(result.found).toBeTrue();
		});
	}

	it('suggest(): still asks the backend on a cold start (UNKNOWN) — the timeout bounds the wait', async () => {
		connectionState.set('UNKNOWN');
		turaService.suggestRoute.and.returnValue(of({ found: true, coordinates: [[19.0, 47.0], [19.1, 47.1]], distanceMeters: 1 }));

		await repository.suggest('HU', [19.0, 47.0], [19.1, 47.1]);

		expect(turaService.suggestRoute).toHaveBeenCalled();
	});

	it('suggest(): a backend call that never answers gives way to the package after the timeout (backlog/151)', fakeAsync(() => {
		turaService.suggestRoute.and.returnValue(NEVER);
		routing.route.and.resolveTo([[19.0, 47.0], [19.05, 47.0]]);
		let result: RouteSuggestion | undefined;

		void repository.suggest('HU', [19.0, 47.0], [19.05, 47.0]).then((r) => (result = r));
		tick(BACKEND_ROUTE_SUGGESTION_TIMEOUT_MS - 1);
		flushMicrotasks();
		expect(result).toBeUndefined();
		expect(routing.route).not.toHaveBeenCalled();

		tick(1);
		flushMicrotasks();
		expect(routing.route).toHaveBeenCalledWith('HIKE', [19.0, 47.0], [19.05, 47.0]);
		expect(result?.found).toBeTrue();
		expect(repository.loading()).toBeFalse();
	}));
});

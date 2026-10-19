import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { CuratedRoutesService } from '../../api/api/curatedRoutes.service';
import { CuratedRoute } from '../../api/model/curatedRoute';
import { CuratedRouteRepository } from './curated-route.repository';

/** Same narrowing as trail-segment.repository.spec.ts: only the default 'body' overload is used. */
interface CuratedRoutesQuery {
	listCuratedRoutes(difficulty?: string, activityType?: string, minDistanceMeters?: number, maxDistanceMeters?: number): Observable<CuratedRoute[]>;
}

const ROUTE: CuratedRoute = {
	id: 'c1',
	name: 'Teszt',
	difficulty: 'EASY',
	activityType: 'HIKING',
	coordinates: [
		[19.0, 47.0],
		[19.1, 47.1],
	],
	distanceMeters: 1000,
	elevationGainMeters: 10,
	elevationLossMeters: 10,
	estimatedDurationMinutes: 15,
};

describe('CuratedRouteRepository', () => {
	let repository: CuratedRouteRepository;
	let service: jasmine.SpyObj<CuratedRoutesQuery>;

	beforeEach(() => {
		service = jasmine.createSpyObj('CuratedRoutesService', ['listCuratedRoutes']);
		TestBed.configureTestingModule({ providers: [{ provide: CuratedRoutesService, useValue: service }] });
		repository = TestBed.inject(CuratedRouteRepository);
	});

	it('passes the filter to the server and exposes the result', async () => {
		service.listCuratedRoutes.and.returnValue(of([ROUTE]));

		await repository.load({ difficulty: 'EASY', minDistanceMeters: 10000 });

		expect(service.listCuratedRoutes).toHaveBeenCalledWith('EASY', undefined, 10000, undefined);
		expect(repository.routes()).toEqual([ROUTE]);
		expect(repository.loadFailed()).toBeFalse();
	});

	it('a failed load (offline) empties the list and flags it, instead of rejecting (backlog/191)', async () => {
		service.listCuratedRoutes.and.returnValue(of([ROUTE]));
		await repository.load();
		service.listCuratedRoutes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

		await repository.load();

		expect(repository.routes()).toEqual([]);
		expect(repository.loadFailed()).toBeTrue();
	});

	it('the next successful load clears the failure flag', async () => {
		service.listCuratedRoutes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
		await repository.load();
		service.listCuratedRoutes.and.returnValue(of([]));

		await repository.load();

		expect(repository.loadFailed()).toBeFalse();
	});
});

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

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

	it('loading is on while the request runs, off after success or failure (backlog/227)', async () => {
		const response = new Subject<CuratedRoute[]>();
		service.listCuratedRoutes.and.returnValue(response);
		expect(repository.loading()).toBeFalse();

		const done = repository.load();
		expect(repository.loading()).toBeTrue();
		response.next([ROUTE]);
		response.complete();
		await done;
		expect(repository.loading()).toBeFalse();

		service.listCuratedRoutes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
		await repository.load();
		expect(repository.loading()).toBeFalse();
	});

	it('a quick filter change: only the latest request decides the list and the state (backlog/227)', async () => {
		const first = new Subject<CuratedRoute[]>();
		const second = new Subject<CuratedRoute[]>();
		service.listCuratedRoutes.and.returnValues(first, second);
		const firstLoad = repository.load({ difficulty: 'EASY' });
		const secondLoad = repository.load({ difficulty: 'HARD' });

		second.next([]);
		second.complete();
		await secondLoad;
		expect(repository.loading()).toBeFalse();

		first.error(new HttpErrorResponse({ status: 0 }));
		await firstLoad;
		expect(repository.routes()).toEqual([]);
		expect(repository.loadFailed()).toBeFalse();

		const third = new Subject<CuratedRoute[]>();
		const fourth = new Subject<CuratedRoute[]>();
		service.listCuratedRoutes.and.returnValues(third, fourth);
		const thirdLoad = repository.load();
		const fourthLoad = repository.load({ difficulty: 'HARD' });
		third.next([ROUTE]);
		third.complete();
		await thirdLoad;
		expect(repository.routes()).toEqual([]);
		expect(repository.loading()).toBeTrue();
		fourth.next([]);
		fourth.complete();
		await fourthLoad;
		expect(repository.loading()).toBeFalse();
	});
});

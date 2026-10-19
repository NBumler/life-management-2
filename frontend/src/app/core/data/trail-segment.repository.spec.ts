import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { TuraService } from '../../api/api/tura.service';
import { TrailSegment } from '../../api/model/trailSegment';
import { OfflineRegionRepository } from './offline-region.repository';
import { TrailSegmentRepository } from './trail-segment.repository';

/**
 * `TuraService.listTrailSegmentsInBbox` is overloaded on the `observe` param (body/response/events);
 * TypeScript's `ReturnType`-based spy typing only sees the last overload, so a narrower interface
 * (just the default 'body' shape this repository actually uses) keeps the spy's `.and.returnValue`
 * calls simply typed.
 */
interface TrailSegmentsQuery {
	listTrailSegmentsInBbox(country: string, minLon: number, minLat: number, maxLon: number, maxLat: number): Observable<TrailSegment[]>;
}

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

describe('TrailSegmentRepository', () => {
	let repository: TrailSegmentRepository;
	let turaService: jasmine.SpyObj<TrailSegmentsQuery>;
	let offlineRegions: jasmine.SpyObj<Pick<OfflineRegionRepository, 'getCachedSegmentsInBbox'>>;

	beforeEach(() => {
		turaService = jasmine.createSpyObj('TuraService', ['listTrailSegmentsInBbox']);
		offlineRegions = jasmine.createSpyObj('OfflineRegionRepository', ['getCachedSegmentsInBbox']);
		offlineRegions.getCachedSegmentsInBbox.and.returnValue(Promise.resolve([]));

		TestBed.configureTestingModule({
			providers: [
				{ provide: TuraService, useValue: turaService },
				{ provide: OfflineRegionRepository, useValue: offlineRegions },
			],
		});
		repository = TestBed.inject(TrailSegmentRepository);
	});

	it('starts with an empty segment list', () => {
		expect(repository.segments()).toEqual([]);
	});

	it('loadBbox(): calls the API with the given country and bbox, and exposes the result', async () => {
		turaService.listTrailSegmentsInBbox.and.returnValue(of([segment()]));

		await repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);

		expect(turaService.listTrailSegmentsInBbox).toHaveBeenCalledWith('HU', 19.0, 47.0, 19.2, 47.2);
		expect(repository.segments().map((s) => s.id)).toEqual(['s1']);
	});

	it('loadBbox(): merges results across calls, deduping by id', async () => {
		turaService.listTrailSegmentsInBbox.and.returnValue(of([segment({ id: 'a' })]));
		await repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);

		turaService.listTrailSegmentsInBbox.and.returnValue(of([segment({ id: 'a' }), segment({ id: 'b' })]));
		await repository.loadBbox('HU', [19.05, 47.05, 19.25, 47.25]);

		expect(repository.segments().map((s) => s.id).sort()).toEqual(['a', 'b']);
	});

	// backlog/180
	it('loadBbox(): evicts cached segments outside the new bbox plus its retain margin', async () => {
		turaService.listTrailSegmentsInBbox.and.returnValue(of([segment({ id: 'old' })]));
		await repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);

		const far = segment({ id: 'far', coordinates: [[21.0, 47.0], [21.1, 47.1]] });
		turaService.listTrailSegmentsInBbox.and.returnValue(of([far]));
		await repository.loadBbox('HU', [21.0, 47.0, 21.2, 47.2]);

		expect(repository.segments().map((s) => s.id)).toEqual(['far']);
	});

	it('loadBbox(): keeps cached segments within the retain margin of the new bbox', async () => {
		turaService.listTrailSegmentsInBbox.and.returnValue(of([segment({ id: 'near' })]));
		await repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);

		// a 0,2° széles új bbox margója 0,1° — a 19,0–19,1-es szakasz még belelóg
		turaService.listTrailSegmentsInBbox.and.returnValue(of([]));
		await repository.loadBbox('HU', [19.18, 47.0, 19.38, 47.2]);

		expect(repository.segments().map((s) => s.id)).toEqual(['near']);
	});

	it('loadBbox(): drops a response that arrives after a newer call started', async () => {
		const slow = new Subject<TrailSegment[]>();
		turaService.listTrailSegmentsInBbox.and.returnValues(slow, of([segment({ id: 'new' })]));

		const first = repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);
		await repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);
		slow.next([segment({ id: 'stale' })]);
		slow.complete();
		await first;

		expect(repository.segments().map((s) => s.id)).toEqual(['new']);
	});

	it('loadBbox(): a 400 (bbox too large) shows nothing and skips the offline cache', async () => {
		turaService.listTrailSegmentsInBbox.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));

		await repository.loadBbox('HU', [16.0, 45.0, 23.0, 49.0]);

		expect(offlineRegions.getCachedSegmentsInBbox).not.toHaveBeenCalled();
		expect(repository.segments()).toEqual([]);
	});

	it('loadBbox(): falls back to the offline region cache when the network call fails', async () => {
		turaService.listTrailSegmentsInBbox.and.returnValue(throwError(() => new Error('network down')));
		offlineRegions.getCachedSegmentsInBbox.and.returnValue(Promise.resolve([segment({ id: 'cached' })]));

		await repository.loadBbox('HU', [19.0, 47.0, 19.2, 47.2]);

		expect(offlineRegions.getCachedSegmentsInBbox).toHaveBeenCalledWith([19.0, 47.0, 19.2, 47.2]);
		expect(repository.segments().map((s) => s.id)).toEqual(['cached']);
	});
});

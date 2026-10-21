import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { LocationTrackingService, TrackingFix } from '../../../core/geo/location-tracking.service';
import { HikeSosComponent, fixAgeText } from './hike-sos.component';

const FIX: TrackingFix = { lat: 47.678505, lon: 18.878893, timeMs: Date.now(), accuracyMeters: 7.6 };

/** The component's interval clock keeps the zone busy, so `whenStable` never resolves: wait for the action instead. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

function fakeLocation() {
	return {
		tracking: signal(false),
		lastFix: signal<TrackingFix | null>(null),
		locateOnce: jasmine.createSpy('locateOnce').and.resolveTo(FIX),
	};
}

describe('HikeSosComponent (backlog/106)', () => {
	let fixture: ComponentFixture<HikeSosComponent> | undefined;
	let location: ReturnType<typeof fakeLocation>;

	const element = () => fixture!.nativeElement as HTMLElement;
	const text = () => element().textContent ?? '';

	function create(): void {
		TestBed.configureTestingModule({
			imports: [HikeSosComponent],
			providers: [provideTranslateService(), { provide: LocationTrackingService, useValue: location }],
		});
		fixture = TestBed.createComponent(HikeSosComponent);
	}

	beforeEach(() => (location = fakeLocation()));
	afterEach(() => {
		fixture?.destroy();
		fixture = undefined;
	});

	it('without a running GPS session: locates once, then shows both coordinate forms and the accuracy', async () => {
		create();
		fixture!.detectChanges();
		expect(location.locateOnce).toHaveBeenCalledTimes(1);
		await settle();
		fixture!.detectChanges();

		expect(text()).toContain('47.67851, 18.87889');
		expect(text()).toContain('47°40′42.6″ É, 18°52′44.0″ K');
		expect(text()).toContain('TURA.SOS.ACCURACY');
		expect(text()).toContain('TURA.SOS.REFRESH');
	});

	it('during navigation: the session’s latest fix, kept current, no extra locating', () => {
		location.tracking.set(true);
		location.lastFix.set(FIX);
		create();
		fixture!.detectChanges();
		expect(location.locateOnce).not.toHaveBeenCalled();
		expect(text()).toContain('47.67851, 18.87889');
		expect(text()).not.toContain('TURA.SOS.REFRESH');

		location.lastFix.set({ ...FIX, lat: 47.7 });
		fixture!.detectChanges();
		expect(text()).toContain('47.70000, 18.87889');
	});

	it('location refused: explains it, and 112 can still be called', async () => {
		location.locateOnce.and.resolveTo('denied');
		create();
		fixture!.detectChanges();
		await settle();
		fixture!.detectChanges();

		expect(text()).toContain('TURA.MY_LOCATION.DENIED');
		expect(element().querySelector('ion-button.sos-call')?.getAttribute('href')).toBe('tel:112');
	});

	it('the age of the fix: seconds for a minute, then minutes', () => {
		expect(fixAgeText(12_400)).toEqual({ key: 'TURA.SOS.AGE_SECONDS', params: { seconds: 12 } });
		expect(fixAgeText(-500)).toEqual({ key: 'TURA.SOS.AGE_SECONDS', params: { seconds: 0 } });
		expect(fixAgeText(185_000)).toEqual({ key: 'TURA.SOS.AGE_MINUTES', params: { minutes: 3 } });
	});
});

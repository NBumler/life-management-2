import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { HikeRoute } from '../../../api/model/hikeRoute';
import { HikeNavigationDraft, HikeNavigationService, HikeRecordingSummary } from '../../../core/data/hike-navigation.service';
import { NavigationProgress } from '../../../core/geo/route-navigation';
import { RouteTurn } from '../../../core/geo/turn-instructions';
import { HikeNavigationPanelComponent, TURN_ARROW_ROTATION } from './hike-navigation-panel.component';
import { linesFeatureCollection } from './hike-navigation-layers';

const STARTED_AT = Date.UTC(2026, 9, 21, 8, 0);

function draft(overrides: Partial<HikeNavigationDraft> = {}): HikeNavigationDraft {
	return {
		sessionId: 'session-1',
		plan: { routeId: 'route-1', name: 'Pilis kör', coordinates: [], elevationProfile: null, elevationGainMeters: null, turns: [] },
		startedAtMs: STARTED_AT,
		pausedAtMs: null,
		pausedTotalMs: 0,
		segmentStarts: [0],
		endedAtMs: null,
		progress: null,
		...overrides,
	};
}

function progress(overrides: Partial<NavigationProgress> = {}): NavigationProgress {
	return { located: true, progressMeters: 200, offRoute: false, offRouteStreak: 0, announced: [], arrived: false, ...overrides };
}

/** The panel's interval clock keeps the zone busy, so `whenStable` never resolves: wait for the action instead. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

const RIGHT_TURN: RouteTurn = { distanceAlongMeters: 600, point: [19, 47.5], direction: 'RIGHT', angleDegrees: 90 };

/** The panel's view of the session: plain signals the test sets, plus spies for the actions. */
function fakeNavigation() {
	const state = signal<HikeNavigationDraft | null>(draft());
	const next = signal<{ turn: RouteTurn; distanceMeters: number } | null>(null);
	const summary = signal<HikeRecordingSummary | null>(null);
	return {
		state,
		next,
		summaryValue: summary,
		draft: state,
		plan: computed(() => state()?.plan ?? null),
		progress: computed(() => state()?.progress ?? null),
		paused: computed(() => state()?.pausedAtMs != null),
		finished: computed(() => state()?.endedAtMs != null),
		offRoute: computed(() => state()?.progress?.offRoute ?? false),
		arrived: computed(() => state()?.progress?.arrived ?? false),
		nextTurn: next,
		remaining: computed(() => (state()?.plan ? { distanceMeters: 800, elevationGainMeters: 32, durationMinutes: 12 } : null)),
		recordedMeters: signal(200),
		weakSignal: signal(false),
		summary: () => summary(),
		pause: jasmine.createSpy('pause').and.resolveTo(),
		resume: jasmine.createSpy('resume').and.resolveTo(),
		finish: jasmine.createSpy('finish').and.resolveTo(),
		save: jasmine.createSpy('save'),
		clear: jasmine.createSpy('clear').and.resolveTo(),
	};
}

describe('HikeNavigationPanelComponent (backlog/106)', () => {
	let fixture: ComponentFixture<HikeNavigationPanelComponent>;
	let navigation: ReturnType<typeof fakeNavigation>;

	const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
	const button = (label: string) =>
		Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('ion-button')).find((element) => element.textContent?.includes(label)) as HTMLElement;

	beforeEach(() => {
		navigation = fakeNavigation();
		TestBed.configureTestingModule({
			imports: [HikeNavigationPanelComponent],
			providers: [provideTranslateService(), { provide: HikeNavigationService, useValue: navigation }],
		});
		fixture = TestBed.createComponent(HikeNavigationPanelComponent);
		fixture.componentRef.setInput('following', true);
	});

	afterEach(() => fixture.destroy());

	it('shows the next turn with its arrow and distance, and what is left', () => {
		navigation.state.set(draft({ progress: progress() }));
		navigation.next.set({ turn: RIGHT_TURN, distanceMeters: 400 });
		fixture.detectChanges();

		expect(text()).toContain('TURA.NAVIGATION.DIRECTION.RIGHT');
		expect(text()).toContain('TURA.NAVIGATION.TURN_IN');
		expect(text()).toContain('TURA.NAVIGATION.REMAINING');
		const arrow = (fixture.nativeElement as HTMLElement).querySelector('.turn ion-icon') as HTMLElement;
		expect(arrow.style.transform).toBe('rotate(90deg)');
	});

	it('leaving the route replaces the turn with a warning', () => {
		navigation.state.set(draft({ progress: progress({ offRoute: true }) }));
		navigation.next.set({ turn: RIGHT_TURN, distanceMeters: 400 });
		fixture.detectChanges();

		expect(text()).toContain('TURA.NAVIGATION.OFF_ROUTE');
		expect(text()).not.toContain('TURA.NAVIGATION.DIRECTION.RIGHT');
	});

	it('a free recording has no turn and no remaining distance', () => {
		navigation.state.set(draft({ plan: null }));
		fixture.detectChanges();

		expect(text()).toContain('TURA.NAVIGATION.RECORDING_TITLE');
		expect(text()).not.toContain('TURA.NAVIGATION.REMAINING');
	});

	it('pause / resume, and the follow button only once the map was dragged away', async () => {
		fixture.detectChanges();
		expect(text()).not.toContain('TURA.NAVIGATION.RECENTER');
		button('TURA.NAVIGATION.PAUSE').click();
		expect(navigation.pause).toHaveBeenCalled();
		await settle();

		navigation.state.set(draft({ pausedAtMs: STARTED_AT + 60_000 }));
		fixture.componentRef.setInput('following', false);
		fixture.detectChanges();
		button('TURA.NAVIGATION.RESUME').click();
		expect(navigation.resume).toHaveBeenCalled();
		expect(text()).toContain('TURA.NAVIGATION.RECENTER');
	});

	it('after finishing: the planned name with the date, saved under the typed name', async () => {
		const saved = { id: 'session-1', name: 'x', coordinates: [], deleted: false } as HikeRoute;
		navigation.save.and.resolveTo(saved);
		navigation.summaryValue.set({
			sessionId: 'session-1',
			startedAtMs: STARTED_AT,
			plannedName: 'Pilis kör',
			durationMinutes: 75,
			distanceMeters: 4200,
			coordinates: [
				[19, 47.5],
				[19.01, 47.5],
			],
		});
		navigation.state.set(draft({ endedAtMs: STARTED_AT + 75 * 60_000 }));
		const emitted: HikeRoute[] = [];
		fixture.componentInstance.saved.subscribe((route) => emitted.push(route));
		fixture.detectChanges();

		const input = (fixture.nativeElement as HTMLElement).querySelector('ion-input') as HTMLIonInputElement;
		expect(input.value).toMatch(/^Pilis kör – 2026/);

		button('COMMON.SAVE').click();
		await settle();
		expect(navigation.save).toHaveBeenCalledWith(input.value as string);
		expect(emitted).toEqual([saved]);
	});

	it('after finishing with too few points: nothing to save, only close', async () => {
		navigation.summaryValue.set({ sessionId: 's', startedAtMs: STARTED_AT, plannedName: null, durationMinutes: 1, distanceMeters: 0, coordinates: null });
		navigation.state.set(draft({ plan: null, endedAtMs: STARTED_AT + 60_000 }));
		fixture.detectChanges();

		expect(text()).toContain('TURA.NAVIGATION.NOTHING_TO_SAVE');
		button('COMMON.CLOSE').click();
		await settle();
		expect(navigation.clear).toHaveBeenCalled();
	});

	it('the SOS button asks the page for the emergency sheet', () => {
		const opened: void[] = [];
		fixture.componentInstance.sos.subscribe(() => opened.push(undefined));
		fixture.detectChanges();
		button('TURA.SOS.BUTTON').click();
		expect(opened.length).toBe(1);
	});

	it('every turn direction has an arrow rotation', () => {
		expect(Object.keys(TURN_ARROW_ROTATION).length).toBe(7);
		expect(TURN_ARROW_ROTATION.U_TURN).toBe(180);
	});

	it('linesFeatureCollection: a line needs two points', () => {
		expect(linesFeatureCollection([[[19, 47.5]], [[19, 47.5], [19.1, 47.5]]]).features.length).toBe(1);
	});
});

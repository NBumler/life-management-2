import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { BIKE_LIVE_SUMMARY_ROUTE, BikeLiveDraft, BikeLiveSessionService } from '../../../core/data/bike-live-session.service';
import { BikeLivePage } from './bike-live.page';

describe('BikeLivePage (backlog/150)', () => {
  let fixture: ComponentFixture<BikeLivePage>;
  let page: BikeLivePage;
  let draft: WritableSignal<BikeLiveDraft | null>;
  let live: {
    draft: WritableSignal<BikeLiveDraft | null>;
    paused: Signal<boolean>;
    mode: Signal<string | null>;
    distanceMeters: WritableSignal<number>;
    weakSignal: WritableSignal<boolean>;
    refresh: jasmine.Spy;
    pause: jasmine.Spy;
    resume: jasmine.Spy;
    finish: jasmine.Spy;
    clear: jasmine.Spy;
  };
  let navigateBack: jasmine.Spy;
  let navigateForward: jasmine.Spy;
  let alertButtons: { role?: string; handler?: () => void }[];

  let running: BikeLiveDraft;

  beforeEach(() => {
    // started 65 s ago, relative to each test's own clock
    running = { rideId: 'r1', startedAtMs: Date.now() - 65_000, pausedAtMs: null, pausedTotalMs: 0, segmentStarts: [0], endedAtMs: null };
  });

  async function setup(initial: BikeLiveDraft | null): Promise<void> {
    draft = signal<BikeLiveDraft | null>(initial);
    live = {
      draft,
      paused: computed(() => draft()?.pausedAtMs != null),
      mode: computed(() => (draft() ? (draft()!.mode ?? 'LIVE') : null)),
      distanceMeters: signal(12_345),
      weakSignal: signal(false),
      refresh: jasmine.createSpy('refresh').and.callFake(() => Promise.resolve(draft())),
      pause: jasmine.createSpy('pause').and.callFake(() => {
        draft.update((d) => (d ? { ...d, pausedAtMs: Date.now() } : d));
        return Promise.resolve();
      }),
      resume: jasmine.createSpy('resume').and.resolveTo(),
      finish: jasmine.createSpy('finish').and.resolveTo(),
      clear: jasmine.createSpy('clear').and.resolveTo(),
    };
    alertButtons = [];

    await TestBed.configureTestingModule({
      imports: [BikeLivePage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: BikeLiveSessionService, useValue: live },
        {
          provide: AlertController,
          useValue: {
            create: (options: { buttons: { role?: string; handler?: () => void }[] }) => {
              alertButtons = options.buttons;
              return Promise.resolve({ present: () => Promise.resolve() });
            },
          },
        },
      ],
    }).compileComponents();

    const nav = TestBed.inject(NavController);
    navigateBack = spyOn(nav, 'navigateBack').and.resolveTo(true);
    navigateForward = spyOn(nav, 'navigateForward').and.resolveTo(true);

    fixture = TestBed.createComponent(BikeLivePage);
    page = fixture.componentInstance;
    await page.ionViewWillEnter();
    fixture.detectChanges();
  }

  afterEach(() => page?.ngOnDestroy());

  it('shows the active time and the distance recorded so far', async () => {
    await setup(running);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.bike-live__elapsed')?.textContent).toContain('01:0');
    expect(el.querySelector('.bike-live__distance')?.textContent).toContain('12.35');
  });

  it('no ride → back to the list', async () => {
    await setup(null);
    expect(navigateBack).toHaveBeenCalledWith('/tabs/workout/cycling');
  });

  it('a finished ride goes straight to the summary', async () => {
    await setup({ ...running, endedAtMs: Date.now() });
    expect(navigateForward).toHaveBeenCalledWith(BIKE_LIVE_SUMMARY_ROUTE, { replaceUrl: true });
  });

  it('Szünet swaps to Folytatás', async () => {
    await setup(running);
    await page.pause();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(live.pause).toHaveBeenCalled();
    expect(el.querySelector('.bike-live__resume')).not.toBeNull();
    expect(el.querySelector('.bike-live__pause')).toBeNull();
  });

  it('Befejezés finishes the ride and opens the summary', async () => {
    await setup(running);
    await page.finish();
    expect(live.finish).toHaveBeenCalled();
    expect(navigateForward).toHaveBeenCalledWith(BIKE_LIVE_SUMMARY_ROUTE, { replaceUrl: true });
  });

  it('Elvetés asks first; confirming clears the ride and leaves', async () => {
    await setup(running);
    await page.discard();
    expect(live.clear).not.toHaveBeenCalled();

    alertButtons.find((button) => button.role === 'destructive')!.handler!();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(live.clear).toHaveBeenCalled();
    expect(navigateBack).toHaveBeenCalledWith('/tabs/workout/cycling');
  });

  it('Becsült: no distance, the start-point state instead', async () => {
    await setup({ ...running, mode: 'ESTIMATED', startFix: { status: 'fixed', lat: 47.5, lon: 19.05, accuracyMeters: 5 } });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.bike-live__distance')).toBeNull();
    expect(el.querySelector('.bike-live__start-fix')?.textContent).toContain('WORKOUT.BIKE.LIVE.START_FIX_FIXED');
  });
});

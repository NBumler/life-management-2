import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BikeLiveDraft, BikeLiveSessionService, BikeLiveSummary } from '../../../core/data/bike-live-session.service';
import { BikeRideLogRepository, BikeRideLogSaveInput } from '../../../core/data/bike-ride-log.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { localStart, startedAtFromLocal } from '../../../shared/workout/bike-metrics';
import { BikeRideLogEditPage } from './bike-ride-log-edit.page';

describe('BikeRideLogEditPage', () => {
  let fixture: ComponentFixture<BikeRideLogEditPage>;
  let component: BikeRideLogEditPage;
  let saveSpy: jasmine.Spy<(input: BikeRideLogSaveInput) => Promise<BikeRideLog>>;
  let live: jasmine.SpyObj<BikeLiveSessionService>;
  let navigateBack: jasmine.Spy;

  const finishedDraft: BikeLiveDraft = {
    rideId: 'ride-1',
    startedAtMs: 0,
    pausedAtMs: null,
    pausedTotalMs: 0,
    segmentStarts: [0],
    endedAtMs: 1_800_000,
  };
  const summary: BikeLiveSummary = {
    id: 'ride-1',
    date: '2026-10-18',
    startedAt: '2026-10-18T05:15:00.000Z',
    durationMinutes: 30,
    distanceKm: 9.42,
    elevationGainMeters: null,
    trackingMode: BikeRideLog.TrackingModeEnum.Live,
    estimate: null,
    implausible: false,
  };

  async function setup(idParam = 'new', options: { liveSummary?: boolean; items?: BikeRideLog[]; summary?: BikeLiveSummary } = {}): Promise<void> {
    live = jasmine.createSpyObj('BikeLiveSessionService', ['refresh', 'summary', 'clear']);
    live.refresh.and.resolveTo(finishedDraft);
    live.summary.and.resolveTo(options.summary ?? summary);
    live.clear.and.resolveTo();
    saveSpy = jasmine
      .createSpy('save')
      .and.resolveTo({ id: 'b1', date: '2026-08-29', durationMinutes: 60, intensity: BikeRideLog.IntensityEnum.City, deleted: false });

    await TestBed.configureTestingModule({
      imports: [BikeRideLogEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: BikeRideLogRepository,
          useValue: {
            load: () => Promise.resolve(),
            loaded: signal(true),
            items: signal<BikeRideLog[]>(options.items ?? []),
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 80 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }), data: { liveSummary: options.liveSummary === true } } } },
        { provide: BikeLiveSessionService, useValue: live },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    navigateBack = spyOn(TestBed.inject(NavController), 'navigateBack').and.resolveTo(true);

    fixture = TestBed.createComponent(BikeRideLogEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('has no pool-pairing rule — a lone distance keeps the form valid', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 40, distanceKm: 12 });
    expect(component.form.valid).toBe(true);
  });

  it('rejects a negative elevation gain', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 40, elevationGainMeters: -5 });
    expect(component.form.valid).toBe(false);
  });

  it('computes the avg speed and suggests a category when it differs from the pick', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 60, distanceKm: 30, intensity: BikeRideLog.IntensityEnum.City });
    expect(component.avgSpeedKmH()).toBeCloseTo(30, 6);
    expect(component.suggestedIntensityKey()).toBe(`WORKOUT.BIKE.INTENSITY.${BikeRideLog.IntensityEnum.RoadVigorous}`);
  });

  it('hides the suggestion when the pick already matches the speed band', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: 60, distanceKm: 12, intensity: BikeRideLog.IntensityEnum.City });
    expect(component.suggestedIntensityKey()).toBeNull();
  });

  it('save() forwards the form value to the repository', async () => {
    await setup();
    component.form.patchValue({ date: '2026-08-29', durationMinutes: 75, intensity: BikeRideLog.IntensityEnum.RoadLeisure, distanceKm: 24.5 });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ date: '2026-08-29', durationMinutes: 75, intensity: BikeRideLog.IntensityEnum.RoadLeisure, distanceKm: 24.5 }),
    );
  });

  describe('start time (backlog/234)', () => {
    it('a new entry defaults to the current time and saves date + time as startedAt', async () => {
      await setup();
      expect(component.form.controls.startTime.value).toMatch(/^\d{2}:\d{2}$/);
      component.form.patchValue({ date: '2026-10-21', startTime: '17:45', durationMinutes: 30 });
      await component.save();
      expect(saveSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ trackingMode: undefined, startedAt: startedAtFromLocal('2026-10-21', '17:45') }),
      );
    });

    it('an emptied time saves a null startedAt', async () => {
      await setup();
      component.form.patchValue({ startTime: '', durationMinutes: 30 });
      await component.save();
      expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({ startedAt: null }));
    });

    it('an untimed pre-#234 row opens with an empty time and stays untimed', async () => {
      const existing: BikeRideLog = { id: 'b1', date: '2026-10-01', durationMinutes: 40, intensity: BikeRideLog.IntensityEnum.City, deleted: false };
      await setup('b1', { items: [existing] });
      expect(component.form.controls.startTime.value).toBe('');
      await component.save();
      expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'b1', startedAt: null }));
    });

    it('editing the time of a live ride re-derives startedAt from date + time', async () => {
      const existing: BikeRideLog = {
        id: 'ride-1',
        date: '2026-10-18',
        durationMinutes: 30,
        intensity: BikeRideLog.IntensityEnum.City,
        trackingMode: BikeRideLog.TrackingModeEnum.Live,
        startedAt: '2026-10-18T05:15:42.000Z',
        deleted: false,
      };
      await setup('ride-1', { items: [existing] });
      expect(component.form.controls.startTime.value).toBe(localStart('2026-10-18T05:15:42.000Z').time);
      component.form.patchValue({ startTime: '06:00' });
      await component.save();
      expect(saveSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          trackingMode: BikeRideLog.TrackingModeEnum.Live,
          startedAt: startedAtFromLocal('2026-10-18', '06:00'),
        }),
      );
    });
  });

  it('save() does nothing while the required duration is missing', async () => {
    await setup();
    component.form.patchValue({ durationMinutes: null });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  describe('live summary (backlog/150)', () => {
    it('pre-fills the form from the finished ride; a non-computable value stays empty', async () => {
      await setup('new', { liveSummary: true });
      expect(component.form.getRawValue()).toEqual(
        jasmine.objectContaining({ date: '2026-10-18', durationMinutes: 30, distanceKm: 9.42, elevationGainMeters: null }),
      );
      expect(component.summaryLoading()).toBeFalse();
    });

    it('save() stores the ride under its live id with LIVE + startedAt, then clears the draft', async () => {
      await setup('new', { liveSummary: true });
      component.form.patchValue({ distanceKm: 10 });
      await component.save();
      expect(saveSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'ride-1',
          distanceKm: 10,
          trackingMode: BikeRideLog.TrackingModeEnum.Live,
          startedAt: '2026-10-18T05:15:00.000Z',
        }),
      );
      expect(saveSpy).toHaveBeenCalledBefore(live.clear);
    });

    it('leaves when there is no finished ride to summarise', async () => {
      await setup('new', { liveSummary: true });
      live.refresh.and.resolveTo({ ...finishedDraft, endedAtMs: null });
      navigateBack.calls.reset();
      await component.ngOnInit();
      expect(navigateBack).toHaveBeenCalledWith('/tabs/workout/cycling');
    });

    it('editing a saved live ride keeps its trackingMode / startedAt', async () => {
      const existing: BikeRideLog = {
        id: 'ride-1',
        date: '2026-10-18',
        durationMinutes: 30,
        intensity: BikeRideLog.IntensityEnum.City,
        distanceKm: 9.42,
        trackingMode: BikeRideLog.TrackingModeEnum.Live,
        startedAt: '2026-10-18T05:15:00.000Z',
        deleted: false,
      };
      await setup('ride-1', { items: [existing] });
      await component.save();
      expect(saveSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'ride-1', trackingMode: BikeRideLog.TrackingModeEnum.Live, startedAt: '2026-10-18T05:15:00.000Z' }),
      );
      expect(live.clear).not.toHaveBeenCalled();
    });

    it('Becsült: a rough estimate is marked, an implausible one asks for the distance', async () => {
      await setup('new', {
        liveSummary: true,
        summary: { ...summary, trackingMode: BikeRideLog.TrackingModeEnum.Estimated, estimate: 'ROUGH', implausible: true },
      });
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.live-summary__estimate')?.textContent).toContain('WORKOUT.BIKE.LIVE.ESTIMATE_ROUGH');
      expect(el.querySelector('.live-summary__implausible')).not.toBeNull();
      expect(component.form.getRawValue().distanceKm).toBe(9.42); // still pre-filled, overridable
    });

    it('Becsült without an endpoint fix: the "enter it manually" note', async () => {
      await setup('new', {
        liveSummary: true,
        summary: { ...summary, trackingMode: BikeRideLog.TrackingModeEnum.Estimated, distanceKm: null, estimate: null },
      });
      expect(component.liveEstimate()).toBe('NONE');
    });
  });
});

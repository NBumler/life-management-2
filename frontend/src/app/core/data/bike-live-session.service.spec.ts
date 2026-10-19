import { TestBed } from '@angular/core/testing';
import { CallbackError, Location } from '@capgo/background-geolocation';
import { Preferences } from '@capacitor/preferences';
import { provideTranslateService } from '@ngx-translate/core';

import { ElevationService } from '../geo/elevation.service';
import { LocationTrackingGateway } from '../geo/location-tracking.gateway';
import { LocationTrackingService } from '../geo/location-tracking.service';
import { RoutingService } from '../geo/routing.service';
import { RouteMetricsRepository } from './route-metrics.repository';
import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { BikeLiveSessionService, activeElapsedMs, isImplausibleEstimate, trackSegments } from './bike-live-session.service';

type FixCallback = (location?: Location, error?: CallbackError) => void;

/** ~111 m north per step; 30 s apart → ~13 km/h, well inside the plausibility filter. */
function fixAt(step: number, timeMs: number): Location {
  return {
    latitude: 47.5 + step * 0.001,
    longitude: 19.05,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    simulated: false,
    bearing: null,
    speed: null,
    time: timeMs,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('BikeLiveSessionService (backlog/150)', () => {
  let service: BikeLiveSessionService;
  let gps: jasmine.SpyObj<LocationTrackingGateway>;
  let elevation: jasmine.SpyObj<ElevationService>;
  let routing: jasmine.SpyObj<RoutingService>;
  let callback: FixCallback | null;

  function configure(): void {
    callback = null;
    gps = jasmine.createSpyObj('LocationTrackingGateway', ['requestPermissions', 'start', 'stop']);
    gps.requestPermissions.and.resolveTo({ location: 'granted' });
    gps.start.and.callFake((_options, cb) => {
      callback = cb;
      return Promise.resolve();
    });
    gps.stop.and.callFake(() => {
      callback = null;
      return Promise.resolve();
    });
    elevation = jasmine.createSpyObj('ElevationService', ['fetchElevations']);
    // every segment climbs 20 m between its first and last sample
    elevation.fetchElevations.and.callFake((samples) => Promise.resolve(samples.map((_, i) => (i === samples.length - 1 ? 120 : 100))));
    routing = jasmine.createSpyObj('RoutingService', ['route']);
    routing.route.and.resolveTo(null);
    const notifications = jasmine.createSpyObj('LocalNotificationsGateway', ['checkPermissions', 'schedule', 'cancelIds']);

    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        { provide: LocationTrackingGateway, useValue: gps },
        { provide: ElevationService, useValue: elevation },
        { provide: RoutingService, useValue: routing },
        { provide: LocalNotificationsGateway, useValue: notifications },
      ],
    });
    service = TestBed.inject(BikeLiveSessionService);
  }

  async function deliver(step: number, timeMs: number): Promise<void> {
    callback?.(fixAt(step, timeMs));
    await settle();
  }

  beforeEach(async () => {
    await Preferences.clear();
    configure();
  });

  afterEach(async () => {
    await Preferences.clear();
  });

  it('start(): a denied location permission starts nothing', async () => {
    gps.requestPermissions.and.resolveTo({ location: 'denied' });

    expect((await service.start('LIVE', 0)).status).toBe('permission-denied');
    expect(service.draft()).toBeNull();
    expect(gps.start).not.toHaveBeenCalled();
  });

  it('start(): a GPS that fails to start (location services off) leaves no ride behind', async () => {
    gps.start.and.rejectWith(new Error('location disabled'));

    expect((await service.start('LIVE', 0)).status).toBe('permission-denied');
    expect(service.draft()).toBeNull();
    expect((await Preferences.get({ key: 'lm2_bike_live_draft' })).value).toBeNull();
  });

  it('start(): creates the draft and starts the GPS; a second start() returns the running ride', async () => {
    const first = await service.start('LIVE', 1_000);
    expect(first.status).toBe('started');
    expect(gps.start).toHaveBeenCalledTimes(1);

    const second = await service.start('LIVE', 5_000);
    expect(second.status === 'started' && first.status === 'started' && second.draft.rideId === first.draft.rideId).toBeTrue();
    expect(gps.start).toHaveBeenCalledTimes(1);
  });

  it('accumulates the live distance from accepted fixes', async () => {
    await service.start('LIVE', 0);
    await deliver(0, 0);
    await deliver(1, 30_000);
    await deliver(2, 60_000);

    expect(service.distanceMeters()).toBeCloseTo(222, -1);
  });

  it('pause → resume: no collection while paused, the gap is not distance, the pause is not duration', async () => {
    await service.start('LIVE', 0);
    await deliver(0, 0);
    await deliver(1, 30_000);

    await service.pause(60_000);
    expect(service.paused()).toBeTrue();
    expect(gps.stop).toHaveBeenCalled();
    await deliver(5, 90_000); // the plugin is stopped — nothing arrives

    await service.resume(660_000); // a 10-minute pause
    expect(gps.start).toHaveBeenCalledTimes(2);
    await deliver(10, 660_000); // moved ~1 km while paused: a new segment, not a jump
    await deliver(11, 690_000);

    expect(service.distanceMeters()).toBeCloseTo(222, -1);
    await service.finish(720_000);
    expect(activeElapsedMs(service.draft()!, 999_999)).toBe(120_000);
  });

  it('finish() while paused folds the running pause into the paused total', async () => {
    await service.start('LIVE', 0);
    await service.pause(60_000);
    await service.finish(180_000);

    const draft = service.draft()!;
    expect(draft.endedAtMs).toBe(180_000);
    expect(draft.pausedAtMs).toBeNull();
    expect(activeElapsedMs(draft, 999_999)).toBe(60_000);
  });

  it('summary(): pre-fills the form from the recorded track (distance, DEM gain per segment, LIVE)', async () => {
    await service.start('LIVE', new Date(2026, 9, 18, 7, 15).getTime());
    const t0 = service.draft()!.startedAtMs;
    await deliver(0, t0);
    await deliver(1, t0 + 30_000);
    await service.pause(t0 + 60_000);
    await service.resume(t0 + 120_000);
    await deliver(10, t0 + 120_000);
    await deliver(11, t0 + 150_000);
    await service.finish(t0 + 25 * 60_000 + 60_000);

    const summary = (await service.summary())!;
    expect(summary.id).toBe(service.draft()!.rideId);
    expect(summary.date).toBe('2026-10-18');
    expect(summary.durationMinutes).toBe(25);
    expect(summary.distanceKm).toBeCloseTo(0.22, 2);
    expect(summary.elevationGainMeters).toBe(40); // 20 m in each of the two segments
    expect(summary.trackingMode).toBe('LIVE');
  });

  it('summary(): the same line gives the same elevation gain as the hike route metrics (one sampler, backlog/176)', async () => {
    // rolling terrain as a function of the distance along the line
    elevation.fetchElevations.and.callFake((samples) => Promise.resolve(samples.map((sample) => 100 + 8 * Math.sin(sample[2] / 60))));
    await service.start('LIVE', 0);
    for (let step = 0; step <= 8; step++) {
      await deliver(step, step * 30_000);
    }
    await service.finish(10 * 60_000);

    const bikeGain = (await service.summary())!.elevationGainMeters;
    const line = Array.from({ length: 9 }, (_, step) => [19.05, 47.5 + step * 0.001]);
    const hikeGain = (await TestBed.inject(RouteMetricsRepository).compute(line)).elevationGainMeters;
    expect(hikeGain).toBeGreaterThan(0);
    expect(bikeGain).toBe(Math.round(hikeGain!));
  });

  it('summary(): without a usable track the distance / elevation are not computable (null, never 0)', async () => {
    await service.start('LIVE', 0);
    await deliver(0, 0); // a single fix is not a line
    await service.finish(30_000);

    const summary = (await service.summary())!;
    expect(summary.distanceKm).toBeNull();
    expect(summary.elevationGainMeters).toBeNull();
    expect(summary.durationMinutes).toBe(1);
  });

  it('summary(): no elevation source → elevation null, distance still computed', async () => {
    elevation.fetchElevations.and.rejectWith(new Error('offline, outside the DEM'));
    await service.start('LIVE', 0);
    await deliver(0, 0);
    await deliver(1, 30_000);
    await service.finish(60_000);

    const summary = (await service.summary())!;
    expect(summary.distanceKm).not.toBeNull();
    expect(summary.elevationGainMeters).toBeNull();
  });

  it('survives an app restart: the draft and the flushed track come back, the GPS feed resumes', async () => {
    await service.start('LIVE', 0);
    await deliver(0, 0);
    await deliver(1, 30_000);
    await service.pause(60_000);
    await service.resume(60_000); // pause/resume flushes the buffer

    TestBed.resetTestingModule();
    configure();
    const restored = await service.refresh();

    expect(restored).not.toBeNull();
    expect(service.distanceMeters()).toBeCloseTo(111, -1);
    expect(gps.start).toHaveBeenCalledTimes(1);
  });

  it('clear(): stops the GPS and drops the draft and the raw points', async () => {
    await service.start('LIVE', 0);
    await deliver(0, 0);
    await deliver(1, 30_000);

    await service.clear();

    expect(gps.stop).toHaveBeenCalled();
    expect(service.draft()).toBeNull();
    expect(await service.refresh()).toBeNull();
    expect((await Preferences.get({ key: 'lm2_track_buffer_bike' })).value).toBeNull();
  });

  it('trackSegments(): splits the buffer at the segment starts', () => {
    const p = (lat: number) => ({ lat, lon: 19, timeMs: 0, accuracyMeters: 5 });
    expect(trackSegments([p(1), p(2), p(3), p(4)], [0, 2])).toEqual([
      [
        [19, 1],
        [19, 2],
      ],
      [
        [19, 3],
        [19, 4],
      ],
    ]);
  });

  describe('Becsült (ESTIMATED) mode', () => {
    const START = { lat: 47.5, lon: 19.05 };
    const END = { lat: 47.59, lon: 19.05 }; // ~10 km north

    /** acquireFix() itself is covered in location-tracking.service.spec; here it answers on cue. */
    let acquireFix: jasmine.Spy<LocationTrackingService['acquireFix']>;

    beforeEach(() => {
      acquireFix = spyOn(TestBed.inject(LocationTrackingService), 'acquireFix');
    });

    /** Answers the next acquireFix() with one good fix at `point`, or with nothing (`null`). */
    function nextEndpoint(point: { lat: number; lon: number } | null): void {
      acquireFix.and.resolveTo(point === null ? null : { lat: point.lat, lon: point.lon, timeMs: 0, accuracyMeters: 5 });
    }

    /** acquireFix() that only an abort ends (or nothing, after a restart). */
    function neverAnswers(): void {
      acquireFix.and.callFake(
        (_title, _body, _timeout, abort) => new Promise((resolve) => abort?.addEventListener('abort', () => resolve(null))),
      );
    }

    async function ride(durationMs: number, end: { lat: number; lon: number } | null = END): Promise<void> {
      nextEndpoint(START);
      await service.start('ESTIMATED', 0);
      await service.startFixSettled();
      nextEndpoint(end);
      await service.finish(durationMs);
    }

    it('takes a start fix in the background and runs no continuous GPS while riding', async () => {
      nextEndpoint(START);
      const result = await service.start('ESTIMATED', 0);
      expect(result.status).toBe('started');
      expect(service.mode()).toBe('ESTIMATED');
      await service.startFixSettled();

      expect(service.draft()!.startFix).toEqual(jasmine.objectContaining({ status: 'fixed', lat: START.lat, lon: START.lon }));
      await service.pause(60_000);
      await service.resume(120_000);
      expect(acquireFix).toHaveBeenCalledTimes(1);
      expect(gps.start).not.toHaveBeenCalled();
    });

    it('summary(): the bike route between the endpoints → distance + DEM gain along it', async () => {
      routing.route.and.resolveTo([
        [19.05, 47.5],
        [19.06, 47.545],
        [19.05, 47.59],
      ]);
      await ride(40 * 60_000);

      const summary = (await service.summary())!;
      expect(routing.route).toHaveBeenCalledWith('BIKE', [START.lon, START.lat], [END.lon, END.lat]);
      expect(summary.trackingMode).toBe('ESTIMATED');
      expect(summary.estimate).toBe('ROUTED');
      expect(summary.distanceKm).toBeGreaterThan(10);
      expect(summary.elevationGainMeters).toBe(20);
      expect(summary.implausible).toBeFalse();
    });

    it('summary(): no route on the device network → rough straight line × circuity', async () => {
      await ride(40 * 60_000);

      const summary = (await service.summary())!;
      expect(summary.estimate).toBe('ROUGH');
      expect(summary.distanceKm).toBeCloseTo(10.01 * 1.3, 0);
    });

    it('summary(): a routing failure (no geo package) also falls back to the rough estimate', async () => {
      routing.route.and.rejectWith(new Error('no geo package'));
      await ride(40 * 60_000);
      expect((await service.summary())!.estimate).toBe('ROUGH');
    });

    it('summary(): a loop ride (start ≈ end) is flagged implausible', async () => {
      await ride(2 * 60 * 60_000, { lat: START.lat + 0.0005, lon: START.lon });
      const summary = (await service.summary())!;
      expect(summary.distanceKm).not.toBeNull();
      expect(summary.implausible).toBeTrue();
    });

    it('summary(): a missing end fix leaves distance / elevation empty (never 0)', async () => {
      await ride(40 * 60_000, null);
      const summary = (await service.summary())!;
      expect(service.draft()!.endFix).toEqual({ status: 'failed' });
      expect(summary.distanceKm).toBeNull();
      expect(summary.elevationGainMeters).toBeNull();
      expect(summary.estimate).toBeNull();
      expect(summary.implausible).toBeFalse();
    });

    it('after a restart, a start fix that was being acquired counts as failed', async () => {
      neverAnswers();
      await service.start('ESTIMATED', 0);
      const abandoned = service;

      TestBed.resetTestingModule();
      configure();
      const restored = (await service.refresh())!;
      expect(restored.startFix).toEqual({ status: 'failed' });
      expect(gps.start).not.toHaveBeenCalled();
      await abandoned.clear(); // ends the old instance's pending wait
    });

    it('clear() aborts an in-flight endpoint acquisition', async () => {
      neverAnswers();
      await service.start('ESTIMATED', 0);
      await service.clear(); // would hang here without the abort
      expect(acquireFix.calls.mostRecent().args[3]?.aborted).toBeTrue();
      expect(service.draft()).toBeNull();
    });
  });

  it('isImplausibleEstimate(): under the speed threshold only', () => {
    expect(isImplausibleEstimate(1, 60)).toBeTrue();
    expect(isImplausibleEstimate(10, 60)).toBeFalse();
    expect(isImplausibleEstimate(null, 60)).toBeFalse();
  });
});

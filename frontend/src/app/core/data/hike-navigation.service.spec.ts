import { TestBed } from '@angular/core/testing';
import { CallbackError, Location } from '@capgo/background-geolocation';
import { Preferences } from '@capacitor/preferences';
import { provideTranslateService } from '@ngx-translate/core';

import { HikeRoute } from '../../api/model/hikeRoute';
import { BIKE_LIVE_DRAFT_KEY, HIKE_NAVIGATION_DRAFT_KEY } from '../geo/gps-session-lock';
import { LocationTrackingGateway } from '../geo/location-tracking.gateway';
import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { SpeechService } from '../speech/speech.service';
import { HikeNavigationService, recordedLine } from './hike-navigation.service';
import { HikeRouteRepository } from './hike-route.repository';
import { RouteMetricsRepository } from './route-metrics.repository';

type FixCallback = (location?: Location, error?: CallbackError) => void;

const METERS_PER_DEGREE_LAT = (Math.PI * 6_371_000) / 180;

/** `[lon, lat]` of a point `x` metres east and `y` metres north of a reference point in Hungary. */
function at(x: number, y: number): [number, number] {
  return [19 + x / (METERS_PER_DEGREE_LAT * Math.cos((47.5 * Math.PI) / 180)), 47.5 + y / METERS_PER_DEGREE_LAT];
}

/** A fix at `(x, y)` metres; one per 20 s keeps every step well inside the plausible-speed filter. */
function fixAt(x: number, y: number, timeMs: number): Location {
  const [longitude, latitude] = at(x, y);
  return {
    latitude,
    longitude,
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

/** 600 m north, a right turn, 400 m east. */
const ROUTE: HikeRoute = {
  id: 'route-1',
  name: 'Pilis kör',
  coordinates: [at(0, 0), at(0, 600), at(400, 600)],
  deleted: false,
  elevationGainMeters: 40,
  elevationProfile: [
    { distanceMeters: 0, elevationMeters: 300 },
    { distanceMeters: 1000, elevationMeters: 340 },
  ],
};

describe('HikeNavigationService (backlog/106)', () => {
  let service: HikeNavigationService;
  let gps: jasmine.SpyObj<LocationTrackingGateway>;
  let speech: jasmine.SpyObj<SpeechService>;
  let hikeRoutes: jasmine.SpyObj<HikeRouteRepository>;
  let metrics: jasmine.SpyObj<RouteMetricsRepository>;
  let callback: FixCallback | null;
  let clock: number;

  function configure(): void {
    callback = null;
    gps = jasmine.createSpyObj('LocationTrackingGateway', ['checkPermissions', 'requestNotificationPermission', 'start', 'stop']);
    gps.checkPermissions.and.resolveTo({ location: 'granted', backgroundLocation: 'granted' });
    gps.requestNotificationPermission.and.resolveTo({ location: 'granted', backgroundLocation: 'granted' });
    gps.start.and.callFake((_options, cb) => {
      callback = cb;
      return Promise.resolve();
    });
    gps.stop.and.callFake(() => {
      callback = null;
      return Promise.resolve();
    });
    speech = jasmine.createSpyObj('SpeechService', ['speak', 'stop']);
    speech.speak.and.resolveTo();
    speech.stop.and.resolveTo();
    hikeRoutes = jasmine.createSpyObj('HikeRouteRepository', ['save']);
    hikeRoutes.save.and.callFake((input) => Promise.resolve({ ...input, id: input.id!, deleted: false } as HikeRoute));
    metrics = jasmine.createSpyObj('RouteMetricsRepository', ['compute']);
    metrics.compute.and.callFake(() =>
      Promise.resolve({ distanceMeters: 123, elevationGainMeters: null, elevationLossMeters: null, estimatedDurationMinutes: null, profile: null }),
    );
    const notifications = jasmine.createSpyObj('LocalNotificationsGateway', ['checkPermissions', 'schedule', 'cancelIds', 'removeDeliveredIds']);

    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        { provide: LocationTrackingGateway, useValue: gps },
        { provide: SpeechService, useValue: speech },
        { provide: HikeRouteRepository, useValue: hikeRoutes },
        { provide: RouteMetricsRepository, useValue: metrics },
        { provide: LocalNotificationsGateway, useValue: notifications },
      ],
    });
    service = TestBed.inject(HikeNavigationService);
  }

  /** Walks through `(x, y)` points, one fix every 20 s. */
  async function walk(...points: [number, number][]): Promise<void> {
    for (const [x, y] of points) {
      clock += 20_000;
      callback?.(fixAt(x, y, clock));
      await settle();
    }
  }

  beforeEach(async () => {
    await Preferences.clear();
    clock = 0;
    configure();
  });

  afterEach(async () => {
    await Preferences.clear();
  });

  it('start(): a running bike ride holds the GPS — nothing starts', async () => {
    await Preferences.set({ key: BIKE_LIVE_DRAFT_KEY, value: '{}' });

    expect((await service.start(ROUTE, null)).status).toBe('gps-busy');
    expect(gps.start).not.toHaveBeenCalled();
    expect(service.draft()).toBeNull();
  });

  it('start(): a refused location permission starts nothing', async () => {
    gps.checkPermissions.and.resolveTo({ location: 'denied', backgroundLocation: 'denied' });
    gps.start.and.callFake((_options, cb) => {
      cb(undefined, { name: 'Error', message: 'denied', code: 'NOT_AUTHORIZED' });
      return Promise.resolve();
    });

    expect((await service.start(ROUTE, null)).status).toBe('permission-denied');
    expect(service.draft()).toBeNull();
  });

  it('start(): a GPS that fails to start leaves no session behind', async () => {
    gps.start.and.rejectWith(new Error('location disabled'));

    expect((await service.start(ROUTE, null)).status).toBe('permission-denied');
    expect((await Preferences.get({ key: HIKE_NAVIGATION_DRAFT_KEY })).value).toBeNull();
  });

  it('start(): copies the route into the plan with its turns; a second start keeps the running session', async () => {
    expect((await service.start(ROUTE, null, 0)).status).toBe('started');
    const plan = service.plan()!;
    expect(plan.routeId).toBe('route-1');
    expect(plan.turns.map((turn) => turn.direction)).toEqual(['RIGHT']);
    const sessionId = service.draft()!.sessionId;

    expect((await service.start(null, null, 5_000)).status).toBe('started');
    expect(service.draft()!.sessionId).toBe(sessionId);
    expect(gps.start).toHaveBeenCalledTimes(1);
  });

  it('follows the walker: position, recorded distance, progress, next turn and what is left', async () => {
    await service.start(ROUTE, null, 0);
    await walk([0, 0], [0, 100], [0, 200]);

    expect(service.position()![1]).toBeCloseTo(at(0, 200)[1], 9);
    expect(service.recordedMeters()).toBeCloseTo(200, 0);
    expect(service.progress()!.progressMeters).toBeCloseTo(200, 0);
    expect(service.nextTurn()!.distanceMeters).toBeCloseTo(400, 0);
    expect(service.remaining()!.distanceMeters).toBeCloseTo(800, 0);
    expect(service.remaining()!.elevationGainMeters).toBe(32);
  });

  it('announces the turn by voice, far and near', async () => {
    await service.start(ROUTE, null, 0);
    await walk([0, 300], [0, 400], [0, 470], [0, 520], [0, 580]);

    expect(speech.speak.calls.allArgs().map(([text]) => text)).toEqual(['TURA.NAVIGATION.SAY.TURN_FAR', 'TURA.NAVIGATION.SAY.TURN_NEAR']);
  });

  it('off route: announced once, persisted; back on route announced too', async () => {
    await service.start(ROUTE, null, 0);
    await walk([0, 100], [-80, 150], [-90, 160], [-95, 170]);

    expect(service.offRoute()).toBeTrue();
    const stored = JSON.parse((await Preferences.get({ key: HIKE_NAVIGATION_DRAFT_KEY })).value!);
    expect(stored.progress.offRoute).toBeTrue();

    await walk([-10, 180]);
    expect(service.offRoute()).toBeFalse();
    expect(speech.speak.calls.allArgs().map(([text]) => text)).toEqual(['TURA.NAVIGATION.SAY.OFF_ROUTE', 'TURA.NAVIGATION.SAY.BACK_ON_ROUTE']);
  });

  it('a free recording has no plan, no progress and no announcements', async () => {
    await service.start(null, null, 0);
    await walk([0, 0], [0, 100], [100, 100]);

    expect(service.plan()).toBeNull();
    expect(service.nextTurn()).toBeNull();
    expect(service.remaining()).toBeNull();
    expect(service.recordedMeters()).toBeCloseTo(200, 0);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('pause → resume: no collection while paused, a new segment after it, the pause is not duration', async () => {
    await service.start(null, null, 0);
    await walk([0, 0], [0, 100]);
    await service.pause(60_000);
    expect(gps.stop).toHaveBeenCalled();

    await service.resume(660_000);
    await walk([500, 100], [500, 200]);
    expect(service.recordedSegments().length).toBe(2);
    expect(service.recordedMeters()).toBeCloseTo(200, 0);

    await service.finish(720_000);
    expect(service.summary(720_000)!.durationMinutes).toBe(2);
  });

  it('save(): the simplified recording becomes a HikeRoute under the session id, then the session is gone', async () => {
    await service.start(null, null, 0);
    await walk([0, 0], [0, 50], [0, 100], [100, 100]);
    await service.finish(100_000);
    const sessionId = service.draft()!.sessionId;

    const saved = await service.save('Délutáni séta');

    expect(saved!.id).toBe(sessionId);
    const input = hikeRoutes.save.calls.mostRecent().args[0];
    expect(input.name).toBe('Délutáni séta');
    expect(input.coordinates.length).toBe(3); // the middle point of the straight stretch is dropped
    expect(input.distanceMeters).toBe(123);
    expect(service.draft()).toBeNull();
    expect((await Preferences.get({ key: HIKE_NAVIGATION_DRAFT_KEY })).value).toBeNull();
  });

  it('save(): fewer than two recorded points — nothing to save', async () => {
    await service.start(null, null, 0);
    await walk([0, 0]);
    await service.finish(10_000);

    expect(await service.save('x')).toBeNull();
    expect(hikeRoutes.save).not.toHaveBeenCalled();
  });

  it('after an app restart the session resumes its GPS feed and its track', async () => {
    await service.start(ROUTE, null, 0);
    await walk([0, 0], [0, 100], [0, 200], [0, 300], [0, 400], [0, 500], [0, 520], [0, 540], [0, 560], [0, 580]);

    TestBed.resetTestingModule();
    configure();
    const draft = await service.refresh();

    expect(draft).not.toBeNull();
    expect(gps.start).toHaveBeenCalledTimes(1);
    expect(service.recordedMeters()).toBeCloseTo(580, 0);
    // the far and near announcements were persisted: walking on does not repeat them
    await walk([0, 595]);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('recordedLine: joins the segments, keeps the corners', () => {
    const fix = (x: number, y: number) => ({ lon: at(x, y)[0], lat: at(x, y)[1], timeMs: 0, accuracyMeters: 5 });
    expect(recordedLine([fix(0, 0)], [0])).toBeNull();
    expect(recordedLine([fix(0, 0), fix(0, 50), fix(0, 100), fix(100, 100)], [0])!.length).toBe(3);
  });
});

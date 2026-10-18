import { TestBed } from '@angular/core/testing';
import { CallbackError, Location } from '@capgo/background-geolocation';

import { LocationTrackingGateway } from './location-tracking.gateway';
import { LocationTrackingService, TrackingFix } from './location-tracking.service';

function fixLocation(partial: Partial<Location>): Location {
  return {
    latitude: 47.5,
    longitude: 19.05,
    accuracy: 5,
    altitude: null,
    altitudeAccuracy: null,
    simulated: false,
    bearing: null,
    speed: null,
    time: 1_000,
    ...partial,
  };
}

describe('LocationTrackingService (backlog/150)', () => {
  let service: LocationTrackingService;
  let gateway: jasmine.SpyObj<LocationTrackingGateway>;
  let capturedCallback: ((location?: Location, error?: CallbackError) => void) | null;

  beforeEach(() => {
    capturedCallback = null;
    gateway = jasmine.createSpyObj('LocationTrackingGateway', ['requestPermissions', 'start', 'stop']);
    gateway.start.and.callFake((_options, callback) => {
      capturedCallback = callback;
      return Promise.resolve();
    });
    gateway.stop.and.resolveTo(undefined);

    TestBed.configureTestingModule({ providers: [{ provide: LocationTrackingGateway, useValue: gateway }] });
    service = TestBed.inject(LocationTrackingService);
  });

  it('requestPermission(): maps the gateway status to granted/denied', async () => {
    gateway.requestPermissions.and.resolveTo({ location: 'granted' });
    expect(await service.requestPermission()).toBe('granted');

    gateway.requestPermissions.and.resolveTo({ location: 'denied' });
    expect(await service.requestPermission()).toBe('denied');
  });

  it('start(): forwards an accepted fix to onFix and updates lastFix/tracking', async () => {
    const received: TrackingFix[] = [];
    await service.start('Cím', 'Üzenet', (fix) => received.push(fix));
    expect(service.tracking()).toBe(true);

    capturedCallback?.(fixLocation({ latitude: 47.6, longitude: 19.1, accuracy: 8, time: 2_000 }));

    expect(received.length).toBe(1);
    expect(received[0]).toEqual({ lat: 47.6, lon: 19.1, timeMs: 2_000, accuracyMeters: 8 });
    expect(service.lastFix()).toEqual(received[0]);
    expect(service.weakSignal()).toBe(false);
  });

  it('rejects a fix below the accuracy threshold: weakSignal flips, onFix is not called, lastFix unchanged', async () => {
    const received: TrackingFix[] = [];
    await service.start('Cím', 'Üzenet', (fix) => received.push(fix));
    capturedCallback?.(fixLocation({ accuracy: 10, time: 1_000 }));

    capturedCallback?.(fixLocation({ accuracy: 45, time: 2_000 })); // worse than MAX_ACCEPTED_ACCURACY_METERS (30)

    expect(received.length).toBe(1);
    expect(service.weakSignal()).toBe(true);
    expect(service.lastFix()?.timeMs).toBe(1_000);
  });

  it('rejects an implausible speed jump (two fixes 10km apart, 1s later)', async () => {
    const received: TrackingFix[] = [];
    await service.start('Cím', 'Üzenet', (fix) => received.push(fix));
    capturedCallback?.(fixLocation({ latitude: 47.5, longitude: 19.05, time: 1_000 }));

    capturedCallback?.(fixLocation({ latitude: 47.59, longitude: 19.05, time: 2_000 })); // ~10km in 1s

    expect(received.length).toBe(1);
    expect(service.weakSignal()).toBe(true);
  });

  it('a plugin error flips weakSignal without touching lastFix', async () => {
    await service.start('Cím', 'Üzenet', () => {});
    capturedCallback?.(fixLocation({ time: 1_000 }));

    capturedCallback?.(undefined, { name: 'err', message: 'no fix' });

    expect(service.weakSignal()).toBe(true);
    expect(service.lastFix()?.timeMs).toBe(1_000);
  });

  it('stop(): calls the gateway, resets tracking/lastFix/weakSignal', async () => {
    await service.start('Cím', 'Üzenet', () => {});
    capturedCallback?.(fixLocation({ accuracy: 999, time: 1_000 })); // flips weakSignal first

    await service.stop();

    expect(gateway.stop).toHaveBeenCalled();
    expect(service.tracking()).toBe(false);
    expect(service.lastFix()).toBeNull();
    expect(service.weakSignal()).toBe(false);
  });

  it('start() passes the configured distance filter and the background title/message through', async () => {
    await service.start('Bicikli élő követés', 'A pozíciód figyelése folyamatban', () => {});

    const [options] = gateway.start.calls.mostRecent().args;
    expect(options.backgroundTitle).toBe('Bicikli élő követés');
    expect(options.backgroundMessage).toBe('A pozíciód figyelése folyamatban');
    expect(options.distanceFilter).toBe(5);
    expect(options.requestPermissions).toBe(true);
  });

  describe('acquireFix() — Becsült mode endpoint', () => {
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    it('resolves early on a good fix and stops the plugin', async () => {
      const pending = service.acquireFix('Cím', 'Üzenet', 10_000);
      await settle();
      capturedCallback!(fixLocation({ accuracy: 50, latitude: 47.1 }));
      capturedCallback!(fixLocation({ accuracy: 8, latitude: 47.2 }));
      const fix = await pending;
      expect(fix?.lat).toBe(47.2);
      expect(gateway.stop).toHaveBeenCalled();
      expect(service.tracking()).toBeFalse();
    });

    it('on timeout returns the most accurate fix seen, even a poor one', async () => {
      const pending = service.acquireFix('Cím', 'Üzenet', 30);
      await settle();
      capturedCallback!(fixLocation({ accuracy: 120, latitude: 47.1 }));
      capturedCallback!(fixLocation({ accuracy: 60, latitude: 47.3 }));
      capturedCallback!(fixLocation({ accuracy: 90, latitude: 47.4 }));
      expect((await pending)?.lat).toBe(47.3);
    });

    it('null when nothing arrives or the plugin cannot start', async () => {
      expect(await service.acquireFix('Cím', 'Üzenet', 10)).toBeNull();
      gateway.start.and.rejectWith(new Error('no permission'));
      expect(await service.acquireFix('Cím', 'Üzenet', 10)).toBeNull();
    });
  });
});

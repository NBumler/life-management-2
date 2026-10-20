import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { CallbackError, Location } from '@capgo/background-geolocation';

import { LocationTrackingGateway } from './location-tracking.gateway';
import { LocationTrackingService, TrackingFix } from './location-tracking.service';
import { PERMISSION_POLL_INTERVAL_MS, PERMISSION_PROMPT_TIMEOUT_SECONDS } from './tracking-config';

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
    gateway = jasmine.createSpyObj('LocationTrackingGateway', ['checkPermissions', 'requestNotificationPermission', 'start', 'stop']);
    gateway.start.and.callFake((_options, callback) => {
      capturedCallback = callback;
      return Promise.resolve();
    });
    gateway.stop.and.resolveTo(undefined);
    gateway.checkPermissions.and.resolveTo({ location: 'prompt', backgroundLocation: 'prompt' });
    gateway.requestNotificationPermission.and.resolveTo({ location: 'granted', backgroundLocation: 'granted' });

    TestBed.configureTestingModule({ providers: [{ provide: LocationTrackingGateway, useValue: gateway }] });
    service = TestBed.inject(LocationTrackingService);
  });

  describe('requestPermission() (backlog/229)', () => {
    it('an already granted location asks only for the notification permission, without starting the plugin', async () => {
      gateway.checkPermissions.and.resolveTo({ location: 'granted', backgroundLocation: 'granted' });

      expect(await service.requestPermission('Cím', 'Üzenet')).toBe('granted');
      expect(gateway.requestNotificationPermission).toHaveBeenCalled();
      expect(gateway.start).not.toHaveBeenCalled();
    });

    it('a refusal in the dialog is denied at once and stops the prompt', async () => {
      const result = service.requestPermission('Cím', 'Üzenet');
      await new Promise((resolve) => setTimeout(resolve));
      expect(gateway.start.calls.mostRecent().args[0].requestPermissions).toBe(true);

      capturedCallback?.(undefined, { name: 'Error', message: 'User denied location permission', code: 'NOT_AUTHORIZED' });

      expect(await result).toBe('denied');
      expect(gateway.stop).toHaveBeenCalled();
      expect(gateway.requestNotificationPermission).not.toHaveBeenCalled();
    });

    it('a grant in the dialog is seen by the re-check, then the notification permission is asked for', fakeAsync(() => {
      let state: string | undefined;
      void service.requestPermission('Cím', 'Üzenet').then((s) => (state = s));
      flushMicrotasks();
      gateway.checkPermissions.and.resolveTo({ location: 'granted', backgroundLocation: 'granted' });

      tick(PERMISSION_POLL_INTERVAL_MS);
      flushMicrotasks();

      expect(state).toBe('granted');
      expect(gateway.stop).toHaveBeenCalled();
      expect(gateway.requestNotificationPermission).toHaveBeenCalled();
    }));

    it('web: no permission check, the first fix means granted', async () => {
      gateway.checkPermissions.and.rejectWith(new Error('not implemented'));
      const result = service.requestPermission('Cím', 'Üzenet');
      await new Promise((resolve) => setTimeout(resolve));

      capturedCallback?.(fixLocation({}));

      expect(await result).toBe('granted');
    });

    it('a web refusal (GeolocationPositionError 1) is denied', async () => {
      gateway.checkPermissions.and.rejectWith(new Error('not implemented'));
      const result = service.requestPermission('Cím', 'Üzenet');
      await new Promise((resolve) => setTimeout(resolve));

      capturedCallback?.(undefined, { name: 'GeolocationError', message: 'denied', code: '1' });

      expect(await result).toBe('denied');
    });

    it('a dialog that is never answered counts as denied after the timeout', fakeAsync(() => {
      let state: string | undefined;
      void service.requestPermission('Cím', 'Üzenet').then((s) => (state = s));

      tick(PERMISSION_PROMPT_TIMEOUT_SECONDS * 1000);
      flushMicrotasks();

      expect(state).toBe('denied');
      expect(gateway.stop).toHaveBeenCalled();
    }));

    it('a plugin that cannot start (e.g. a permission missing from the manifest) counts as denied', async () => {
      gateway.start.and.rejectWith(new Error('Missing the following permissions in AndroidManifest.xml'));
      expect(await service.requestPermission('Cím', 'Üzenet')).toBe('denied');
    });
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

  describe('locateOnce() — backlog/215 one-off position', () => {
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    it('is denied at once when the permission is refused, and stops the plugin', async () => {
      const pending = service.locateOnce('Cím', 'Üzenet', 10_000);
      await settle();
      capturedCallback!(undefined, Object.assign(new Error('User denied location permission'), { code: 'NOT_AUTHORIZED' }));
      expect(await pending).toBe('denied');
      expect(gateway.stop).toHaveBeenCalled();
    });

    it('treats any other plugin error as a weak signal and keeps waiting', async () => {
      const pending = service.locateOnce('Cím', 'Üzenet', 30);
      await settle();
      capturedCallback!(undefined, Object.assign(new Error('timeout'), { code: 'TIMEOUT' }));
      capturedCallback!(fixLocation({ accuracy: 40, latitude: 47.5 }));
      expect(await pending).toEqual(jasmine.objectContaining({ lat: 47.5 }));
    });

    it('acquireFix() reports a refusal as no fix', async () => {
      const pending = service.acquireFix('Cím', 'Üzenet', 10_000);
      await settle();
      capturedCallback!(undefined, Object.assign(new Error('denied'), { code: '1' }));
      expect(await pending).toBeNull();
    });
  });
});

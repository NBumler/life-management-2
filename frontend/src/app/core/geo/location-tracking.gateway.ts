import { Injectable } from '@angular/core';
import {
  BackgroundGeolocation,
  BackgroundGeolocationPermissionStatus,
  CallbackError,
  Location,
  StartOptions,
} from '@capgo/background-geolocation';

/**
 * Thin injectable wrapper over `@capgo/background-geolocation`. Exists for the same reason as
 * `LocalNotificationsGateway`: Capacitor's `registerPlugin` returns a Proxy whose methods can't be
 * `spyOn`-ed, so `LocationTrackingService` can only be unit-tested against a seam like this one. No
 * logic here — every method forwards straight to the plugin.
 */
@Injectable({ providedIn: 'root' })
export class LocationTrackingGateway {
  checkPermissions(): Promise<BackgroundGeolocationPermissionStatus> {
    return BackgroundGeolocation.checkPermissions();
  }

  /**
   * Notification only: a `location` request through `requestPermissions()` never settles after a refusal
   * on Android (the plugin keeps re-requesting) — location is asked for by `start()` instead (backlog/229),
   * which asks for the foreground grant only. Locked-screen recording runs in the plugin's `location`
   * foreground service, which needs nothing more — `backgroundLocation` (`ACCESS_BACKGROUND_LOCATION`) is
   * for background geofencing, isn't in the manifest, and asking for it makes the plugin reject the request.
   */
  requestNotificationPermission(): Promise<BackgroundGeolocationPermissionStatus> {
    return BackgroundGeolocation.requestPermissions({ permissions: ['notification'] });
  }

  start(options: StartOptions, callback: (location?: Location, error?: CallbackError) => void): Promise<void> {
    return BackgroundGeolocation.start(options, callback);
  }

  stop(): Promise<void> {
    return BackgroundGeolocation.stop();
  }
}

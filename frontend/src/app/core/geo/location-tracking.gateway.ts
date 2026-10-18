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
  requestPermissions(): Promise<BackgroundGeolocationPermissionStatus> {
    return BackgroundGeolocation.requestPermissions({ permissions: ['location', 'backgroundLocation', 'notification'] });
  }

  start(options: StartOptions, callback: (location?: Location, error?: CallbackError) => void): Promise<void> {
    return BackgroundGeolocation.start(options, callback);
  }

  stop(): Promise<void> {
    return BackgroundGeolocation.stop();
  }
}

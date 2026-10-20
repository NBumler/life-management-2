import { Injectable, inject, signal } from '@angular/core';
import { CallbackError, Location as BgLocation } from '@capgo/background-geolocation';

import { haversineMeters } from './geo-math';
import { LocationTrackingGateway } from './location-tracking.gateway';
import {
  ENDPOINT_FIX_GOOD_ACCURACY_METERS,
  ENDPOINT_FIX_TIMEOUT_SECONDS,
  LIVE_DISTANCE_FILTER_METERS,
  MAX_ACCEPTED_ACCURACY_METERS,
  MAX_PLAUSIBLE_SPEED_KMH,
  PERMISSION_POLL_INTERVAL_MS,
  PERMISSION_PROMPT_TIMEOUT_SECONDS,
} from './tracking-config';

export interface TrackingFix {
  lat: number;
  lon: number;
  timeMs: number;
  accuracyMeters: number;
}

export type LocationPermissionState = 'granted' | 'denied';

/**
 * The plugin's error codes for a refused permission or switched-off location: `NOT_AUTHORIZED` on
 * Android; the web build passes the browser's `GeolocationPositionError.code` through (`1` = denied).
 */
const LOCATION_REFUSED_CODES = ['NOT_AUTHORIZED', '1'];

/**
 * backlog/150 — continuous (Pontos) GPS tracking, backed by `@capgo/background-geolocation`
 * through `LocationTrackingGateway`. Fix filtering (accuracy threshold, implausible speed-jump)
 * happens here so every consumer (bike live session, later the #106 hike tracker) gets the same
 * quality bar without re-implementing it.
 */
@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private readonly gateway = inject(LocationTrackingGateway);

  readonly tracking = signal(false);
  readonly lastFix = signal<TrackingFix | null>(null);
  /** A fix was rejected (low accuracy, implausible speed-jump, or a plugin error) since the last accepted one. */
  readonly weakSignal = signal(false);

  private onFix: ((fix: TrackingFix) => void) | null = null;

  /**
   * Location (and, once location is allowed, notification) permission before a tracking session.
   * backlog/229 — the plugin's `requestPermissions()` never settles after a location refusal on Android
   * (it keeps re-requesting), so a missing grant is asked for through a short `start()`, which reports a
   * refusal as `NOT_AUTHORIZED`; the grant itself is reported to nobody, so it is re-checked meanwhile
   * (or seen as the first fix, on web). No answer within `PERMISSION_PROMPT_TIMEOUT_SECONDS`, or a plugin
   * that cannot start, counts as denied, so the UI explains instead of waiting forever.
   */
  async requestPermission(backgroundTitle: string, backgroundMessage: string): Promise<LocationPermissionState> {
    const granted = (await this.checkLocationGranted()) || (await this.promptForLocation(backgroundTitle, backgroundMessage));
    if (!granted) {
      return 'denied';
    }
    try {
      await this.gateway.requestNotificationPermission();
    } catch {
      // no notification permission: tracking still runs
    }
    return 'granted';
  }

  private async checkLocationGranted(): Promise<boolean> {
    try {
      return (await this.gateway.checkPermissions()).location === 'granted';
    } catch {
      return false; // web: not implemented — the prompt below asks
    }
  }

  private async promptForLocation(backgroundTitle: string, backgroundMessage: string): Promise<boolean> {
    let answer: boolean | null = null;
    let finish: () => void = () => undefined;
    const done = new Promise<void>((resolve) => (finish = resolve));
    const settle = (granted: boolean) => {
      answer ??= granted;
      finish();
    };
    const timer = setTimeout(() => settle(false), PERMISSION_PROMPT_TIMEOUT_SECONDS * 1000);
    const poll = setInterval(() => {
      void this.checkLocationGranted().then((granted) => {
        if (granted) {
          settle(true);
        }
      });
    }, PERMISSION_POLL_INTERVAL_MS);
    try {
      await this.gateway.start({ backgroundTitle, backgroundMessage, requestPermissions: true, distanceFilter: 0 }, (location, error) => {
        if (location) {
          settle(true);
        } else if (error && LOCATION_REFUSED_CODES.includes(error.code ?? '')) {
          settle(false);
        }
      });
      await done;
    } catch {
      settle(false); // the plugin could not start
    } finally {
      clearTimeout(timer);
      clearInterval(poll);
      try {
        await this.gateway.stop();
      } catch {
        // already stopped
      }
    }
    return answer ?? false;
  }

  /** Starts continuous tracking; `onFix` only receives fixes that pass the filters below. */
  async start(backgroundTitle: string, backgroundMessage: string, onFix: (fix: TrackingFix) => void): Promise<void> {
    this.onFix = onFix;
    this.weakSignal.set(false);
    this.lastFix.set(null);
    await this.gateway.start(
      {
        backgroundTitle,
        backgroundMessage,
        requestPermissions: true,
        distanceFilter: LIVE_DISTANCE_FILTER_METERS,
      },
      (location, error) => this.handleUpdate(location, error),
    );
    this.tracking.set(true);
  }

  /**
   * Becsült mode: one endpoint fix. Waits up to `timeoutMs` for a fix at least
   * `ENDPOINT_FIX_GOOD_ACCURACY_METERS` accurate; on timeout the most accurate one seen (any accuracy —
   * a rough endpoint still beats none), or `null` when nothing arrived or location is not allowed.
   * `abort` ends the wait the same way. Not for use while `start()` is running — both drive the same plugin.
   */
  async acquireFix(
    backgroundTitle: string,
    backgroundMessage: string,
    timeoutMs: number = ENDPOINT_FIX_TIMEOUT_SECONDS * 1000,
    abort?: AbortSignal,
  ): Promise<TrackingFix | null> {
    const result = await this.locateOnce(backgroundTitle, backgroundMessage, timeoutMs, abort);
    return result === 'denied' ? null : result;
  }

  /**
   * backlog/215 — `acquireFix()`, but tells a refused location apart: `'denied'` as soon as the plugin
   * reports that the permission was refused or location is switched off. The plugin's own `start()`
   * asks for the permission (see `requestPermission()` for why not the plugin's `requestPermissions()`).
   */
  async locateOnce(
    backgroundTitle: string,
    backgroundMessage: string,
    timeoutMs: number = ENDPOINT_FIX_TIMEOUT_SECONDS * 1000,
    abort?: AbortSignal,
  ): Promise<TrackingFix | null | 'denied'> {
    let best: TrackingFix | null = null;
    let denied = false;
    let finish: () => void = () => undefined;
    const done = new Promise<void>((resolve) => (finish = resolve));
    const timer = setTimeout(() => finish(), timeoutMs);
    abort?.addEventListener('abort', () => finish());
    try {
      if (abort?.aborted) {
        return null;
      }
      await this.gateway.start({ backgroundTitle, backgroundMessage, requestPermissions: true, distanceFilter: 0 }, (location, error) => {
        if (error || !location) {
          if (error && LOCATION_REFUSED_CODES.includes(error.code ?? '')) {
            denied = true;
            finish();
          }
          return;
        }
        if (best === null || location.accuracy < best.accuracyMeters) {
          best = { lat: location.latitude, lon: location.longitude, timeMs: location.time ?? Date.now(), accuracyMeters: location.accuracy };
        }
        if (location.accuracy <= ENDPOINT_FIX_GOOD_ACCURACY_METERS) {
          finish();
        }
      });
      await done;
    } catch {
      // the plugin could not start: no fix
    } finally {
      clearTimeout(timer);
      try {
        await this.gateway.stop();
      } catch {
        // already stopped
      }
    }
    return denied && best === null ? 'denied' : best;
  }

  async stop(): Promise<void> {
    await this.gateway.stop();
    this.tracking.set(false);
    this.onFix = null;
    this.lastFix.set(null);
    this.weakSignal.set(false);
  }

  private handleUpdate(location?: BgLocation, error?: CallbackError): void {
    if (error || !location) {
      this.weakSignal.set(true);
      return;
    }
    if (location.accuracy > MAX_ACCEPTED_ACCURACY_METERS) {
      this.weakSignal.set(true);
      return;
    }
    const timeMs = location.time ?? Date.now();
    const previous = this.lastFix();
    if (previous !== null) {
      const elapsedSeconds = (timeMs - previous.timeMs) / 1000;
      if (elapsedSeconds > 0) {
        const distanceMeters = haversineMeters(previous.lon, previous.lat, location.longitude, location.latitude);
        const speedKmh = (distanceMeters / elapsedSeconds) * 3.6;
        if (speedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
          this.weakSignal.set(true);
          return;
        }
      }
    }
    this.weakSignal.set(false);
    const fix: TrackingFix = {
      lat: location.latitude,
      lon: location.longitude,
      timeMs,
      accuracyMeters: location.accuracy,
    };
    this.lastFix.set(fix);
    this.onFix?.(fix);
  }
}

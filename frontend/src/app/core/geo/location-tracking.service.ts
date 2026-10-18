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
} from './tracking-config';

export interface TrackingFix {
  lat: number;
  lon: number;
  timeMs: number;
  accuracyMeters: number;
}

export type LocationPermissionState = 'granted' | 'denied';

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

  async requestPermission(): Promise<LocationPermissionState> {
    const status = await this.gateway.requestPermissions();
    return status.location === 'granted' ? 'granted' : 'denied';
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
   * a rough endpoint still beats none), or `null` when nothing arrived. `abort` ends the wait the same
   * way. Not for use while `start()` is running — both drive the same plugin.
   */
  async acquireFix(
    backgroundTitle: string,
    backgroundMessage: string,
    timeoutMs: number = ENDPOINT_FIX_TIMEOUT_SECONDS * 1000,
    abort?: AbortSignal,
  ): Promise<TrackingFix | null> {
    let best: TrackingFix | null = null;
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
    return best;
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

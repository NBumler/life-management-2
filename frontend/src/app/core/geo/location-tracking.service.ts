import { Injectable, inject, signal } from '@angular/core';
import { CallbackError, Location as BgLocation } from '@capgo/background-geolocation';

import { haversineMeters } from './geo-math';
import { LocationTrackingGateway } from './location-tracking.gateway';
import { LIVE_DISTANCE_FILTER_METERS, MAX_ACCEPTED_ACCURACY_METERS, MAX_PLAUSIBLE_SPEED_KMH } from './tracking-config';

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

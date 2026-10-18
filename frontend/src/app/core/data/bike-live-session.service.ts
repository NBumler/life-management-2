import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../api/model/bikeRideLog';
import { ElevationService } from '../geo/elevation.service';
import { haversineMeters, polylineLengthMeters, resampleEvenly } from '../geo/geo-math';
import { LocationPermissionState, LocationTrackingService, TrackingFix } from '../geo/location-tracking.service';
import { computeRouteMetrics } from '../geo/route-metrics';
import { TrackBufferService } from '../geo/track-buffer';
import { ELEVATION_SAMPLE_SPACING_METERS } from '../geo/tracking-config';
import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { uuidV4 } from '../sync/uuid';

/**
 * backlog/150 — the one in-progress **live** (Pontos) bike ride. Same split as
 * `ClimbingLiveSessionService`: device-local state in `@capacitor/preferences` until the user approves
 * the summary, which is then saved through `BikeRideLogRepository` like a manual entry. The raw GPS
 * points live in `TrackBufferService`; this draft only holds the timing and the segment boundaries.
 */
export interface BikeLiveDraft {
  /** Client UUID the approved `BikeRideLog` is saved under. */
  rideId: string;
  startedAtMs: number;
  /** Non-null while paused. */
  pausedAtMs: number | null;
  /** Sum of every finished pause — not part of `durationMinutes`. */
  pausedTotalMs: number;
  /** Track-buffer index where each recording segment starts; a pause → resume opens a new one, so the gap is never counted as distance. */
  segmentStarts: number[];
  /** Set by "Befejezés"; null while live. */
  endedAtMs: number | null;
}

/** Pre-filled values for the editable summary form. `null` = not computable (shown as `~`, never `0` — Backend-offline first §14). */
export interface BikeLiveSummary {
  id: string;
  date: string;
  startedAt: string;
  durationMinutes: number;
  distanceKm: number | null;
  elevationGainMeters: number | null;
  trackingMode: BikeRideLog.TrackingModeEnum;
}

export type BikeLiveStartResult = { status: 'started'; draft: BikeLiveDraft } | { status: 'permission-denied' };

const PREFERENCES_KEY = 'lm2_bike_live_draft';
const TRACK_SESSION_KIND = 'bike';
/** Shown only while paused — while recording, the GPS plugin's own foreground-service notification plays this role. Outside the scheduler's registry. */
export const BIKE_LIVE_PAUSED_NOTIFICATION_ID = 424_243;
const CHANNEL_ID = 'lm2-default';

export const BIKE_LIVE_ROUTE = '/tabs/workout/cycling/live';
/** The editable summary after "Befejezés" — the bike-ride form pre-filled from `summary()`. */
export const BIKE_LIVE_SUMMARY_ROUTE = '/tabs/workout/cycling/live/summary';

export function activeElapsedMs(draft: BikeLiveDraft, nowMs: number): number {
  const endMs = draft.endedAtMs ?? draft.pausedAtMs ?? nowMs;
  return Math.max(0, endMs - draft.startedAtMs - draft.pausedTotalMs);
}

/** Splits the buffered points into the recorded segments, as `[lon, lat]` polylines. */
export function trackSegments(points: readonly TrackingFix[], segmentStarts: readonly number[]): number[][][] {
  return segmentStarts
    .map((start, i) => points.slice(start, segmentStarts[i + 1] ?? points.length).map((p) => [p.lon, p.lat]))
    .filter((segment) => segment.length > 0);
}

function localDate(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

@Injectable({ providedIn: 'root' })
export class BikeLiveSessionService {
  private readonly location = inject(LocationTrackingService);
  private readonly track = inject(TrackBufferService);
  private readonly elevation = inject(ElevationService);
  private readonly notifications = inject(LocalNotificationsGateway);
  private readonly translate = inject(TranslateService);

  readonly draft = signal<BikeLiveDraft | null>(null);
  readonly hasDraft = computed(() => this.draft() !== null);
  readonly paused = computed(() => this.draft()?.pausedAtMs != null);
  /** Distance recorded so far, for the live screen. */
  readonly distanceMeters = signal(0);
  readonly weakSignal = this.location.weakSignal;

  private loadedRideId: string | null = null;

  /**
   * Re-reads the persisted draft and its track — call on entry to any screen that shows it. A ride
   * that was recording when the app was killed resumes its GPS feed here.
   */
  async refresh(): Promise<BikeLiveDraft | null> {
    const stored = await Preferences.get({ key: PREFERENCES_KEY });
    const draft = stored.value ? (JSON.parse(stored.value) as BikeLiveDraft) : null;
    this.draft.set(draft);
    if (draft === null) {
      this.distanceMeters.set(0);
      return null;
    }
    // Only after a restart: mid-ride the in-memory buffer is ahead of the persisted one (batched flush).
    if (this.loadedRideId !== draft.rideId) {
      const points = await this.track.restore(TRACK_SESSION_KIND);
      this.distanceMeters.set(this.recordedDistance(points, draft.segmentStarts));
      this.loadedRideId = draft.rideId;
    }
    if (draft.pausedAtMs === null && draft.endedAtMs === null && !this.location.tracking()) {
      await this.startGps(draft);
    }
    return draft;
  }

  /** "Indítás": at most one ride at a time — an existing one is returned instead. */
  async start(nowMs: number = Date.now()): Promise<BikeLiveStartResult> {
    const existing = await this.refresh();
    if (existing !== null) {
      return { status: 'started', draft: existing };
    }
    const permission: LocationPermissionState = await this.location.requestPermission();
    if (permission !== 'granted') {
      return { status: 'permission-denied' };
    }
    await this.track.restore(TRACK_SESSION_KIND);
    await this.track.clear();
    const draft: BikeLiveDraft = {
      rideId: uuidV4(),
      startedAtMs: nowMs,
      pausedAtMs: null,
      pausedTotalMs: 0,
      segmentStarts: [0],
      endedAtMs: null,
    };
    this.distanceMeters.set(0);
    this.loadedRideId = draft.rideId;
    await this.write(draft);
    await this.startGps(draft);
    return { status: 'started', draft };
  }

  /** "Szünet": no collection while paused. */
  async pause(nowMs: number = Date.now()): Promise<void> {
    const current = this.draft();
    if (current === null || current.pausedAtMs !== null || current.endedAtMs !== null) {
      return;
    }
    await this.location.stop();
    await this.track.flush();
    const draft = { ...current, pausedAtMs: nowMs };
    await this.write(draft);
    await this.showPausedNotification(draft);
  }

  async resume(nowMs: number = Date.now()): Promise<void> {
    const current = this.draft();
    if (current === null || current.pausedAtMs === null || current.endedAtMs !== null) {
      return;
    }
    const draft: BikeLiveDraft = {
      ...current,
      pausedAtMs: null,
      pausedTotalMs: current.pausedTotalMs + Math.max(0, nowMs - current.pausedAtMs),
      segmentStarts: [...current.segmentStarts, this.track.current().length],
    };
    await this.write(draft);
    await this.cancelPausedNotification();
    await this.startGps(draft);
  }

  /** "Befejezés": stops the GPS and freezes the end time; the summary form comes next. */
  async finish(nowMs: number = Date.now()): Promise<void> {
    const current = this.draft();
    if (current === null || current.endedAtMs !== null) {
      return;
    }
    if (this.location.tracking()) {
      await this.location.stop();
    }
    await this.track.flush();
    const pausedTotalMs =
      current.pausedAtMs !== null ? current.pausedTotalMs + Math.max(0, nowMs - current.pausedAtMs) : current.pausedTotalMs;
    await this.write({ ...current, pausedAtMs: null, pausedTotalMs, endedAtMs: nowMs });
    await this.cancelPausedNotification();
  }

  /** Values to pre-fill the summary with; the elevation is looked up on the device (DEM, Open-Meteo outside the coverage). */
  async summary(): Promise<BikeLiveSummary | null> {
    const draft = this.draft();
    if (draft === null) {
      return null;
    }
    const segments = trackSegments(this.track.current(), draft.segmentStarts).filter((segment) => segment.length >= 2);
    const distanceMeters = segments.reduce((sum, segment) => sum + polylineLengthMeters(segment), 0);
    return {
      id: draft.rideId,
      date: localDate(draft.startedAtMs),
      startedAt: new Date(draft.startedAtMs).toISOString(),
      durationMinutes: Math.max(1, Math.round(activeElapsedMs(draft, Date.now()) / 60_000)),
      distanceKm: segments.length > 0 ? Math.round(distanceMeters / 10) / 100 : null,
      elevationGainMeters: segments.length > 0 ? await this.elevationGain(segments) : null,
      trackingMode: BikeRideLog.TrackingModeEnum.Live,
    };
  }

  /** Approved (saved) or discarded: drops the draft, the raw points and the notifications. */
  async clear(): Promise<void> {
    if (this.location.tracking()) {
      await this.location.stop();
    }
    this.draft.set(null);
    this.distanceMeters.set(0);
    this.loadedRideId = null;
    await this.track.restore(TRACK_SESSION_KIND);
    await this.track.clear();
    await Preferences.remove({ key: PREFERENCES_KEY });
    await this.cancelPausedNotification();
  }

  private async startGps(draft: BikeLiveDraft): Promise<void> {
    const segmentStart = draft.segmentStarts[draft.segmentStarts.length - 1];
    await this.location.start(
      this.translate.instant('WORKOUT.BIKE.LIVE.NOTIFICATION_TITLE'),
      this.translate.instant('WORKOUT.BIKE.LIVE.NOTIFICATION_BODY'),
      (fix) => void this.onFix(fix, segmentStart),
    );
  }

  private async onFix(fix: TrackingFix, segmentStart: number): Promise<void> {
    const points = this.track.current();
    const previous = points.length > segmentStart ? points[points.length - 1] : null;
    await this.track.append(fix);
    if (previous !== null) {
      this.distanceMeters.update((meters) => meters + haversineMeters(previous.lon, previous.lat, fix.lon, fix.lat));
    }
  }

  private recordedDistance(points: readonly TrackingFix[], segmentStarts: readonly number[]): number {
    return trackSegments(points, segmentStarts).reduce((sum, segment) => sum + polylineLengthMeters(segment), 0);
  }

  private async elevationGain(segments: readonly number[][][]): Promise<number | null> {
    try {
      let gain = 0;
      for (const segment of segments) {
        const count = Math.max(2, Math.ceil(polylineLengthMeters(segment) / ELEVATION_SAMPLE_SPACING_METERS) + 1);
        const samples = resampleEvenly(segment, count);
        const elevations = await this.elevation.fetchElevations(samples);
        gain += computeRouteMetrics(segment, samples, elevations).elevationGainMeters ?? 0;
      }
      return Math.round(gain);
    } catch {
      return null;
    }
  }

  private async write(draft: BikeLiveDraft): Promise<void> {
    this.draft.set(draft);
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(draft) });
  }

  /** Native only; a missing permission or a plugin error never blocks the ride. */
  private async showPausedNotification(draft: BikeLiveDraft): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      if ((await this.notifications.checkPermissions()).display !== 'granted') {
        return;
      }
      const startedAt = new Date(draft.startedAtMs);
      const time = `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`;
      await this.notifications.schedule({
        notifications: [
          {
            id: BIKE_LIVE_PAUSED_NOTIFICATION_ID,
            channelId: CHANNEL_ID,
            title: this.translate.instant('WORKOUT.BIKE.LIVE.PAUSED_NOTIFICATION_TITLE'),
            body: this.translate.instant('WORKOUT.BIKE.LIVE.PAUSED_NOTIFICATION_BODY', { time }),
            ongoing: true,
            autoCancel: false,
            extra: { route: BIKE_LIVE_ROUTE },
          },
        ],
      });
    } catch {
      // the ride itself never depends on the notification
    }
  }

  private async cancelPausedNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await this.notifications.cancelIds([BIKE_LIVE_PAUSED_NOTIFICATION_ID]);
    } catch {
      // nothing to cancel
    }
  }
}

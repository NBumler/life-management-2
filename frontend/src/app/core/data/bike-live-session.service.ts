import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { BikeRideLog } from '../../api/model/bikeRideLog';
import { ElevationService } from '../geo/elevation.service';
import { haversineMeters, polylineLengthMeters, resampleEvenly, withExactEndpoints } from '../geo/geo-math';
import { LocationPermissionState, LocationTrackingService, TrackingFix } from '../geo/location-tracking.service';
import { computeRouteMetrics } from '../geo/route-metrics';
import { RoutingService } from '../geo/routing.service';
import { TrackBufferService } from '../geo/track-buffer';
import { ELEVATION_SAMPLE_SPACING_METERS, MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH, ROAD_CIRCUITY_FACTOR } from '../geo/tracking-config';
import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { uuidV4 } from '../sync/uuid';

/**
 * backlog/150 — the one in-progress **live** bike ride, in one of two modes:
 * - **Pontos** (`LIVE`): continuous GPS; distance = the recorded track, elevation = DEM along it.
 * - **Becsült** (`ESTIMATED`): no GPS while riding — one fix at the start and one at the end; distance
 *   = the on-device bike route between them (rough fallback: straight line × `ROAD_CIRCUITY_FACTOR`),
 *   elevation = DEM along that line.
 *
 * Same split as `ClimbingLiveSessionService`: device-local state in `@capacitor/preferences` until the
 * user approves the summary, which is then saved through `BikeRideLogRepository` like a manual entry.
 * The raw GPS points live in `TrackBufferService`; this draft only holds the timing, the segment
 * boundaries and (Becsült) the two endpoint fixes.
 */
export type BikeLiveMode = typeof BikeRideLog.TrackingModeEnum.Live | typeof BikeRideLog.TrackingModeEnum.Estimated;

/** A Becsült endpoint: being acquired, acquired, or no fix within the timeout. */
export type EndpointFixState =
  | { status: 'pending' }
  | { status: 'fixed'; lat: number; lon: number; accuracyMeters: number }
  | { status: 'failed' };

export interface BikeLiveDraft {
  /** Missing on drafts written before the Becsült mode existed = `LIVE`. */
  mode?: BikeLiveMode;
  /** Becsült only. */
  startFix?: EndpointFixState;
  /** Becsült only; set by "Befejezés". */
  endFix?: EndpointFixState;
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
  /** Becsült only: `ROUTED` = along the bike network, `ROUGH` = straight-line fallback ("durva becslés"), `null` = no estimate. */
  estimate: 'ROUTED' | 'ROUGH' | null;
  /** Becsült only: the estimated average speed is below `MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH` — ask for the distance. */
  implausible: boolean;
}

export type BikeLiveStartResult = { status: 'started'; draft: BikeLiveDraft } | { status: 'permission-denied' };

const PREFERENCES_KEY = 'lm2_bike_live_draft';
const TRACK_SESSION_KIND = 'bike';
/**
 * Our own ongoing notification: Pontos shows it only while paused (while recording, the GPS plugin's
 * foreground-service notification plays this role); Becsült — no continuous GPS — shows it throughout.
 * Outside the scheduler's registry.
 */
export const BIKE_LIVE_NOTIFICATION_ID = 424_243;
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

export function liveMode(draft: BikeLiveDraft): BikeLiveMode {
  return draft.mode ?? BikeRideLog.TrackingModeEnum.Live;
}

/** Becsült plausibility: an estimate implying an average speed under the threshold is suspicious (loop ride, detour). */
export function isImplausibleEstimate(distanceKm: number | null, durationMinutes: number): boolean {
  return distanceKm !== null && durationMinutes > 0 && distanceKm / (durationMinutes / 60) < MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH;
}

function fixedPoint(state: EndpointFixState | undefined): [number, number] | null {
  return state?.status === 'fixed' ? [state.lon, state.lat] : null;
}

function roundKm(meters: number): number {
  return Math.round(meters / 10) / 100;
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
  private readonly routing = inject(RoutingService);
  private readonly notifications = inject(LocalNotificationsGateway);
  private readonly translate = inject(TranslateService);

  readonly draft = signal<BikeLiveDraft | null>(null);
  readonly hasDraft = computed(() => this.draft() !== null);
  readonly paused = computed(() => this.draft()?.pausedAtMs != null);
  readonly mode = computed(() => {
    const draft = this.draft();
    return draft ? liveMode(draft) : null;
  });
  /** Distance recorded so far, for the live screen. */
  readonly distanceMeters = signal(0);
  readonly weakSignal = this.location.weakSignal;

  private loadedRideId: string | null = null;
  /** Becsült: the in-flight endpoint acquisitions (the end fix waits for the start one — both drive the same plugin). */
  private startFixTask: Promise<void> | null = null;
  private endFixTask: Promise<void> | null = null;
  /** Ends an in-flight endpoint acquisition when the ride is discarded, so the plugin is free for the next one. */
  private fixAbort: AbortController | null = null;

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
    if (liveMode(draft) === BikeRideLog.TrackingModeEnum.Estimated) {
      return this.settleInterruptedFixes(draft);
    }
    if (draft.pausedAtMs === null && draft.endedAtMs === null && !this.location.tracking()) {
      await this.startGps(draft);
    }
    return draft;
  }

  /** "Indítás": at most one ride at a time — an existing one is returned instead. */
  async start(mode: BikeLiveMode = BikeRideLog.TrackingModeEnum.Live, nowMs: number = Date.now()): Promise<BikeLiveStartResult> {
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
    const estimated = mode === BikeRideLog.TrackingModeEnum.Estimated;
    const draft: BikeLiveDraft = {
      rideId: uuidV4(),
      mode,
      startedAtMs: nowMs,
      pausedAtMs: null,
      pausedTotalMs: 0,
      segmentStarts: [0],
      endedAtMs: null,
      ...(estimated ? { startFix: { status: 'pending' as const } } : {}),
    };
    this.distanceMeters.set(0);
    this.loadedRideId = draft.rideId;
    await this.write(draft);
    if (estimated) {
      await this.showOngoingNotification(draft);
      // the timer runs from the tap; the start fix is taken in the background (up to ENDPOINT_FIX_TIMEOUT_SECONDS)
      const task = this.acquireEndpoint('startFix', draft.rideId).finally(() => {
        if (this.startFixTask === task) {
          this.startFixTask = null;
        }
      });
      this.startFixTask = task;
    } else {
      await this.startGps(draft);
    }
    return { status: 'started', draft };
  }

  /** Resolves once the Becsült start fix is settled (fixed or failed); immediately when none is in flight. */
  async startFixSettled(): Promise<void> {
    await this.startFixTask;
  }

  /** "Szünet": no collection while paused. */
  async pause(nowMs: number = Date.now()): Promise<void> {
    const current = this.draft();
    if (current === null || current.pausedAtMs !== null || current.endedAtMs !== null) {
      return;
    }
    if (liveMode(current) === BikeRideLog.TrackingModeEnum.Live) {
      await this.location.stop();
      await this.track.flush();
    }
    const draft = { ...current, pausedAtMs: nowMs };
    await this.write(draft);
    await this.showOngoingNotification(draft);
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
    if (liveMode(draft) === BikeRideLog.TrackingModeEnum.Estimated) {
      await this.showOngoingNotification(draft);
      return;
    }
    await this.cancelOngoingNotification();
    await this.startGps(draft);
  }

  /** "Befejezés": stops the GPS (Becsült: takes the end fix) and freezes the end time; the summary form comes next. */
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
    const estimated = liveMode(current) === BikeRideLog.TrackingModeEnum.Estimated;
    await this.write({
      ...current,
      pausedAtMs: null,
      pausedTotalMs,
      endedAtMs: nowMs,
      ...(estimated ? { endFix: { status: 'pending' as const } } : {}),
    });
    await this.cancelOngoingNotification();
    if (estimated) {
      await this.startFixSettled();
      this.endFixTask = this.acquireEndpoint('endFix', current.rideId);
      try {
        await this.endFixTask;
      } finally {
        this.endFixTask = null;
      }
    }
  }

  /** Values to pre-fill the summary with; the elevation is looked up on the device (DEM, Open-Meteo outside the coverage). */
  async summary(): Promise<BikeLiveSummary | null> {
    const draft = this.draft();
    if (draft === null) {
      return null;
    }
    const base = {
      id: draft.rideId,
      date: localDate(draft.startedAtMs),
      startedAt: new Date(draft.startedAtMs).toISOString(),
      durationMinutes: Math.max(1, Math.round(activeElapsedMs(draft, Date.now()) / 60_000)),
    };
    if (liveMode(draft) === BikeRideLog.TrackingModeEnum.Estimated) {
      const estimate = await this.estimate(draft);
      return {
        ...base,
        ...estimate,
        trackingMode: BikeRideLog.TrackingModeEnum.Estimated,
        implausible: isImplausibleEstimate(estimate.distanceKm, base.durationMinutes),
      };
    }
    const segments = trackSegments(this.track.current(), draft.segmentStarts).filter((segment) => segment.length >= 2);
    const distanceMeters = segments.reduce((sum, segment) => sum + polylineLengthMeters(segment), 0);
    return {
      ...base,
      distanceKm: segments.length > 0 ? roundKm(distanceMeters) : null,
      elevationGainMeters: segments.length > 0 ? await this.elevationGain(segments) : null,
      trackingMode: BikeRideLog.TrackingModeEnum.Live,
      estimate: null,
      implausible: false,
    };
  }

  /** Approved (saved) or discarded: drops the draft, the raw points and the notifications. */
  async clear(): Promise<void> {
    this.fixAbort?.abort();
    await Promise.all([this.startFixTask, this.endFixTask]);
    if (this.location.tracking()) {
      await this.location.stop();
    }
    this.draft.set(null);
    this.distanceMeters.set(0);
    this.loadedRideId = null;
    await this.track.restore(TRACK_SESSION_KIND);
    await this.track.clear();
    await Preferences.remove({ key: PREFERENCES_KEY });
    await this.cancelOngoingNotification();
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

  /**
   * Becsült: the bike route between the two endpoint fixes on the device network; outside it (or
   * with no connected route) the rough straight-line fallback. No endpoint → nothing to estimate.
   */
  private async estimate(
    draft: BikeLiveDraft,
  ): Promise<{ distanceKm: number | null; elevationGainMeters: number | null; estimate: 'ROUTED' | 'ROUGH' | null }> {
    const from = fixedPoint(draft.startFix);
    const to = fixedPoint(draft.endFix);
    if (from === null || to === null) {
      return { distanceKm: null, elevationGainMeters: null, estimate: null };
    }
    let route: number[][] | null;
    try {
      route = await this.routing.route('BIKE', from, to);
    } catch {
      route = null; // no geo package on this device: same as no route
    }
    if (route !== null && route.length >= 2) {
      const line = withExactEndpoints(route, from, to);
      return { distanceKm: roundKm(polylineLengthMeters(line)), elevationGainMeters: await this.elevationGain([line]), estimate: 'ROUTED' };
    }
    return {
      distanceKm: roundKm(haversineMeters(from[0], from[1], to[0], to[1]) * ROAD_CIRCUITY_FACTOR),
      // along the straight line: a lower bound
      elevationGainMeters: await this.elevationGain([[from, to]]),
      estimate: 'ROUGH',
    };
  }

  private async acquireEndpoint(key: 'startFix' | 'endFix', rideId: string): Promise<void> {
    this.fixAbort = new AbortController();
    const fix = await this.location.acquireFix(
      this.translate.instant('WORKOUT.BIKE.LIVE.NOTIFICATION_TITLE'),
      this.translate.instant('WORKOUT.BIKE.LIVE.ENDPOINT_FIX_BODY'),
      undefined,
      this.fixAbort.signal,
    );
    this.fixAbort = null;
    const current = this.draft();
    if (current === null || current.rideId !== rideId) {
      return; // discarded meanwhile
    }
    const state: EndpointFixState = fix
      ? { status: 'fixed', lat: fix.lat, lon: fix.lon, accuracyMeters: fix.accuracyMeters }
      : { status: 'failed' };
    await this.write({ ...current, [key]: state });
  }

  /** After an app restart a Becsült fix that was being acquired never completes — it counts as failed. */
  private async settleInterruptedFixes(draft: BikeLiveDraft): Promise<BikeLiveDraft> {
    const startInterrupted = draft.startFix?.status === 'pending' && this.startFixTask === null;
    const endInterrupted = draft.endFix?.status === 'pending' && this.endFixTask === null;
    if (!startInterrupted && !endInterrupted) {
      return draft;
    }
    const settled: BikeLiveDraft = {
      ...draft,
      ...(startInterrupted ? { startFix: { status: 'failed' as const } } : {}),
      ...(endInterrupted ? { endFix: { status: 'failed' as const } } : {}),
    };
    await this.write(settled);
    return settled;
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

  /** Native only; a missing permission or a plugin error never blocks the ride. Re-scheduling the same id replaces the shown one. */
  private async showOngoingNotification(draft: BikeLiveDraft): Promise<void> {
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
            id: BIKE_LIVE_NOTIFICATION_ID,
            channelId: CHANNEL_ID,
            title: this.translate.instant(
              draft.pausedAtMs !== null ? 'WORKOUT.BIKE.LIVE.PAUSED_NOTIFICATION_TITLE' : 'WORKOUT.BIKE.LIVE.NOTIFICATION_TITLE',
            ),
            body: this.translate.instant(
              draft.pausedAtMs !== null ? 'WORKOUT.BIKE.LIVE.PAUSED_NOTIFICATION_BODY' : 'WORKOUT.BIKE.LIVE.ESTIMATED_NOTIFICATION_BODY',
              { time },
            ),
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

  private async cancelOngoingNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await this.notifications.cancelIds([BIKE_LIVE_NOTIFICATION_ID]);
    } catch {
      // nothing to cancel
    }
  }
}

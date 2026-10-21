import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { ElevationProfilePoint } from '../../api/model/elevationProfilePoint';
import { HikeRoute } from '../../api/model/hikeRoute';
import { HIKE_NAVIGATION_DRAFT_KEY, otherGpsSessionActive } from '../geo/gps-session-lock';
import { haversineMeters, polylineLengthMeters } from '../geo/geo-math';
import { LocationPermissionState, LocationTrackingService, TrackingFix } from '../geo/location-tracking.service';
import { NavigationEvent, NavigationProgress, advanceNavigation, initialNavigationProgress, nextTurn } from '../geo/route-navigation';
import { RemainingRoute, RouteLine, remainingRoute, routeLine } from '../geo/route-progress';
import { TrackBufferService } from '../geo/track-buffer';
import { RouteTurn, routeTurns, simplifiedIndexes } from '../geo/turn-instructions';
import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { SpeechService } from '../speech/speech.service';
import { uuidV4 } from '../sync/uuid';
import { trackSegments } from './bike-live-session.service';
import { HikeRouteRepository } from './hike-route.repository';
import { RouteMetricsRepository } from './route-metrics.repository';

/**
 * backlog/106 — the one in-progress hike **navigation** (along a saved route) or **recording** (no
 * planned route): live GPS position, the recorded track, and — with a planned route — progress, the
 * next turn, off-route warnings and the arrival, announced by voice (`SpeechService`), vibration and,
 * for leaving the route, a local notification (so it reaches a walker with the screen locked).
 *
 * Fully on the device (Backend-offline first): the planned line, the turns and the progress live in a
 * `Preferences` draft, the raw points in `TrackBufferService` (`hike`) — the same split as
 * `BikeLiveSessionService`, and like it the session resumes its GPS feed after an app kill. Only the
 * saved recording (a `HikeRoute`, through the outbox) is synced.
 */

/** The planned route, copied into the draft at the start: a later edit or delete of the route does not disturb the hike. */
export interface HikeNavigationPlan {
  routeId: string;
  name: string;
  coordinates: number[][];
  elevationProfile: ElevationProfilePoint[] | null;
  elevationGainMeters: number | null;
  /** Computed once at the start (the trail network along the route is not needed again after a restart). */
  turns: RouteTurn[];
}

export interface HikeNavigationDraft {
  /** Client UUID the recording is saved under. */
  sessionId: string;
  /** `null` = recording without a planned route. */
  plan: HikeNavigationPlan | null;
  startedAtMs: number;
  /** Non-null while paused. */
  pausedAtMs: number | null;
  pausedTotalMs: number;
  /** Track-buffer index where each recording segment starts (a pause → resume opens a new one). */
  segmentStarts: number[];
  /** Set by "Befejezés"; null while live. */
  endedAtMs: number | null;
  /** Navigation only. */
  progress: NavigationProgress | null;
}

export interface HikeRecordingSummary {
  sessionId: string;
  startedAtMs: number;
  /** The planned route's name, for the default name of the recording; `null` for a free recording. */
  plannedName: string | null;
  durationMinutes: number;
  distanceMeters: number;
  /** The recorded line to save; `null` when fewer than two points were recorded (nothing to save). */
  coordinates: number[][] | null;
}

export type HikeNavigationStartResult = { status: 'started' } | { status: 'permission-denied' } | { status: 'gps-busy' };

const TRACK_SESSION_KIND = 'hike';
/** Our own ongoing notification while paused (while recording, the GPS plugin's foreground-service notification plays this role). */
export const HIKE_NAVIGATION_NOTIFICATION_ID = 424_244;
/** "Letértél az útvonalról": shown on leaving the route, removed on getting back. */
export const HIKE_OFF_ROUTE_NOTIFICATION_ID = 424_245;
const CHANNEL_ID = 'lm2-default';
export const HIKE_NAVIGATION_ROUTE = '/tabs/menu/tura';
/** The recorded line is simplified with this tolerance before saving — the raw points are every few metres. */
export const RECORDING_SIMPLIFY_TOLERANCE_METERS = 3;
/** Spoken distances are rounded to this step ("150 méter múlva", not "147"). */
const SPOKEN_DISTANCE_STEP_METERS = 10;

export function hikeActiveElapsedMs(draft: HikeNavigationDraft, nowMs: number): number {
  const endMs = draft.endedAtMs ?? draft.pausedAtMs ?? nowMs;
  return Math.max(0, endMs - draft.startedAtMs - draft.pausedTotalMs);
}

/** The recorded segments joined into one line and simplified; `null` below two points. */
export function recordedLine(points: readonly TrackingFix[], segmentStarts: readonly number[]): number[][] | null {
  const joined = ([] as number[][]).concat(...trackSegments(points, segmentStarts));
  if (joined.length < 2) {
    return null;
  }
  const kept = new Set([0, joined.length - 1, ...simplifiedIndexes(joined, RECORDING_SIMPLIFY_TOLERANCE_METERS)]);
  return joined.filter((_, index) => kept.has(index));
}

@Injectable({ providedIn: 'root' })
export class HikeNavigationService {
  private readonly location = inject(LocationTrackingService);
  private readonly track = inject(TrackBufferService);
  private readonly speech = inject(SpeechService);
  private readonly notifications = inject(LocalNotificationsGateway);
  private readonly translate = inject(TranslateService);
  private readonly hikeRoutes = inject(HikeRouteRepository);
  private readonly metrics = inject(RouteMetricsRepository);

  readonly draft = signal<HikeNavigationDraft | null>(null);
  readonly active = computed(() => this.draft() !== null);
  readonly paused = computed(() => this.draft()?.pausedAtMs != null);
  readonly finished = computed(() => this.draft()?.endedAtMs != null);
  readonly plan = computed(() => this.draft()?.plan ?? null);
  /** The latest accepted fix, `[lon, lat]`. */
  readonly position = signal<[number, number] | null>(null);
  /** The recorded track so far, for the map — one polyline per recording segment. */
  readonly recordedSegments = signal<number[][][]>([]);
  readonly recordedMeters = signal(0);
  readonly weakSignal = this.location.weakSignal;

  readonly progress = computed(() => this.draft()?.progress ?? null);
  readonly offRoute = computed(() => this.progress()?.offRoute ?? false);
  readonly arrived = computed(() => this.progress()?.arrived ?? false);
  readonly nextTurn = computed(() => {
    const plan = this.plan();
    const progress = this.progress();
    return plan === null || progress === null || !progress.located ? null : nextTurn(plan.turns, progress.progressMeters);
  });
  readonly remaining = computed<RemainingRoute | null>(() => {
    const plan = this.plan();
    const line = this.line();
    const progress = this.progress();
    if (plan === null || line === null || progress === null) {
      return null;
    }
    return remainingRoute(line, progress.progressMeters, plan.elevationProfile, plan.elevationGainMeters);
  });

  private readonly line = computed<RouteLine | null>(() => {
    const plan = this.plan();
    return plan === null ? null : routeLine(plan.coordinates);
  });
  private loadedSessionId: string | null = null;

  /**
   * Re-reads the persisted draft and its track — call on entry to the Túra page. A session that was
   * recording when the app was killed resumes its GPS feed here.
   */
  async refresh(): Promise<HikeNavigationDraft | null> {
    const stored = await Preferences.get({ key: HIKE_NAVIGATION_DRAFT_KEY });
    const draft = stored.value ? (JSON.parse(stored.value) as HikeNavigationDraft) : null;
    this.draft.set(draft);
    if (draft === null) {
      this.resetTrackSignals();
      return null;
    }
    // only after a restart: mid-hike the in-memory buffer is ahead of the persisted one (batched flush)
    if (this.loadedSessionId !== draft.sessionId) {
      const points = await this.track.restore(TRACK_SESSION_KIND);
      this.updateTrackSignals(points, draft.segmentStarts);
      this.loadedSessionId = draft.sessionId;
    }
    if (draft.pausedAtMs === null && draft.endedAtMs === null && !this.location.tracking()) {
      await this.startGps(draft);
    }
    return draft;
  }

  /**
   * "Navigáció indítása" (`route`) or "Túra felvétele" (`null`). `trails` — the trail lines around the
   * route, when known — keeps the turns to junctions (see `routeTurns`). At most one session: an
   * existing one is kept, and a running bike ride holds the GPS (`gps-busy`).
   */
  async start(
    route: HikeRoute | null,
    trails: readonly (readonly (readonly number[])[])[] | null,
    nowMs: number = Date.now(),
  ): Promise<HikeNavigationStartResult> {
    if ((await this.refresh()) !== null) {
      return { status: 'started' };
    }
    if (await otherGpsSessionActive('hike')) {
      return { status: 'gps-busy' };
    }
    const permission: LocationPermissionState = await this.location.requestPermission(
      this.translate.instant('TURA.NAVIGATION.NOTIFICATION_TITLE'),
      this.translate.instant('TURA.NAVIGATION.NOTIFICATION_BODY'),
    );
    if (permission !== 'granted') {
      return { status: 'permission-denied' };
    }
    await this.track.restore(TRACK_SESSION_KIND);
    await this.track.clear();
    const draft: HikeNavigationDraft = {
      sessionId: uuidV4(),
      plan: route === null ? null : this.planOf(route, trails),
      startedAtMs: nowMs,
      pausedAtMs: null,
      pausedTotalMs: 0,
      segmentStarts: [0],
      endedAtMs: null,
      progress: route === null ? null : initialNavigationProgress(),
    };
    this.resetTrackSignals();
    this.loadedSessionId = draft.sessionId;
    await this.write(draft);
    try {
      await this.startGps(draft);
    } catch {
      // e.g. location services switched off: no navigation without GPS — explain like a denial
      await this.clear();
      return { status: 'permission-denied' };
    }
    return { status: 'started' };
  }

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
    const draft: HikeNavigationDraft = {
      ...current,
      pausedAtMs: null,
      pausedTotalMs: current.pausedTotalMs + Math.max(0, nowMs - current.pausedAtMs),
      segmentStarts: [...current.segmentStarts, this.track.current().length],
    };
    await this.write(draft);
    await this.cancelNotification(HIKE_NAVIGATION_NOTIFICATION_ID);
    await this.startGps(draft);
  }

  /** "Befejezés": stops the GPS and freezes the end time; the summary comes next. */
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
    await this.cancelNotification(HIKE_NAVIGATION_NOTIFICATION_ID);
    await this.cancelNotification(HIKE_OFF_ROUTE_NOTIFICATION_ID);
    await this.speech.stop();
  }

  summary(nowMs: number = Date.now()): HikeRecordingSummary | null {
    const draft = this.draft();
    if (draft === null) {
      return null;
    }
    return {
      sessionId: draft.sessionId,
      startedAtMs: draft.startedAtMs,
      plannedName: draft.plan?.name ?? null,
      durationMinutes: Math.max(1, Math.round(hikeActiveElapsedMs(draft, nowMs) / 60_000)),
      distanceMeters: this.recordedMeters(),
      coordinates: recordedLine(this.track.current(), draft.segmentStarts),
    };
  }

  /**
   * Saves the recording under `name` as a `HikeRoute` (Útvonalaim), with the metrics computed on the
   * device like for a drawn route, then drops the session. `null` when there is nothing to save.
   */
  async save(name: string): Promise<HikeRoute | null> {
    const summary = this.summary();
    if (summary === null || summary.coordinates === null) {
      return null;
    }
    const metrics = await this.metrics.compute(summary.coordinates);
    const saved = await this.hikeRoutes.save({
      id: summary.sessionId,
      name,
      coordinates: summary.coordinates,
      distanceMeters: metrics.distanceMeters,
      elevationGainMeters: metrics.elevationGainMeters ?? undefined,
      elevationLossMeters: metrics.elevationLossMeters ?? undefined,
      estimatedDurationMinutes: metrics.estimatedDurationMinutes ?? undefined,
      elevationProfile: metrics.profile ?? undefined,
    });
    await this.clear();
    return saved;
  }

  /** Saved or discarded: drops the draft, the raw points and the notifications. */
  async clear(): Promise<void> {
    if (this.location.tracking()) {
      await this.location.stop();
    }
    this.draft.set(null);
    this.resetTrackSignals();
    this.loadedSessionId = null;
    await this.track.restore(TRACK_SESSION_KIND);
    await this.track.clear();
    await Preferences.remove({ key: HIKE_NAVIGATION_DRAFT_KEY });
    await this.cancelNotification(HIKE_NAVIGATION_NOTIFICATION_ID);
    await this.cancelNotification(HIKE_OFF_ROUTE_NOTIFICATION_ID);
    await this.speech.stop();
  }

  private planOf(route: HikeRoute, trails: readonly (readonly (readonly number[])[])[] | null): HikeNavigationPlan {
    return {
      routeId: route.id,
      name: route.name,
      coordinates: route.coordinates,
      elevationProfile: route.elevationProfile ?? null,
      elevationGainMeters: route.elevationGainMeters ?? null,
      turns: routeTurns(routeLine(route.coordinates), trails),
    };
  }

  private async startGps(draft: HikeNavigationDraft): Promise<void> {
    const segmentStart = draft.segmentStarts[draft.segmentStarts.length - 1];
    await this.location.start(
      this.translate.instant('TURA.NAVIGATION.NOTIFICATION_TITLE'),
      this.translate.instant('TURA.NAVIGATION.NOTIFICATION_BODY'),
      (fix) => void this.onFix(fix, segmentStart),
    );
  }

  private async onFix(fix: TrackingFix, segmentStart: number): Promise<void> {
    const points = this.track.current();
    const previous = points.length > segmentStart ? points[points.length - 1] : null;
    await this.track.append(fix);
    this.position.set([fix.lon, fix.lat]);
    if (previous !== null) {
      this.recordedMeters.update((meters) => meters + haversineMeters(previous.lon, previous.lat, fix.lon, fix.lat));
    }
    this.recordedSegments.update((segments) => {
      const next = segments.length === this.draft()?.segmentStarts.length ? segments : [...segments, []];
      const last = next[next.length - 1];
      return [...next.slice(0, -1), [...last, [fix.lon, fix.lat]]];
    });

    const draft = this.draft();
    const line = this.line();
    if (draft === null || draft.plan === null || draft.progress === null || line === null) {
      return;
    }
    const step = advanceNavigation(line, draft.plan.turns, draft.progress, [fix.lon, fix.lat]);
    const changed =
      step.events.length > 0 || step.progress.located !== draft.progress.located || step.progress.offRouteStreak !== draft.progress.offRouteStreak;
    const next = { ...draft, progress: step.progress };
    if (changed) {
      await this.write(next); // the announcements made must survive a restart; plain progress need not (the next fix re-locates)
    } else {
      this.draft.set(next);
    }
    for (const event of step.events) {
      await this.announce(event);
    }
  }

  private async announce(event: NavigationEvent): Promise<void> {
    void this.speech.speak(this.spokenText(event));
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    switch (event.type) {
      case 'OFF_ROUTE':
        void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
        await this.showOffRouteNotification(event.offsetMeters);
        break;
      case 'BACK_ON_ROUTE':
        await this.cancelNotification(HIKE_OFF_ROUTE_NOTIFICATION_ID);
        break;
      case 'TURN':
        void Haptics.impact({ style: event.phase === 'NEAR' ? ImpactStyle.Heavy : ImpactStyle.Light }).catch(() => undefined);
        break;
      case 'ARRIVED':
        void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
        break;
    }
  }

  private spokenText(event: NavigationEvent): string {
    switch (event.type) {
      case 'TURN': {
        const direction = this.translate.instant(`TURA.NAVIGATION.SAY_DIRECTION.${event.turn.direction}`);
        return event.phase === 'NEAR'
          ? this.translate.instant('TURA.NAVIGATION.SAY.TURN_NEAR', { direction })
          : this.translate.instant('TURA.NAVIGATION.SAY.TURN_FAR', {
              direction,
              distance: Math.max(SPOKEN_DISTANCE_STEP_METERS, Math.round(event.distanceMeters / SPOKEN_DISTANCE_STEP_METERS) * SPOKEN_DISTANCE_STEP_METERS),
            });
      }
      case 'OFF_ROUTE':
        return this.translate.instant('TURA.NAVIGATION.SAY.OFF_ROUTE');
      case 'BACK_ON_ROUTE':
        return this.translate.instant('TURA.NAVIGATION.SAY.BACK_ON_ROUTE');
      case 'ARRIVED':
        return this.translate.instant('TURA.NAVIGATION.SAY.ARRIVED');
    }
  }

  private updateTrackSignals(points: readonly TrackingFix[], segmentStarts: readonly number[]): void {
    const segments = trackSegments(points, segmentStarts);
    this.recordedSegments.set(segments);
    this.recordedMeters.set(segments.reduce((sum, segment) => sum + polylineLengthMeters(segment), 0));
    const last = points[points.length - 1];
    this.position.set(last === undefined ? null : [last.lon, last.lat]);
  }

  private resetTrackSignals(): void {
    this.recordedSegments.set([]);
    this.recordedMeters.set(0);
    this.position.set(null);
  }

  private async write(draft: HikeNavigationDraft): Promise<void> {
    this.draft.set(draft);
    await Preferences.set({ key: HIKE_NAVIGATION_DRAFT_KEY, value: JSON.stringify(draft) });
  }

  private async showPausedNotification(draft: HikeNavigationDraft): Promise<void> {
    const startedAt = new Date(draft.startedAtMs);
    const time = `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`;
    await this.showNotification(
      HIKE_NAVIGATION_NOTIFICATION_ID,
      this.translate.instant('TURA.NAVIGATION.PAUSED_NOTIFICATION_TITLE'),
      this.translate.instant('TURA.NAVIGATION.PAUSED_NOTIFICATION_BODY', { time }),
      true,
    );
  }

  private async showOffRouteNotification(offsetMeters: number): Promise<void> {
    await this.showNotification(
      HIKE_OFF_ROUTE_NOTIFICATION_ID,
      this.translate.instant('TURA.NAVIGATION.OFF_ROUTE_NOTIFICATION_TITLE'),
      this.translate.instant('TURA.NAVIGATION.OFF_ROUTE_NOTIFICATION_BODY', { distance: Math.round(offsetMeters) }),
      false,
    );
  }

  /** Native only; a missing permission or a plugin error never disturbs the hike. Re-scheduling the same id replaces the shown one. */
  private async showNotification(id: number, title: string, body: string, ongoing: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      if ((await this.notifications.checkPermissions()).display !== 'granted') {
        return;
      }
      await this.notifications.schedule({
        notifications: [
          {
            id,
            channelId: CHANNEL_ID,
            title,
            body,
            ongoing,
            // shown now, not timed: the plugin's exact default would redirect to the "Alarms & reminders" settings
            isExactNotification: false,
            autoCancel: !ongoing,
            extra: { route: HIKE_NAVIGATION_ROUTE },
          },
        ],
      });
    } catch {
      // the hike itself never depends on the notification
    }
  }

  private async cancelNotification(id: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await this.notifications.cancelIds([id]);
      // an already shown notification stays on screen after `cancel` alone
      await this.notifications.removeDeliveredIds([id]);
    } catch {
      // nothing to cancel
    }
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { ClimbingSession } from '../../api/model/climbingSession';
import { CLIMBING_CONTEXTS, ClimbingContextKey } from '../../pages/workout/climbing/climbing-contexts';
import { today } from '../../shared/local-date';
import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { ClimbingSessionDraft } from '../storage/storage-backend';
import { uuidV4 } from '../sync/uuid';

/**
 * backlog/122 — the one in-progress **live** climbing session ("Start session" → live screen →
 * "Session vége" → editable summary → approve). Like the workout's `WorkoutDraftService` it is **not**
 * an outbox row: only the approved summary is saved through `ClimbingSessionRepository` (local store +
 * outbox). Until then it is device-local state in `@capacitor/preferences` (localStorage on web), so
 * an app kill / restart loses at most the last autosave tick.
 */
export interface ClimbingLiveDraft {
  contextKey: ClimbingContextKey;
  /** `Date.now()` at "Start session" (editable on the summary). */
  startedAtMs: number;
  /** Set by "Session vége" (defaults to that moment, editable on the summary); null while live. */
  endedAtMs: number | null;
  /** The latest form snapshot; `session.id` is the client UUID the approved session is saved under. */
  session: ClimbingSessionDraft;
}

const PREFERENCES_KEY = 'lm2_climbing_live_draft';
/** Fixed id of the ongoing "session in progress" notification — outside the scheduler's registry, so its reconcile never touches it. */
export const CLIMBING_LIVE_NOTIFICATION_ID = 424_242;
const CHANNEL_ID = 'lm2-default';

export function liveRoute(contextKey: ClimbingContextKey): string {
  return `/tabs/workout/climbing/${contextKey}/live`;
}

@Injectable({ providedIn: 'root' })
export class ClimbingLiveSessionService {
  private readonly notifications = inject(LocalNotificationsGateway);
  private readonly translate = inject(TranslateService);

  readonly draft = signal<ClimbingLiveDraft | null>(null);
  readonly hasDraft = computed(() => this.draft() !== null);

  /** Re-reads the persisted draft — call on entry to any screen that shows it. */
  async refresh(): Promise<ClimbingLiveDraft | null> {
    const stored = await Preferences.get({ key: PREFERENCES_KEY });
    const draft = stored.value ? (JSON.parse(stored.value) as ClimbingLiveDraft) : null;
    this.draft.set(draft);
    return draft;
  }

  /**
   * "Start session": a fresh draft for the context (at most one at a time — an existing one is kept
   * and returned instead), plus the ongoing phone notification.
   */
  async start(contextKey: ClimbingContextKey, nowMs: number = Date.now()): Promise<ClimbingLiveDraft> {
    const existing = await this.refresh();
    if (existing !== null) {
      return existing;
    }
    const context = CLIMBING_CONTEXTS.find((ctx) => ctx.key === contextKey)!;
    const draft: ClimbingLiveDraft = {
      contextKey,
      startedAtMs: nowMs,
      endedAtMs: null,
      session: {
        id: uuidV4(),
        date: today(),
        locationType: context.locationType as ClimbingSession.LocationTypeEnum,
        discipline: context.discipline as ClimbingSession.DisciplineEnum,
        totalSessionDurationMinutes: null,
        startedAt: new Date(nowMs).toISOString(),
        endedAt: null,
        pumpRating: null,
        headspaceRating: null,
        notes: null,
        climbingPartners: null,
        weatherConditions: [],
        gymId: null,
        gymName: null,
        cragId: null,
        cragName: null,
        attempts: [],
      },
    };
    await this.write(draft);
    await this.showOngoingNotification(draft);
    return draft;
  }

  /** Autosave of the live / summary form. */
  async saveSession(session: ClimbingSessionDraft): Promise<void> {
    const current = this.draft();
    if (current === null) {
      return;
    }
    await this.write({ ...current, session });
  }

  async setTimes(startedAtMs: number, endedAtMs: number | null): Promise<void> {
    const current = this.draft();
    if (current === null) {
      return;
    }
    await this.write({ ...current, startedAtMs, endedAtMs });
  }

  /** Approved (saved) or discarded: drop the draft and the ongoing notification. */
  async clear(): Promise<void> {
    this.draft.set(null);
    await Preferences.remove({ key: PREFERENCES_KEY });
    await this.cancelOngoingNotification();
  }

  private async write(draft: ClimbingLiveDraft): Promise<void> {
    this.draft.set(draft);
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(draft) });
  }

  /**
   * Android `ongoing` (non-swipeable) notification with the context and the start time; a tap opens
   * the live screen through the scheduler's existing `extra.route` tap handler. Native only — the web
   * build has no notification. A missing permission (or a plugin error) never blocks the session.
   */
  private async showOngoingNotification(draft: ClimbingLiveDraft): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      let permission = (await this.notifications.checkPermissions()).display;
      if (permission === 'prompt' || permission === 'prompt-with-rationale') {
        permission = (await this.notifications.requestPermissions()).display;
      }
      if (permission !== 'granted') {
        return;
      }
      const context = CLIMBING_CONTEXTS.find((ctx) => ctx.key === draft.contextKey)!;
      const startedAt = new Date(draft.startedAtMs);
      const time = `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`;
      await this.notifications.schedule({
        notifications: [
          {
            id: CLIMBING_LIVE_NOTIFICATION_ID,
            channelId: CHANNEL_ID,
            title: this.translate.instant('WORKOUT.CLIMBING.LIVE.NOTIFICATION_TITLE'),
            body: this.translate.instant('WORKOUT.CLIMBING.LIVE.NOTIFICATION_BODY', {
              context: this.translate.instant(context.labelKey),
              time,
            }),
            ongoing: true,
            autoCancel: false,
            extra: { route: liveRoute(draft.contextKey) },
          },
        ],
      });
    } catch {
      // the live session itself never depends on the notification
    }
  }

  private async cancelOngoingNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await this.notifications.cancelIds([CLIMBING_LIVE_NOTIFICATION_ID]);
    } catch {
      // nothing to cancel
    }
  }
}

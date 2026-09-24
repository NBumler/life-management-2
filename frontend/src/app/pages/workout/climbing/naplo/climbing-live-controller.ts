import { Signal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

import { ClimbingSession } from '../../../../api/model/climbingSession';
import { ClimbingLiveSessionService } from '../../../../core/data/climbing-live-session.service';
import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { ClimbingContextKey } from '../climbing-contexts';

const AUTOSAVE_MS = 1000;

/** `ClimbingSessionDraft` (the persisted live snapshot) → the `ClimbingSession` shape the edit pages already know how to load. */
export function liveDraftToSession(draft: ClimbingSessionDraft): ClimbingSession {
  return {
    ...draft,
    deleted: false,
    attempts: draft.attempts.map((attempt) => ({
      ...attempt,
      sessionId: draft.id,
      deleted: false,
      pitches: attempt.pitches.map((pitch) => ({ ...pitch, attemptId: attempt.id, deleted: false })),
    })),
  };
}

/** `ms` → the `YYYY-MM-DDTHH:mm` local value an `<ion-input type="datetime-local">` shows. */
export function toLocalInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Inverse of {@link toLocalInputValue}; null for an empty / unparseable value. */
export function fromLocalInputValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Whole minutes between two instants, at least 1 (a session is never 0 minutes long). */
export function liveDurationMinutes(startedAtMs: number, endedAtMs: number): number {
  return Math.max(1, Math.round((endedAtMs - startedAtMs) / 60_000));
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h > 0 ? `${h}:` : ''}${pad(m)}:${pad(s)}`;
}

/**
 * backlog/122 — the live-session half of a climbing kontextus-napló page. The same four edit pages
 * serve the post-hoc form and — on the `<ctx>/live` route — the live session: the page keeps owning its
 * form / attempt rows, this controller owns the rest (resume after an app kill, a 1 s autosave into
 * `ClimbingLiveSessionService` (plus an immediate flush when the page is hidden), the stopwatch, "Session vége" → editable summary with start / end,
 * approve / discard). Created in a field initializer, so `inject()` works; `destroy()` from
 * `ngOnDestroy`.
 */
export class ClimbingLiveController {
  private readonly service = inject(ClimbingLiveSessionService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  /** True on the `<ctx>/live` route (route data `live: true`). */
  readonly isLive: boolean = inject(ActivatedRoute).snapshot.data?.['live'] === true;

  readonly startedAtMs = signal(0);
  readonly endedAtMs = signal<number | null>(null);
  readonly nowMs = signal(Date.now());
  /** "Session vége" was tapped — the page shows the editable summary instead of the live screen. */
  readonly summary: Signal<boolean> = computed(() => this.endedAtMs() !== null);
  readonly elapsedLabel = computed(() => formatElapsed((this.endedAtMs() ?? this.nowMs()) - this.startedAtMs()));
  readonly durationMinutes = computed(() => liveDurationMinutes(this.startedAtMs(), this.endedAtMs() ?? this.nowMs()));
  readonly startInput = computed(() => toLocalInputValue(this.startedAtMs()));
  readonly endInput = computed(() => (this.endedAtMs() === null ? '' : toLocalInputValue(this.endedAtMs()!)));
  readonly timesInvalid = computed(() => this.endedAtMs() !== null && this.endedAtMs()! < this.startedAtMs());

  private timer: ReturnType<typeof setInterval> | null = null;
  /** Hidden page (screen lock, app to background): timers get throttled or paused, so flush right away. */
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      void this.autosave();
    } else {
      this.nowMs.set(Date.now());
    }
  };
  private lastSaved = '';
  private snapshot: (() => ClimbingSessionDraft) | null = null;

  constructor(private readonly contextKey: ClimbingContextKey) {}

  private get listUrl(): string {
    return `/tabs/workout/climbing/${this.contextKey}`;
  }

  /**
   * Loads the persisted live draft of this context. Returns the session to load into the page, or
   * null (after navigating back to the list) when there is no live session of this context.
   */
  async resume(): Promise<ClimbingSession | null> {
    const draft = await this.service.refresh();
    if (draft === null || draft.contextKey !== this.contextKey) {
      await this.router.navigateByUrl(this.listUrl);
      return null;
    }
    this.startedAtMs.set(draft.startedAtMs);
    this.endedAtMs.set(draft.endedAtMs);
    this.lastSaved = JSON.stringify(draft.session);
    return liveDraftToSession(draft.session);
  }

  /** Starts the stopwatch + autosave; `snapshot` is the page's own `buildDraft()`. */
  startAutosave(snapshot: () => ClimbingSessionDraft, onTick?: () => void): void {
    this.snapshot = snapshot;
    this.timer = setInterval(() => {
      this.nowMs.set(Date.now());
      onTick?.();
      void this.autosave();
    }, AUTOSAVE_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  async autosave(): Promise<void> {
    if (this.snapshot === null) {
      return;
    }
    const session = this.snapshot();
    const json = JSON.stringify(session);
    if (json !== this.lastSaved) {
      this.lastSaved = json;
      await this.service.saveSession(session);
    }
  }

  /** In live mode the page's draft carries the live id, start / end and the derived duration. */
  decorate(draft: ClimbingSessionDraft): ClimbingSessionDraft {
    if (!this.isLive) {
      return draft;
    }
    const ended = this.endedAtMs();
    return {
      ...draft,
      startedAt: new Date(this.startedAtMs()).toISOString(),
      endedAt: ended === null ? null : new Date(ended).toISOString(),
      totalSessionDurationMinutes: this.durationMinutes(),
    };
  }

  /** "Session vége": the end defaults to now; the summary makes everything editable. */
  async endSession(): Promise<void> {
    const now = Date.now();
    this.nowMs.set(now);
    this.endedAtMs.set(now);
    await this.service.setTimes(this.startedAtMs(), now);
    await this.autosave();
  }

  /** Back from the summary to the live screen (the end time is dropped again). */
  async resumeLive(): Promise<void> {
    this.endedAtMs.set(null);
    await this.service.setTimes(this.startedAtMs(), null);
  }

  async setStart(value: string | null | undefined): Promise<void> {
    const ms = fromLocalInputValue(value);
    if (ms !== null) {
      this.startedAtMs.set(ms);
      await this.service.setTimes(ms, this.endedAtMs());
    }
  }

  async setEnd(value: string | null | undefined): Promise<void> {
    const ms = fromLocalInputValue(value);
    if (ms !== null) {
      this.endedAtMs.set(ms);
      await this.service.setTimes(this.startedAtMs(), ms);
    }
  }

  /** After the approved session was saved through the repository: drop the draft + notification. */
  async finish(): Promise<void> {
    this.stop();
    await this.service.clear();
  }

  async discard(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('WORKOUT.CLIMBING.LIVE.DISCARD_CONFIRM_TITLE'),
      message: this.translate.instant('WORKOUT.CLIMBING.LIVE.DISCARD_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('WORKOUT.CLIMBING.LIVE.DISCARD'),
          role: 'destructive',
          handler: () => void this.discardNow(),
        },
      ],
    });
    await alert.present();
  }

  async discardNow(): Promise<void> {
    this.stop();
    await this.service.clear();
    await this.router.navigateByUrl(this.listUrl);
  }

  /** `ngOnDestroy`: stop ticking, flush the last edit. */
  destroy(): void {
    if (this.timer !== null) {
      void this.autosave();
    }
    this.stop();
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.snapshot = null;
  }
}

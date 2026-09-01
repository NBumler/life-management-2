import { Injectable, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import { today } from '../../shared/local-date';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { AuthSessionService } from '../session/auth-session.service';
import { HealthConnectStepSource } from './health-connect-step-source.service';
import { PENDING_NATIVE_STEP_PREFIX, datesNeedingBackfill, drainPendingNativeStepReadings } from './step-sync-plan';

const LAST_SYNC_KEY = 'steps.lastHealthConnectSyncAt';
const BACKFILL_LOOKBACK_DAYS = 7;

export type StepSyncPermission = 'unknown' | 'unavailable' | 'granted' | 'denied';

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md — pulls the step
 * count from Android Health Connect so a forgotten manual entry still lands.
 *
 * Runs on **app open** (cold start + every `resume`): today's count, plus a self-healing backfill
 * over the last 7 calendar days for any day with no local `DailyStepLog` row yet. Every write goes
 * through {@link DailyStepLogRepository.maxWinsUpsert}, so a Health Connect reading only ever raises
 * a stored value, never lowers a manual one.
 *
 * The literal 08:00 background worker from the spec is **not** implemented in this round (no
 * background-runner dependency; a separate JS context with no Angular DI). The app-open backfill is
 * the safety net that makes a missed run recoverable — documented as deferred, like the Naptár
 * swipe gesture.
 */
@Injectable({ providedIn: 'root' })
export class ActivityStepSyncService {
  private readonly source = inject(HealthConnectStepSource);
  private readonly repository = inject(DailyStepLogRepository);
  private readonly authSession = inject(AuthSessionService);

  readonly permission = signal<StepSyncPermission>('unknown');
  /**
   * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — the
   * READ_HEALTH_DATA_IN_BACKGROUND grant the 20:00 STEPS_LOW worker needs. Only ever `granted` while
   * {@link permission} is also `granted`.
   */
  readonly backgroundPermission = signal<StepSyncPermission>('unknown');
  readonly lastSyncAt = signal<string | null>(null);
  private running = false;
  private resumeListenerBound = false;

  /**
   * Cold-start hook (fire-and-forget from main.ts, like SyncEngine.init) **and** post-login hook
   * (LoginPage) — so Health Connect sync starts for a user who logged in after a logged-out cold
   * start. Idempotent: the `resume` listener is registered at most once. Never blocks first render.
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.permission.set('unavailable');
      this.backgroundPermission.set('unavailable');
      return;
    }
    this.lastSyncAt.set((await Preferences.get({ key: LAST_SYNC_KEY })).value ?? null);

    if (!(await this.source.isAvailable())) {
      this.permission.set('unavailable');
      this.backgroundPermission.set('unavailable');
      return;
    }
    await this.refreshPermission();

    if (!this.resumeListenerBound) {
      this.resumeListenerBound = true;
      void App.addListener('resume', () => void this.resumeSync());
    }
    void this.syncNow();
  }

  /**
   * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md "Engedélykérés UI":
   * prompt for READ_STEPS; on grant, sync immediately.
   */
  async requestPermission(): Promise<void> {
    if (this.permission() === 'unavailable') {
      return;
    }
    const granted = await this.source.requestPermission();
    this.permission.set(granted ? 'granted' : 'denied');
    if (!granted) {
      this.backgroundPermission.set('denied');
      return;
    }
    this.backgroundPermission.set((await this.source.hasBackgroundPermission()) ? 'granted' : 'denied');
    await this.syncNow();
  }

  /**
   * `resume` handler: re-probe the grant first — the user may have enabled READ_STEPS from the
   * system Health Connect settings while the app was backgrounded (the common path), not via the
   * in-app button — then run the normal sync.
   */
  private async resumeSync(): Promise<void> {
    await this.refreshPermission();
    await this.syncNow();
  }

  /**
   * Re-reads the live READ_STEPS grant into {@link permission} and the background-read grant into
   * {@link backgroundPermission}. No-op once the device is `unavailable`.
   */
  private async refreshPermission(): Promise<void> {
    if (this.permission() === 'unavailable') {
      return;
    }
    const granted = await this.source.hasPermission();
    this.permission.set(granted ? 'granted' : 'denied');
    // Background access is meaningless without the foreground grant — don't even probe it then.
    this.backgroundPermission.set(
      granted ? ((await this.source.hasBackgroundPermission()) ? 'granted' : 'denied') : 'denied',
    );
  }

  /**
   * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — prompt for the
   * Health Connect background-read permission (Steps screen). Requires the foreground READ_STEPS
   * grant first; on denial the STEPS_LOW notification stays app-open-only.
   */
  async requestBackgroundPermission(): Promise<void> {
    if (this.permission() !== 'granted' || this.backgroundPermission() === 'unavailable') {
      return;
    }
    const granted = await this.source.requestBackgroundPermission();
    this.backgroundPermission.set(granted ? 'granted' : 'denied');
  }

  /** Today + 7-day gap backfill. Safe to call repeatedly; a no-op unless permission is granted and a user is signed in. */
  async syncNow(): Promise<void> {
    if (this.permission() !== 'granted' || this.authSession.userId() === null || this.running) {
      return;
    }
    this.running = true;
    try {
      await this.repository.load();
      const todayIso = today();

      // Fold in anything the 09:00 native worker stashed (it can't write the store itself) before the
      // live read below, which can still raise those values further.
      await this.drainPendingNativeReadings();

      const todaySteps = await this.source.readDailySteps(todayIso);
      if (todaySteps !== null) {
        await this.repository.maxWinsUpsert(todayIso, todaySteps);
      }

      // Feed *every* known date — tombstoned rows included — into gap detection, so a day the user
      // deliberately deleted is not re-pulled and re-created from Health Connect on the next resume.
      const knownDates = await this.repository.allKnownDates();
      const gapDates = datesNeedingBackfill(todayIso, knownDates, BACKFILL_LOOKBACK_DAYS);
      // The reads are independent per day — one batch of native IPC round-trips, not up to 7 serial
      // ones on every app open / resume. The max-wins writes stay sequential (they read-modify the store).
      const readings = await Promise.all(gapDates.map((date) => this.source.readDailySteps(date)));
      for (let i = 0; i < gapDates.length; i += 1) {
        const steps = readings[i];
        if (steps !== null && steps > 0) {
          await this.repository.maxWinsUpsert(gapDates[i], steps);
        }
      }

      const now = new Date().toISOString();
      this.lastSyncAt.set(now);
      await Preferences.set({ key: LAST_SYNC_KEY, value: now });
    } catch (error) {
      // syncNow() is invoked fire-and-forget (main.ts, the resume listener, requestPermission) — a
      // transient SQLite/HTTP failure or a mid-logout race must not surface as an unhandled rejection.
      console.error('[steps] Health Connect sync failed', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — pick up the
   * `steps.pendingHealthConnect.<date>` readings the 09:00 native worker left behind, fold them in
   * max-wins, and clear the keys (invalid ones too, so a bad value can't wedge forever).
   */
  private async drainPendingNativeReadings(): Promise<void> {
    const { keys } = await Preferences.keys();
    const pendingKeys = keys.filter((key) => key.startsWith(PENDING_NATIVE_STEP_PREFIX));
    if (pendingKeys.length === 0) {
      return;
    }
    const entries = await Promise.all(
      pendingKeys.map(async (key) => ({ key, value: (await Preferences.get({ key })).value })),
    );
    const { readings, keysToClear } = drainPendingNativeStepReadings(entries);
    for (const { date, steps } of readings) {
      await this.repository.maxWinsUpsert(date, steps);
    }
    await Promise.all(keysToClear.map((key) => Preferences.remove({ key })));
  }
}

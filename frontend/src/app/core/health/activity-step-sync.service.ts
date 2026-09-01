import { Injectable, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import { today } from '../../shared/local-date';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { HealthConnectStepSource } from './health-connect-step-source.service';
import { datesNeedingBackfill } from './step-sync-plan';

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

  readonly permission = signal<StepSyncPermission>('unknown');
  readonly lastSyncAt = signal<string | null>(null);
  private running = false;

  /** Cold-start hook (fire-and-forget from main.ts, like SyncEngine.init). Never blocks first render. */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.permission.set('unavailable');
      return;
    }
    this.lastSyncAt.set((await Preferences.get({ key: LAST_SYNC_KEY })).value ?? null);

    if (!(await this.source.isAvailable())) {
      this.permission.set('unavailable');
      return;
    }
    this.permission.set((await this.source.hasPermission()) ? 'granted' : 'denied');

    void App.addListener('resume', () => void this.syncNow());
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
    if (granted) {
      await this.syncNow();
    }
  }

  /** Today + 7-day gap backfill. Safe to call repeatedly; a no-op unless permission is granted. */
  async syncNow(): Promise<void> {
    if (this.permission() !== 'granted' || this.running) {
      return;
    }
    this.running = true;
    try {
      await this.repository.load();
      const todayIso = today();

      const todaySteps = await this.source.readDailySteps(todayIso);
      if (todaySteps !== null) {
        await this.repository.maxWinsUpsert(todayIso, todaySteps);
      }

      const liveDates = this.repository
        .items()
        .filter((log) => !log.deleted)
        .map((log) => log.date);
      for (const date of datesNeedingBackfill(todayIso, liveDates, BACKFILL_LOOKBACK_DAYS)) {
        const steps = await this.source.readDailySteps(date);
        if (steps !== null && steps > 0) {
          await this.repository.maxWinsUpsert(date, steps);
        }
      }

      const now = new Date().toISOString();
      this.lastSyncAt.set(now);
      await Preferences.set({ key: LAST_SYNC_KEY, value: now });
    } finally {
      this.running = false;
    }
  }
}

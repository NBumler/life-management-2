import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { DailyStepLog } from '../../api/model/dailyStepLog';
import { AuthSessionService } from '../session/auth-session.service';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV5 } from '../sync/uuid';

/**
 * documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend.
 *
 * documentation/Features/Lépésszám követés.md — one `DailyStepLog` per calendar day. The id is a
 * deterministic UUID v5 of (userId, date), so two offline devices converge on the same row. The
 * overwrite policy lives here, not on the server:
 * - {@link saveManual} always wins — a manual entry overwrites the stored `stepCount` with any value,
 *   larger or smaller.
 * - {@link maxWinsUpsert} (used by the Health Connect sync, [[Lépésszám átszinkronizálása a Samsung
 *   Health-ből]]) only writes when the incoming count is strictly greater than what is stored
 *   (a missing day counts as 0).
 */
@Injectable({ providedIn: 'root' })
export class DailyStepLogRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly authSession = inject(AuthSessionService);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<DailyStepLog[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listDailyStepLogs());
    this.loaded.set(true);
  }

  /** The stored step count for `date` (a `YYYY-MM-DD` client-local calendar date), or 0 if no live row. */
  stepsForDay(date: string): number {
    return this.items().find((log) => !log.deleted && log.date === date)?.stepCount ?? 0;
  }

  /**
   * Like {@link stepsForDay} but returns `null` when there is no live row for `date` — so a form
   * can tell "no entry yet" apart from a deliberately stored 0 (both of which `stepsForDay` maps to 0).
   */
  storedStepsForDay(date: string): number | null {
    return this.items().find((log) => !log.deleted && log.date === date)?.stepCount ?? null;
  }

  /**
   * Every calendar date that has a local row, **tombstoned rows included** — the Health Connect
   * backfill ([[Lépésszám átszinkronizálása a Samsung Health-ből]]) feeds this into its gap
   * detection so a day the user deliberately deleted is not re-pulled and re-created.
   */
  allKnownDates(): Promise<string[]> {
    return this.storage.listDailyStepLogDates();
  }

  /** Manual entry — always overwrites the stored value for `date`, larger or smaller. */
  async saveManual(date: string, stepCount: number): Promise<DailyStepLog> {
    return this.upsert(date, Math.max(0, Math.round(stepCount)));
  }

  /**
   * Health Connect sync — only writes when `stepCount` is strictly greater than the stored value
   * for `date` (missing = 0). Returns the row that ends up stored (unchanged when the sync loses).
   */
  async maxWinsUpsert(date: string, stepCount: number): Promise<DailyStepLog | null> {
    const incoming = Math.max(0, Math.round(stepCount));
    if (incoming <= this.stepsForDay(date)) {
      return this.items().find((log) => !log.deleted && log.date === date) ?? null;
    }
    return this.upsert(date, incoming);
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteDailyStepLog(id);
    this.items.update((list) => list.filter((log) => log.id !== id));
    this.requestDrainIfNative();
  }

  private async upsert(date: string, stepCount: number): Promise<DailyStepLog> {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('DailyStepLogRepository: no authenticated user');
    }
    const existingId = this.items().find((log) => log.date === date)?.id;
    const id = existingId ?? (await uuidV5(`DailyStepLog:${userId}:${date}`));
    const saved = await this.storage.upsertDailyStepLog({ id, date, stepCount, deleted: false });
    this.items.update((list) => {
      const next = list.filter((log) => log.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

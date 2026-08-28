import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { AuthSessionService } from '../session/auth-session.service';
import { STORAGE_BACKEND, WeeklyPlanSlotSaveItem } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV5 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the week list `items()` serves. */
const WEEKLY_CHANGE_TYPES: ReadonlySet<string> = new Set(['WeeklyPlan', 'WeeklyPlanSlot']);

function weekSetSignature(rows: readonly WeeklyPlan[]): string {
  return rows
    .map(
      (week) =>
        `${week.id}:${week.updatedAt ?? ''}:${week.deleted ? 1 : 0}:[${week.slots
          .map((slot) => `${slot.id}:${slot.updatedAt ?? ''}:${slot.deleted ? 1 : 0}`)
          .sort()
          .join(',')}]`,
    )
    .sort()
    .join('|');
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class WeeklyPlanRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);
  private readonly authSession = inject(AuthSessionService);

  readonly items = signal<WeeklyPlan[]>([]);
  readonly loaded = signal(false);

  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesWeek = [...changed].some((type) => WEEKLY_CHANGE_TYPES.has(type));
      if (touchesWeek && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    if (this.inFlight !== null) {
      if (!options?.force) {
        return this.inFlight;
      }
      await this.inFlight.catch(() => undefined);
      if (this.inFlight !== null) {
        return this.inFlight;
      }
    }
    this.inFlight = this.readIntoSignal();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  reload(): Promise<void> {
    return this.load({ force: true });
  }

  private async readIntoSignal(): Promise<void> {
    const rows = await this.storage.listWeeklyPlans();
    const signature = weekSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set([...rows]);
    }
    this.loaded.set(true);
  }

  /** The stored week whose `weekStartDate` matches (live only), or `undefined`. */
  byWeekStart(weekStartDate: string): WeeklyPlan | undefined {
    return this.items().find((week) => !week.deleted && week.weekStartDate === weekStartDate);
  }

  /**
   * documentation/Architektúra/Backend-offline first.md §9: WeeklyPlan is natural-keyed (one row per
   * user per calendar week) → deterministic UUID v5 of (userId, weekStartDate), so two offline devices
   * editing the same week converge instead of conflicting.
   */
  async weekId(weekStartDate: string): Promise<string> {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('WeeklyPlanRepository: no authenticated user');
    }
    return uuidV5(`WeeklyPlan:${userId}:${weekStartDate}`);
  }

  /** Upsert the whole slot set for one week. Slots without an `id` get a fresh deterministic one from (weekId, dayOfWeek). */
  async saveWeek(weekStartDate: string, slots: { dayOfWeek: WeeklyPlanSlotSaveItem['dayOfWeek']; planId: string; id?: string }[]): Promise<WeeklyPlan> {
    const id = await this.weekId(weekStartDate);
    const resolvedSlots: WeeklyPlanSlotSaveItem[] = [];
    for (const slot of slots) {
      resolvedSlots.push({
        id: slot.id ?? (await uuidV5(`WeeklyPlanSlot:${id}:${slot.dayOfWeek}`)),
        dayOfWeek: slot.dayOfWeek,
        planId: slot.planId,
      });
    }
    const saved = await this.storage.saveWeeklyPlan({ id, weekStartDate, slots: resolvedSlots });
    this.items.update((list) => {
      const next = list.filter((week) => week.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : a.weekStartDate > b.weekStartDate ? -1 : 0));
      return next;
    });
    this.lastSignature = weekSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

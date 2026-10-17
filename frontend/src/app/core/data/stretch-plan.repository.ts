import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { StretchPlan } from '../../api/model/stretchPlan';
import { STORAGE_BACKEND, StretchPlanDraft } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the stretching-plan list `items()` serves. */
const STRETCH_PLAN_CHANGE_TYPES: ReadonlySet<string> = new Set(['StretchPlan', 'StretchPlanItem']);

/** Oldest first — `createdAt` asc, then `id` — matches `SqliteStorageBackend.listStretchPlans` and the backend. */
export function byStretchPlanCreation(a: StretchPlan, b: StretchPlan): number {
  const ac = a.createdAt ?? '';
  const bc = b.createdAt ?? '';
  if (ac !== bc) {
    return ac < bc ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Order-insensitive identity of the plan + item rows (id + version + tombstone), see WorkoutPlanRepository. */
function stretchPlanSetSignature(rows: readonly StretchPlan[]): string {
  return rows
    .map(
      (plan) =>
        `${plan.id}:${plan.updatedAt ?? ''}:${plan.deleted ? 1 : 0}:[${plan.items
          .map((item) => `${item.id}:${item.updatedAt ?? ''}:${item.deleted ? 1 : 0}`)
          .sort()
          .join(',')}]`,
    )
    .sort()
    .join('|');
}

/** The live items of a plan, in `orderIndex` order — what the editor, the duration and the session use. */
export function liveStretchItems(plan: StretchPlan): StretchPlan['items'] {
  return plan.items.filter((item) => !item.deleted).sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" (backlog/168): typed, signal-based facade over
 * StorageBackend for the stretching templates — the WorkoutPlanRepository mirror (no rotation fields).
 */
@Injectable({ providedIn: 'root' })
export class StretchPlanRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<StretchPlan[]>([]);
  readonly loaded = signal(false);

  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // See WorkoutPlanRepository — re-read after a delta pull; first run only primes the `tick` dependency.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touches = [...changed].some((type) => STRETCH_PLAN_CHANGE_TYPES.has(type));
      if (touches && untracked(() => this.loaded())) {
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
    const rows = [...(await this.storage.listStretchPlans())].sort(byStretchPlanCreation);
    const signature = stretchPlanSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
    this.loaded.set(true);
  }

  byId(id: string): StretchPlan | undefined {
    return this.items().find((plan) => plan.id === id);
  }

  /** Only active, non-deleted plans — what the pickers may offer (same rule as WorkoutPlanRepository.activePlans). */
  activePlans(): StretchPlan[] {
    return this.items().filter((plan) => !plan.deleted && plan.active);
  }

  /** Plan + items in one body. `draft.id` empty → a fresh UUID v4 (a create); otherwise an update of that plan. */
  async save(draft: StretchPlanDraft): Promise<StretchPlan> {
    const toSave: StretchPlanDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveStretchPlan(toSave);
    this.items.update((list) => {
      const next = list.filter((plan) => plan.id !== saved.id);
      next.push(saved);
      next.sort(byStretchPlanCreation);
      return next;
    });
    this.lastSignature = stretchPlanSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  /** Row-level toggle of `active` — a plain nested PUT that re-sends the plan's current tree. */
  async setActive(plan: StretchPlan, active: boolean): Promise<StretchPlan> {
    return this.save({
      id: plan.id,
      name: plan.name,
      notes: plan.notes ?? null,
      active,
      goalLabel: plan.goalLabel ?? null,
      items: liveStretchItems(plan).map((item) => ({
        id: item.id,
        stretchExerciseId: item.stretchExerciseId,
        stretchName: item.stretchName,
        stretchCategory: item.stretchCategory,
        orderIndex: item.orderIndex,
        holdSeconds: item.holdSeconds,
        perSide: item.perSide,
        repetitions: item.repetitions,
        notes: item.notes ?? null,
      })),
    });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteStretchPlan(id);
    this.items.update((list) => list.filter((plan) => plan.id !== id));
    this.lastSignature = stretchPlanSetSignature(this.items());
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

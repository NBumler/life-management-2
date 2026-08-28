import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { WorkoutPlan } from '../../api/model/workoutPlan';
import { STORAGE_BACKEND, WorkoutPlanDraft } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the plan list `items()` serves. */
const PLAN_CHANGE_TYPES: ReadonlySet<string> = new Set(['WorkoutPlan', 'WorkoutPlanExercise', 'WorkoutPlanSet']);

/** Oldest first — `createdAt` asc, then `id` as a stable tiebreak — matches `SqliteStorageBackend.listWorkoutPlans` and the backend's own order. */
export function byPlanCreation(a: WorkoutPlan, b: WorkoutPlan): number {
  const ac = a.createdAt ?? '';
  const bc = b.createdAt ?? '';
  if (ac !== bc) {
    return ac < bc ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Identity of a row set for "did the store actually change?" — plan id + version + tombstone, plus
 * the same triple for every exercise line and every target set. Order-insensitive so a `save()`-sorted
 * in-memory copy and a `listWorkoutPlans()` reload of the same rows hash identically.
 */
function planSetSignature(rows: readonly WorkoutPlan[]): string {
  return rows
    .map(
      (plan) =>
        `${plan.id}:${plan.updatedAt ?? ''}:${plan.deleted ? 1 : 0}:[${plan.exercises
          .map(
            (exercise) =>
              `${exercise.id}:${exercise.updatedAt ?? ''}:${exercise.deleted ? 1 : 0}(${exercise.targetSets
                .map((set) => `${set.id}:${set.updatedAt ?? ''}:${set.deleted ? 1 : 0}`)
                .sort()
                .join(',')})`,
          )
          .sort()
          .join(',')}]`,
    )
    .sort()
    .join('|');
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class WorkoutPlanRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<WorkoutPlan[]>([]);
  readonly loaded = signal(false);

  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // See WorkoutSessionRepository — re-read after a delta pull; first run only primes the `tick` dependency.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesPlan = [...changed].some((type) => PLAN_CHANGE_TYPES.has(type));
      if (touchesPlan && untracked(() => this.loaded())) {
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
    const rows = [...(await this.storage.listWorkoutPlans())].sort(byPlanCreation);
    const signature = planSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
    this.loaded.set(true);
  }

  byId(id: string): WorkoutPlan | undefined {
    return this.items().find((plan) => plan.id === id);
  }

  /** Only active, non-deleted plans — what the weekly-slot / "Terv indítása" pickers may offer (spec "Aktív / inaktív sablonok"). */
  activePlans(): WorkoutPlan[] {
    return this.items().filter((plan) => !plan.deleted && plan.active);
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": plan + exercises + target sets in
   * one body. `draft.id` empty → a fresh UUID v4 (a create); otherwise an update of that plan.
   */
  async save(draft: WorkoutPlanDraft): Promise<WorkoutPlan> {
    const toSave: WorkoutPlanDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveWorkoutPlan(toSave);
    this.items.update((list) => {
      const next = list.filter((plan) => plan.id !== saved.id);
      next.push(saved);
      next.sort(byPlanCreation);
      return next;
    });
    this.lastSignature = planSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  /** Row-level toggle of `active` — a plain nested PUT that re-sends the plan's current tree (spec: no dedicated endpoint). */
  async setActive(plan: WorkoutPlan, active: boolean): Promise<WorkoutPlan> {
    return this.save({
      id: plan.id,
      name: plan.name,
      notes: plan.notes ?? null,
      active,
      goalLabel: plan.goalLabel ?? null,
      defaultWorkoutType: plan.defaultWorkoutType ?? null,
      exercises: plan.exercises
        .filter((exercise) => !exercise.deleted)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((exercise) => ({
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          exerciseCategory: exercise.exerciseCategory,
          exerciseKind: exercise.exerciseKind,
          orderIndex: exercise.orderIndex,
          supersetGroup: exercise.supersetGroup ?? null,
          targetSets: exercise.targetSets
            .filter((set) => !set.deleted)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((set) => ({
              id: set.id,
              setType: set.setType,
              reps: set.reps ?? null,
              weightKg: set.weightKg ?? null,
              holdTimeSeconds: set.holdTimeSeconds ?? null,
              edgeSizeMm: set.edgeSizeMm ?? null,
              distanceMeters: set.distanceMeters ?? null,
              restTimeSeconds: set.restTimeSeconds ?? null,
              orderIndex: set.orderIndex,
            })),
        })),
    });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteWorkoutPlan(id);
    this.items.update((list) => list.filter((plan) => plan.id !== id));
    this.lastSignature = planSetSignature(this.items());
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

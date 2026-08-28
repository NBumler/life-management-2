import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { WorkoutSession } from '../../api/model/workoutSession';
import { STORAGE_BACKEND, WorkoutSessionDraft } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the session list `items()` serves. */
const WORKOUT_CHANGE_TYPES: ReadonlySet<string> = new Set(['WorkoutSession', 'WorkoutExerciseEntry', 'WorkoutSetEntry']);

/**
 * Newest first: `session_date` desc, then `createdAt` desc as a stable tiebreak for several sessions
 * on the same day — matches `SqliteStorageBackend.listWorkoutSessions` and the backend's own order.
 */
export function byWorkoutRecency(a: WorkoutSession, b: WorkoutSession): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  const ac = a.createdAt ?? '';
  const bc = b.createdAt ?? '';
  return ac < bc ? 1 : ac > bc ? -1 : 0;
}

/**
 * Identity of a row set for "did the store actually change?" — session id + version + tombstone, plus
 * the same triple for every exercise entry and every set (a nested-aggregate edit only bumps the
 * child rows). Order-insensitive so a `save()`-sorted in-memory copy and a `listWorkoutSessions()`
 * reload of the same rows hash identically (mirrors `recipeSetSignature`).
 */
function workoutSetSignature(rows: readonly WorkoutSession[]): string {
  return rows
    .map(
      (session) =>
        `${session.id}:${session.updatedAt ?? ''}:${session.deleted ? 1 : 0}:[${session.exercises
          .map(
            (exercise) =>
              `${exercise.id}:${exercise.updatedAt ?? ''}:${exercise.deleted ? 1 : 0}(${exercise.sets
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
export class WorkoutSessionRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<WorkoutSession[]>([]);
  readonly loaded = signal(false);

  /** See FoodRepository/RecipeRepository — native serves repeat reads from memory; web re-fetches but the signature guard still shields downstream `computed()`s. */
  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // See RecipeRepository — re-read after a delta pull; first run only primes the `tick` dependency.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesWorkout = [...changed].some((type) => WORKOUT_CHANGE_TYPES.has(type));
      if (touchesWorkout && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  /**
   * Reads the workout log (with its full exercise/set tree) into `items`. Cached on native; pass
   * `{ force: true }` to re-read after the store changed. `items` is only replaced when the row set
   * — sessions, entries or sets — actually differs.
   */
  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    if (this.inFlight !== null) {
      if (!options?.force) {
        return this.inFlight;
      }
      // See RecipeRepository — a forced post-pull reload must not ride a read queued before the pull
      // transaction committed; wait it out, then re-read from the updated store.
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

  /** Forces a re-read from the local store regardless of cache state. */
  reload(): Promise<void> {
    return this.load({ force: true });
  }

  private async readIntoSignal(): Promise<void> {
    const rows = [...(await this.storage.listWorkoutSessions())].sort(byWorkoutRecency);
    const signature = workoutSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
    this.loaded.set(true);
  }

  /** Returns the live session by id from the in-memory list, or `undefined`. */
  byId(id: string): WorkoutSession | undefined {
    return this.items().find((session) => session.id === id);
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": session + exercises + sets in one
   * body. `draft.id` empty → a fresh UUID v4 (a create); otherwise an update of that session.
   */
  async save(draft: WorkoutSessionDraft): Promise<WorkoutSession> {
    const toSave: WorkoutSessionDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveWorkoutSession(toSave);
    this.items.update((list) => {
      const next = list.filter((session) => session.id !== saved.id);
      next.push(saved);
      next.sort(byWorkoutRecency);
      return next;
    });
    this.lastSignature = workoutSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteWorkoutSession(id);
    this.items.update((list) => list.filter((session) => session.id !== id));
    this.lastSignature = workoutSetSignature(this.items());
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

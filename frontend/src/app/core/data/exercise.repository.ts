import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Exercise } from '../../api/model/exercise';
import { normalizeName } from '../../shared/name-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { byCatalogName } from './catalog-order';

/** `SyncChangeItem.entityType`s whose local rows affect the exercise catalog `items()` serves. */
const EXERCISE_CHANGE_TYPES: ReadonlySet<string> = new Set(['Exercise']);

/**
 * Identity of a row set for "did the store actually change?" — id + server version + tombstone flag.
 * Order-insensitive: `save()` sorts its in-memory copy while `listExercises()` returns SQLite
 * collation order, and the signature must match across the two so an unchanged set never looks
 * changed (mirrors `foodSetSignature` — the exercise catalog has no nested child rows).
 */
function exerciseSetSignature(rows: readonly Exercise[]): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt ?? ''}:${row.deleted ? 1 : 0}`)
    .sort()
    .join('|');
}

export interface ExerciseSaveInput {
  id?: string;
  name: string;
  category: Exercise.CategoryEnum;
  kind: Exercise.KindEnum;
  defaultRestTimeSeconds: number | null;
  isFavorite: boolean;
  equipment: string | null;
}

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live exercise already has this name. */
export class ExerciseNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('An exercise with this name already exists');
  }
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class ExerciseRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Exercise[]>([]);
  readonly loaded = signal(false);

  /**
   * See FoodRepository / RecipeRepository — native serves repeat `load()`s from the in-memory
   * signal; web always re-fetches (no delta pull to invalidate a cache), but the signature guard
   * below still spares an unchanged response from re-triggering every downstream `computed()`.
   */
  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';
  private seedAttempted = false;

  constructor() {
    // documentation/Architektúra/Backend-offline first.md §8: a delta pull that changed rows makes
    // the cached snapshot stale — re-read from the local store when it lands. The first effect run
    // only primes the `tick` dependency; every later run is a real post-pull invalidation.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesExercises = [...changed].some((type) => EXERCISE_CHANGE_TYPES.has(type));
      if (touchesExercises && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  /**
   * Reads the catalog into `items`. Both exercise pages hit this in `ngOnInit`; with `cacheEnabled`
   * the repeat calls are a no-op. Pass `{ force: true }` to bypass the cache after the store changed
   * underneath us (the `DataChangeNotifier` effect above does this). The `items` signal is only
   * replaced when the row set actually differs, so an unchanged reload doesn't invalidate
   * downstream `computed()`s or re-render the list.
   */
  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    if (this.inFlight !== null) {
      if (!options?.force) {
        return this.inFlight;
      }
      // A forced (post-pull) reload must not ride a read queued against the store *before* the pull
      // transaction committed — that would resolve with the pre-pull snapshot and leave the cache
      // stale. Wait the in-flight read out, then read again from the updated store.
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
    let rows = await this.storage.listExercises();
    if (rows.length === 0 && !this.seedAttempted) {
      this.seedAttempted = true;
      await this.seed();
      rows = await this.storage.listExercises();
    }
    const sorted = [...rows].sort(byCatalogName);
    const signature = exerciseSetSignature(sorted);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(sorted);
    }
    this.loaded.set(true);
  }

  /**
   * documentation/Architektúra/Névegyediség.md: the client pre-checks uniqueness against its own
   * already-loaded live list before writing. The server still enforces the same rule (409
   * UNIQUE_VIOLATION) for the rare genuine multi-device race this local check cannot see.
   */
  async save(input: ExerciseSaveInput): Promise<Exercise> {
    const normalized = normalizeName(input.name);
    const conflict = this.items().find((item) => item.id !== input.id && normalizeName(item.name) === normalized);
    if (conflict) {
      throw new ExerciseNameConflictError(conflict.id);
    }

    const draft: Exercise = {
      id: input.id ?? uuidV4(),
      name: input.name,
      category: input.category,
      kind: input.kind,
      defaultRestTimeSeconds: input.defaultRestTimeSeconds,
      isFavorite: input.isFavorite,
      equipment: input.equipment,
      deleted: false,
    };
    const saved = await this.storage.upsertExercise(draft);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort(byCatalogName);
      return next;
    });
    this.lastSignature = exerciseSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  /** documentation/Subfeatures/Gyakorlat.md "Kedvencek szűrő": one-tap favourite toggle from the list. */
  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const current = this.items().find((item) => item.id === id);
    if (!current || current.isFavorite === isFavorite) {
      return;
    }
    await this.save({
      id,
      name: current.name,
      category: current.category,
      kind: current.kind,
      defaultRestTimeSeconds: current.defaultRestTimeSeconds ?? null,
      isFavorite,
      equipment: current.equipment ?? null,
    });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteExercise(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.lastSignature = exerciseSetSignature(this.items());
    this.requestDrainIfNative();
  }

  /**
   * documentation/Subfeatures/Gyakorlat.md "Seed": first-run bootstrap of the built-in exercises
   * (`core/data/exercise-seed.ts`) with deterministic v5 ids so two offline devices converge on the
   * same rows instead of creating duplicates. The storage backend no-ops if the catalog is already
   * populated and resolves the current user id itself.
   */
  private async seed(): Promise<void> {
    await this.storage.seedExercises();
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

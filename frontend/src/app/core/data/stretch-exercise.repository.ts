import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { StretchExercise } from '../../api/model/stretchExercise';
import { normalizeName } from '../../shared/name-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { byCatalogName } from './catalog-order';

/** `SyncChangeItem.entityType`s whose local rows affect the stretching catalog `items()` serves. */
const STRETCH_EXERCISE_CHANGE_TYPES: ReadonlySet<string> = new Set(['StretchExercise']);

/** Order-insensitive row-set identity, same as `exerciseSetSignature` in ExerciseRepository. */
function stretchExerciseSetSignature(rows: readonly StretchExercise[]): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt ?? ''}:${row.deleted ? 1 : 0}`)
    .sort()
    .join('|');
}

export interface StretchExerciseSaveInput {
  id?: string;
  name: string;
  category: StretchExercise.CategoryEnum;
  description: string | null;
  equipment: string | null;
  isFavorite: boolean;
  defaultHoldSeconds: number;
  defaultPerSide: boolean;
}

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live stretching exercise already has this name. */
export class StretchExerciseNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A stretching exercise with this name already exists');
  }
}

/**
 * documentation/Subfeatures/Gyakorlat.md "Entitás — StretchExercise" (backlog/167): typed, signal-based
 * facade over StorageBackend for the stretching catalog — the ExerciseRepository mirror, without seed.
 * Name uniqueness is its own namespace (a strength and a stretching exercise may share a name).
 */
@Injectable({ providedIn: 'root' })
export class StretchExerciseRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<StretchExercise[]>([]);
  readonly loaded = signal(false);

  /** See ExerciseRepository — native serves repeat `load()`s from the in-memory signal; web always re-fetches. */
  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // documentation/Architektúra/Backend-offline first.md §8: re-read after a delta pull touched the table.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touches = [...changed].some((type) => STRETCH_EXERCISE_CHANGE_TYPES.has(type));
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
      // Same reasoning as ExerciseRepository.load: never resolve a forced reload with a pre-pull read.
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
    const rows = await this.storage.listStretchExercises();
    const sorted = [...rows].sort(byCatalogName);
    const signature = stretchExerciseSetSignature(sorted);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(sorted);
    }
    this.loaded.set(true);
  }

  /** documentation/Architektúra/Névegyediség.md: local pre-check; the server enforces the same rule (409). */
  async save(input: StretchExerciseSaveInput): Promise<StretchExercise> {
    const normalized = normalizeName(input.name);
    const conflict = this.items().find((item) => item.id !== input.id && normalizeName(item.name) === normalized);
    if (conflict) {
      throw new StretchExerciseNameConflictError(conflict.id);
    }

    const draft: StretchExercise = {
      id: input.id ?? uuidV4(),
      name: input.name,
      category: input.category,
      description: input.description,
      equipment: input.equipment,
      isFavorite: input.isFavorite,
      defaultHoldSeconds: input.defaultHoldSeconds,
      defaultPerSide: input.defaultPerSide,
      deleted: false,
    };
    const saved = await this.storage.upsertStretchExercise(draft);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort(byCatalogName);
      return next;
    });
    this.lastSignature = stretchExerciseSetSignature(this.items());
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
      description: current.description ?? null,
      equipment: current.equipment ?? null,
      isFavorite,
      defaultHoldSeconds: current.defaultHoldSeconds,
      defaultPerSide: current.defaultPerSide,
    });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteStretchExercise(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.lastSignature = stretchExerciseSetSignature(this.items());
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

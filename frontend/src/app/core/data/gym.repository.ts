import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Gym } from '../../api/model/gym';
import { normalizeName } from '../../shared/name-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the gym list `items()` serves. */
const GYM_CHANGE_TYPES: ReadonlySet<string> = new Set(['Gym']);

export interface GymSaveInput {
  id?: string;
  name: string;
  address: string | null;
  disciplines: Gym.DisciplinesEnum[];
  defaultWallHeightMeters: number | null;
  availableSafetyStyles: Gym.AvailableSafetyStylesEnum[] | null;
}

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live gym already has this (normalized) name. Mirrors the backend GymService.applyName pre-check. */
export class GymNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A gym with this name already exists');
  }
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class GymRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Gym[]>([]);
  readonly loaded = signal(false);

  private readonly cacheEnabled = Capacitor.isNativePlatform();

  constructor() {
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      if ([...changed].some((type) => GYM_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listGyms());
    this.loaded.set(true);
  }

  /** documentation/Architektúra/Névegyediség.md: pre-check the name against the loaded live list; the server still enforces 409 UNIQUE_VIOLATION for a genuine multi-device race. */
  async save(input: GymSaveInput): Promise<Gym> {
    const normalized = normalizeName(input.name);
    const conflict = this.items().find((gym) => gym.id !== input.id && normalizeName(gym.name) === normalized);
    if (conflict) {
      throw new GymNameConflictError(conflict.id);
    }
    // Rope-only config is meaningless without the ROPE discipline — drop it so an edit that removes
    // ROPE doesn't leave orphan values behind.
    const isRope = input.disciplines.includes(Gym.DisciplinesEnum.Rope);
    const draft: Gym = {
      id: input.id ?? uuidV4(),
      name: input.name,
      address: input.address,
      disciplines: input.disciplines,
      defaultWallHeightMeters: isRope ? input.defaultWallHeightMeters : null,
      availableSafetyStyles: isRope ? input.availableSafetyStyles : null,
      deleted: false,
    };
    const saved = await this.storage.upsertGym(draft);
    this.items.update((list) => {
      const next = list.filter((gym) => gym.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteGym(id);
    this.items.update((list) => list.filter((gym) => gym.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

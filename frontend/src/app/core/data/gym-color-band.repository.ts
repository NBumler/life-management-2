import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { GymColorBand } from '../../api/model/gymColorBand';
import { normalizeHexColor } from '../../shared/hex-color-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

const BAND_CHANGE_TYPES: ReadonlySet<string> = new Set(['GymColorBand']);

export interface GymColorBandSaveInput {
  id?: string;
  gymId: string;
  name: string;
  hexColor: string;
  variant: GymColorBand.VariantEnum;
  gradeLower: string;
  gradeUpper: string;
  absoluteDifficultyIndexLower: number;
  absoluteDifficultyIndexUpper: number;
}

/** documentation/Subfeatures/Indoor boulder admin.md "Egyedi hex validáció (a kanonikus alakon)": thrown before any write when another live band of the same gym already uses this colour. */
export class GymColorBandHexConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A colour band with this hex already exists in this gym');
  }
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class GymColorBandRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<GymColorBand[]>([]);
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
      if ([...changed].some((type) => BAND_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listGymColorBands());
    this.loaded.set(true);
  }

  /** Live bands of one gym, low grade first. */
  forGym(gymId: string): GymColorBand[] {
    return this.items()
      .filter((band) => band.gymId === gymId && !band.deleted)
      .sort((a, b) => a.absoluteDifficultyIndexLower - b.absoluteDifficultyIndexLower);
  }

  async save(input: GymColorBandSaveInput): Promise<GymColorBand> {
    const canonical = normalizeHexColor(input.hexColor);
    const conflict = this.items().find(
      (band) => band.id !== input.id && band.gymId === input.gymId && !band.deleted && normalizeHexColor(band.hexColor) === canonical,
    );
    if (conflict) {
      throw new GymColorBandHexConflictError(conflict.id);
    }
    const draft: GymColorBand = {
      id: input.id ?? uuidV4(),
      gymId: input.gymId,
      name: input.name,
      hexColor: canonical,
      variant: input.variant,
      gradeLower: input.gradeLower,
      gradeUpper: input.gradeUpper,
      absoluteDifficultyIndexLower: input.absoluteDifficultyIndexLower,
      absoluteDifficultyIndexUpper: input.absoluteDifficultyIndexUpper,
      deleted: false,
    };
    const saved = await this.storage.upsertGymColorBand(draft);
    this.items.update((list) => {
      const next = list.filter((band) => band.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteGymColorBand(id);
    this.items.update((list) => list.filter((band) => band.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

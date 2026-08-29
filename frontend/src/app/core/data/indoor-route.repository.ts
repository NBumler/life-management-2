import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { IndoorRoute } from '../../api/model/indoorRoute';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

const INDOOR_ROUTE_CHANGE_TYPES: ReadonlySet<string> = new Set(['IndoorRoute']);

export interface IndoorRouteSaveInput {
  id?: string;
  gymId: string;
  name: string;
  discipline: IndoorRoute.DisciplineEnum;
  grade: string;
  absoluteDifficultyIndex: number;
  sector: string | null;
}

/**
 * documentation/Subfeatures/Indoor köteles admin.md "IndoorRoute (opcionális)" — the optional fixed
 * indoor-route catalogue. No uniqueness rule. documentation/Architektúra/Frontend.md `core/data/`:
 * typed, signal-based facade over StorageBackend.
 */
@Injectable({ providedIn: 'root' })
export class IndoorRouteRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<IndoorRoute[]>([]);
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
      if ([...changed].some((type) => INDOOR_ROUTE_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listIndoorRoutes());
    this.loaded.set(true);
  }

  /** Live routes of one gym, by name. */
  forGym(gymId: string): IndoorRoute[] {
    return this.items()
      .filter((route) => route.gymId === gymId && !route.deleted)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(input: IndoorRouteSaveInput): Promise<IndoorRoute> {
    const draft: IndoorRoute = {
      id: input.id ?? uuidV4(),
      gymId: input.gymId,
      name: input.name,
      discipline: input.discipline,
      grade: input.grade,
      absoluteDifficultyIndex: input.absoluteDifficultyIndex,
      sector: input.sector,
      deleted: false,
    };
    const saved = await this.storage.upsertIndoorRoute(draft);
    this.items.update((list) => {
      const next = list.filter((route) => route.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteIndoorRoute(id);
    this.items.update((list) => list.filter((route) => route.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

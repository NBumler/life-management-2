import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Crag } from '../../api/model/crag';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

const CRAG_CHANGE_TYPES: ReadonlySet<string> = new Set(['Crag']);

export interface CragSaveInput {
  id?: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  defaultRockType: string | null;
}

/**
 * documentation/Subfeatures/Outdoor boulder admin.md — the root of the outdoor location tree. No
 * name-uniqueness. documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade.
 */
@Injectable({ providedIn: 'root' })
export class CragRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Crag[]>([]);
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
      if ([...changed].some((type) => CRAG_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listCrags());
    this.loaded.set(true);
  }

  async save(input: CragSaveInput): Promise<Crag> {
    const draft: Crag = {
      id: input.id ?? uuidV4(),
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      defaultRockType: input.defaultRockType,
      deleted: false,
    };
    const saved = await this.storage.upsertCrag(draft);
    this.items.update((list) => {
      const next = list.filter((crag) => crag.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteCrag(id);
    this.items.update((list) => list.filter((crag) => crag.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

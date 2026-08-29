import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Sector } from '../../api/model/sector';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

const SECTOR_CHANGE_TYPES: ReadonlySet<string> = new Set(['Sector']);

export interface SectorSaveInput {
  id?: string;
  cragId: string;
  name: string;
  defaultAspect: string | null;
}

/** documentation/Subfeatures/Outdoor boulder admin.md — a sector under a Crag. No name-uniqueness. */
@Injectable({ providedIn: 'root' })
export class SectorRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Sector[]>([]);
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
      if ([...changed].some((type) => SECTOR_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listSectors());
    this.loaded.set(true);
  }

  /** Live sectors of one crag, by name. */
  forCrag(cragId: string): Sector[] {
    return this.items()
      .filter((sector) => sector.cragId === cragId && !sector.deleted)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(input: SectorSaveInput): Promise<Sector> {
    const draft: Sector = {
      id: input.id ?? uuidV4(),
      cragId: input.cragId,
      name: input.name,
      defaultAspect: input.defaultAspect,
      deleted: false,
    };
    const saved = await this.storage.upsertSector(draft);
    this.items.update((list) => {
      const next = list.filter((sector) => sector.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteSector(id);
    this.items.update((list) => list.filter((sector) => sector.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

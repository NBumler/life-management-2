import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { HikeRoute } from '../../api/model/hikeRoute';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface HikeRouteSaveInput {
  id?: string;
  name: string;
  /** [lon, lat] pairs in drawing order — at least 2 required. */
  coordinates: number[][];
}

/**
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis. documentation/Architektúra/Frontend.md `core/data/`:
 * typed, signal-based facade over StorageBackend — flat CRUD, mirrors SwimLogRepository/RecurringExpenseRepository.
 */
@Injectable({ providedIn: 'root' })
export class HikeRouteRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<HikeRoute[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listHikeRoutes());
    this.loaded.set(true);
  }

  async save(input: HikeRouteSaveInput): Promise<HikeRoute> {
    const draft: HikeRoute = {
      id: input.id ?? uuidV4(),
      name: input.name,
      coordinates: input.coordinates,
      deleted: false,
    };
    const saved = await this.storage.upsertHikeRoute(draft);
    this.items.update((list) => {
      const next = list.filter((route) => route.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteHikeRoute(id);
    this.items.update((list) => list.filter((route) => route.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { StoredFood } from '../../api/model/storedFood';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class StoredFoodRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<StoredFood[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listStoredFoods());
    this.loaded.set(true);
  }

  async save(draft: StoredFood): Promise<StoredFood> {
    const toSave: StoredFood = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.upsertStoredFood(toSave);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteStoredFood(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { ShoppingList } from '../../api/model/shoppingList';
import { ShoppingListCompleteDraft, ShoppingListCompleteResult, ShoppingListDraft, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { StoredFoodRepository } from './stored-food.repository';

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class ShoppingListRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly storedFoodRepository = inject(StoredFoodRepository);

  readonly items = signal<ShoppingList[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listShoppingLists());
    this.loaded.set(true);
  }

  async save(draft: ShoppingListDraft): Promise<ShoppingList> {
    const toSave: ShoppingListDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveShoppingList(toSave);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteShoppingList(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.requestDrainIfNative();
  }

  /**
   * documentation/Subfeatures/Bevásárlás teljesítve.md — archives the list, creates the StoredFood
   * rows, and optionally spins off a new active list, all in one local transaction. Re-reads both
   * this repository and `StoredFoodRepository` from the local store afterward rather than
   * hand-splicing signals — the same local transaction already wrote everything, so a plain reload
   * is simplest and can't drift from what was actually persisted.
   */
  async complete(draft: ShoppingListCompleteDraft): Promise<ShoppingListCompleteResult> {
    const result = await this.storage.completeShoppingList(draft);
    await this.load();
    await this.storedFoodRepository.load();
    this.requestDrainIfNative();
    return result;
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

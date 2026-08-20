import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { GearItem } from '../../api/model/gearItem';
import { normalizeName } from '../../shared/name-normalization';
import { GearItemReferenceCounts, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live gear item already has this name. */
export class GearItemNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A gear item with this name already exists');
  }
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class GearItemRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<GearItem[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listGearItems());
    this.loaded.set(true);
  }

  /**
   * documentation/Architektúra/Névegyediség.md: the client pre-checks uniqueness against its own
   * already-loaded live list before writing, so the user sees the conflict immediately instead of
   * after a round trip. The server still enforces the same rule (409 UNIQUE_VIOLATION) for the rare
   * genuine multi-device race this local check cannot see.
   */
  async save(name: string, notes: string | null, id?: string): Promise<GearItem> {
    const normalized = normalizeName(name);
    const conflict = this.items().find((item) => item.id !== id && normalizeName(item.name) === normalized);
    if (conflict) {
      throw new GearItemNameConflictError(conflict.id);
    }

    const draft: GearItem = { id: id ?? uuidV4(), name, notes, deleted: false };
    const saved = await this.storage.upsertGearItem(draft);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteGearItem(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.requestDrainIfNative();
  }

  /** documentation/Subfeatures/Eszközök.md "Törlés UI": cascade count for the delete confirmation, `null` if not computable (web). */
  countReferences(id: string): Promise<GearItemReferenceCounts | null> {
    return this.storage.countGearItemReferences(id);
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

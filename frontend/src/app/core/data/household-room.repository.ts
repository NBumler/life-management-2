import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { HouseholdRoom } from '../../api/model/householdRoom';
import { normalizeName } from '../../shared/name-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live room already has this name. */
export class HouseholdRoomNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A room with this name already exists');
  }
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class HouseholdRoomRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<HouseholdRoom[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listHouseholdRooms());
    this.loaded.set(true);
  }

  /**
   * documentation/Architektúra/Névegyediség.md: the client pre-checks uniqueness against its own
   * already-loaded live list before writing (scope: per user).
   */
  async save(name: string, sortOrder: number, id?: string): Promise<HouseholdRoom> {
    const normalized = normalizeName(name);
    const conflict = this.items().find((room) => room.id !== id && normalizeName(room.name) === normalized);
    if (conflict) {
      throw new HouseholdRoomNameConflictError(conflict.id);
    }

    const draft: HouseholdRoom = { id: id ?? uuidV4(), name, sortOrder, deleted: false };
    const saved = await this.storage.upsertHouseholdRoom(draft);
    this.items.update((list) => {
      const next = list.filter((room) => room.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.sortOrder - b.sortOrder);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  /**
   * documentation/Subfeatures/Háztartási feladatok.md "Helyiség CRUD": manual reorder — each room is
   * its own top-level entity (no nested-aggregate save like Sablonok), so this persists one PUT per
   * changed room.
   */
  async reorder(rooms: { id: string; sortOrder: number }[]): Promise<void> {
    for (const room of rooms) {
      const existing = this.items().find((item) => item.id === room.id);
      if (existing !== undefined && existing.sortOrder !== room.sortOrder) {
        await this.save(existing.name, room.sortOrder, existing.id);
      }
    }
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteHouseholdRoom(id);
    this.items.update((list) => list.filter((room) => room.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

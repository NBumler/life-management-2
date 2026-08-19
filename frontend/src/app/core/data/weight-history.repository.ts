import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class WeightHistoryRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly entries = signal<WeightHistoryEntry[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.entries.set(await this.storage.listWeightHistory());
    this.loaded.set(true);
  }

  async add(recordedAt: string, weightKg: number): Promise<void> {
    await this.upsertAndReload({ id: uuidV4(), recordedAt, weightKg, deleted: false });
  }

  async update(id: string, recordedAt: string, weightKg: number): Promise<void> {
    await this.upsertAndReload({ id, recordedAt, weightKg, deleted: false });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteWeightHistoryEntry(id);
    this.entries.update((list) => list.filter((entry) => entry.id !== id));
    this.requestDrainIfNative();
  }

  private async upsertAndReload(draft: WeightHistoryEntry): Promise<void> {
    const saved = await this.storage.upsertWeightHistoryEntry(draft);
    this.entries.update((list) => {
      const next = list.filter((entry) => entry.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      return next;
    });
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrain();
    }
  }
}

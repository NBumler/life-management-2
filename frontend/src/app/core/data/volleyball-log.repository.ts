import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { VolleyballLog } from '../../api/model/volleyballLog';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface VolleyballLogSaveInput {
  id?: string;
  date: string;
  /** On-court minutes only (bench / waiting excluded), 1–240. */
  durationMinutes: number;
  /** Statistics only — never changes the kcal (documentation/Features/Röplabda napló.md). */
  intensity: VolleyballLog.IntensityEnum | null;
  setsPlayed: number | null;
  notes: string | null;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class VolleyballLogRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<VolleyballLog[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listVolleyballLogs());
    this.loaded.set(true);
  }

  async save(input: VolleyballLogSaveInput): Promise<VolleyballLog> {
    const notes = input.notes?.trim() ?? '';
    const draft: VolleyballLog = {
      id: input.id ?? uuidV4(),
      date: input.date,
      durationMinutes: input.durationMinutes,
      intensity: input.intensity,
      setsPlayed: input.setsPlayed,
      notes: notes === '' ? null : notes,
      deleted: false,
    };
    const saved = await this.storage.upsertVolleyballLog(draft);
    this.items.update((list) => {
      const next = list.filter((log) => log.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteVolleyballLog(id);
    this.items.update((list) => list.filter((log) => log.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

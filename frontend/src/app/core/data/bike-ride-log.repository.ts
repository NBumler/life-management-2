import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { BikeRideLog } from '../../api/model/bikeRideLog';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface BikeRideLogSaveInput {
  id?: string;
  date: string;
  durationMinutes: number;
  intensity: BikeRideLog.IntensityEnum;
  distanceKm: number | null;
  elevationGainMeters: number | null;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class BikeRideLogRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<BikeRideLog[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listBikeRideLogs());
    this.loaded.set(true);
  }

  async save(input: BikeRideLogSaveInput): Promise<BikeRideLog> {
    const id = input.id ?? uuidV4();
    const draft: BikeRideLog = {
      id,
      date: input.date,
      durationMinutes: input.durationMinutes,
      intensity: input.intensity,
      distanceKm: input.distanceKm,
      elevationGainMeters: input.elevationGainMeters,
      deleted: false,
    };
    const saved = await this.storage.upsertBikeRideLog(draft);
    this.items.update((list) => {
      const next = list.filter((log) => log.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteBikeRideLog(id);
    this.items.update((list) => list.filter((log) => log.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

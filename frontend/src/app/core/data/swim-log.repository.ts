import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { SwimLog } from '../../api/model/swimLog';
import { swimDistanceMeters } from '../../pages/workout/swimming/swim-metrics';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface SwimLogSaveInput {
  id?: string;
  date: string;
  durationMinutes: number;
  intensity: SwimLog.IntensityEnum;
  poolLengthMeters: number | null;
  lapCount: number | null;
  /** Only used for OPEN_WATER — ignored when poolLengthMeters + lapCount are both present. */
  distanceMeters: number | null;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class SwimLogRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<SwimLog[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listSwimLogs());
    this.loaded.set(true);
  }

  async save(input: SwimLogSaveInput): Promise<SwimLog> {
    const id = input.id ?? uuidV4();
    const openWater = input.intensity === SwimLog.IntensityEnum.OpenWater;
    const poolLengthMeters = openWater ? null : input.poolLengthMeters;
    const lapCount = openWater ? null : input.lapCount;
    // documentation/Features/Úszás napló.md: distance is derived from the pool pair when present,
    // otherwise the optional manual open-water value. The server re-derives the same way.
    const distanceMeters = swimDistanceMeters({
      poolLengthMeters,
      lapCount,
      distanceMeters: openWater ? input.distanceMeters : null,
    });
    const draft: SwimLog = {
      id,
      date: input.date,
      durationMinutes: input.durationMinutes,
      intensity: input.intensity,
      poolLengthMeters,
      lapCount,
      distanceMeters,
      deleted: false,
    };
    const saved = await this.storage.upsertSwimLog(draft);
    this.items.update((list) => {
      const next = list.filter((log) => log.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteSwimLog(id);
    this.items.update((list) => list.filter((log) => log.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

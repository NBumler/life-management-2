import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { LifePlan } from '../../api/model/lifePlan';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface LifePlanSaveInput {
  id?: string;
  title: string;
  notes: string | null;
  status: LifePlan.StatusEnum;
  targetDate: string | null;
}

/**
 * documentation/Subfeatures/Élet tervek.md "Állapotgép": completedAt is a pure-TS side effect of a
 * status change — set on any transition into DONE, cleared on any transition out of DONE, otherwise
 * left untouched (e.g. editing notes/targetDate while the status itself doesn't change).
 */
export function computeLifePlanCompletedAt(
  previousStatus: LifePlan.StatusEnum | null,
  newStatus: LifePlan.StatusEnum,
  previousCompletedAt: string | null,
): string | null {
  const wasDone = previousStatus === LifePlan.StatusEnum.Done;
  const isDone = newStatus === LifePlan.StatusEnum.Done;
  if (isDone && !wasDone) {
    return new Date().toISOString();
  }
  if (!isDone && wasDone) {
    return null;
  }
  return previousCompletedAt;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class LifePlanRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<LifePlan[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listLifePlans());
    this.loaded.set(true);
  }

  async save(input: LifePlanSaveInput): Promise<LifePlan> {
    const id = input.id ?? uuidV4();
    const previous = this.items().find((plan) => plan.id === id) ?? null;
    const completedAt = computeLifePlanCompletedAt(
      previous?.status ?? null,
      input.status,
      previous?.completedAt ?? null,
    );
    const draft: LifePlan = {
      id,
      title: input.title,
      notes: input.notes,
      status: input.status,
      targetDate: input.targetDate,
      completedAt,
      deleted: false,
    };
    const saved = await this.storage.upsertLifePlan(draft);
    this.items.update((list) => {
      const next = list.filter((plan) => plan.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteLifePlan(id);
    this.items.update((list) => list.filter((plan) => plan.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

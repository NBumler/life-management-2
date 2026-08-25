import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { HouseholdTask } from '../../api/model/householdTask';
import { normalizeName } from '../../shared/name-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { rollForwardHouseholdTask } from './household-occurrence';

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live task in the same room already has this name. */
export class HouseholdTaskNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A task with this name already exists in this room');
  }
}

export interface HouseholdTaskSaveInput {
  id?: string;
  roomId: string;
  name: string;
  energyLevel: HouseholdTask.EnergyLevelEnum;
  estimatedMinutes: number;
  intervalDays: number;
  nextDue: string;
  lastCompletedAt: string | null;
  notes: string | null;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class HouseholdTaskRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<HouseholdTask[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listHouseholdTasks());
    this.loaded.set(true);
  }

  /**
   * documentation/Architektúra/Névegyediség.md: the client pre-checks uniqueness against its own
   * already-loaded live list before writing — scope is the *room*, not the user, so moving a task to
   * another room re-checks against the target room.
   */
  async save(input: HouseholdTaskSaveInput): Promise<HouseholdTask> {
    const id = input.id ?? uuidV4();
    const normalized = normalizeName(input.name);
    const conflict = this.items().find(
      (task) => task.id !== id && task.roomId === input.roomId && normalizeName(task.name) === normalized,
    );
    if (conflict) {
      throw new HouseholdTaskNameConflictError(conflict.id);
    }

    const draft: HouseholdTask = {
      id,
      roomId: input.roomId,
      name: input.name,
      energyLevel: input.energyLevel,
      estimatedMinutes: input.estimatedMinutes,
      intervalDays: input.intervalDays,
      nextDue: input.nextDue,
      lastCompletedAt: input.lastCompletedAt,
      notes: input.notes,
      deleted: false,
    };
    const saved = await this.storage.upsertHouseholdTask(draft);
    this.items.update((list) => {
      const next = list.filter((task) => task.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  /** documentation/Subfeatures/Háztartási feladatok.md "Pipálás": a plain PUT with the client-rolled nextDue / lastCompletedAt. */
  async complete(task: HouseholdTask, today: string, now: string): Promise<HouseholdTask> {
    const { nextDue, lastCompletedAt } = rollForwardHouseholdTask(task.intervalDays, today, now);
    return this.save({
      id: task.id,
      roomId: task.roomId,
      name: task.name,
      energyLevel: task.energyLevel,
      estimatedMinutes: task.estimatedMinutes,
      intervalDays: task.intervalDays,
      nextDue,
      lastCompletedAt,
      notes: task.notes ?? null,
    });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteHouseholdTask(id);
    this.items.update((list) => list.filter((task) => task.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

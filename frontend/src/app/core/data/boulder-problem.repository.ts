import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { BoulderProblem } from '../../api/model/boulderProblem';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

const BOULDER_PROBLEM_CHANGE_TYPES: ReadonlySet<string> = new Set(['BoulderProblem']);

export interface BoulderProblemSaveInput {
  id?: string;
  sectorId: string;
  name: string;
  guidebookGrade: string;
}

/**
 * documentation/Subfeatures/Outdoor boulder admin.md "Opcionális master" — a boulder problem under a
 * Sector. The napló can also create ad-hoc problems without a master row. No name-uniqueness.
 */
@Injectable({ providedIn: 'root' })
export class BoulderProblemRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<BoulderProblem[]>([]);
  readonly loaded = signal(false);

  private readonly cacheEnabled = Capacitor.isNativePlatform();

  constructor() {
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      if ([...changed].some((type) => BOULDER_PROBLEM_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listBoulderProblems());
    this.loaded.set(true);
  }

  /** Live problems of one sector, by name. */
  forSector(sectorId: string): BoulderProblem[] {
    return this.items()
      .filter((problem) => problem.sectorId === sectorId && !problem.deleted)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(input: BoulderProblemSaveInput): Promise<BoulderProblem> {
    const draft: BoulderProblem = {
      id: input.id ?? uuidV4(),
      sectorId: input.sectorId,
      name: input.name,
      guidebookGrade: input.guidebookGrade,
      deleted: false,
    };
    const saved = await this.storage.upsertBoulderProblem(draft);
    this.items.update((list) => {
      const next = list.filter((problem) => problem.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteBoulderProblem(id);
    this.items.update((list) => list.filter((problem) => problem.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

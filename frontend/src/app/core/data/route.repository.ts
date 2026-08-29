import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Route } from '../../api/model/route';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

const ROUTE_CHANGE_TYPES: ReadonlySet<string> = new Set(['Route']);

export interface RouteSaveInput {
  id?: string;
  sectorId: string;
  name: string;
  guidebookGrade: string;
  lengthInMeters: number | null;
  totalPitches: number | null;
  rockType: string | null;
  aspect: string | null;
}

/**
 * documentation/Subfeatures/Outdoor köteles admin.md — a rope route under a Sector. `guidebookGrade`
 * is the raw guidebook string (the napló parses it; the server never computes a matrix index). No
 * name-uniqueness.
 */
@Injectable({ providedIn: 'root' })
export class RouteRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Route[]>([]);
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
      if ([...changed].some((type) => ROUTE_CHANGE_TYPES.has(type)) && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    this.items.set(await this.storage.listRoutes());
    this.loaded.set(true);
  }

  /** Live routes of one sector, by name. */
  forSector(sectorId: string): Route[] {
    return this.items()
      .filter((route) => route.sectorId === sectorId && !route.deleted)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async save(input: RouteSaveInput): Promise<Route> {
    const draft: Route = {
      id: input.id ?? uuidV4(),
      sectorId: input.sectorId,
      name: input.name,
      guidebookGrade: input.guidebookGrade,
      lengthInMeters: input.lengthInMeters,
      totalPitches: input.totalPitches,
      rockType: input.rockType,
      aspect: input.aspect,
      deleted: false,
    };
    const saved = await this.storage.upsertRoute(draft);
    this.items.update((list) => {
      const next = list.filter((route) => route.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteRoute(id);
    this.items.update((list) => list.filter((route) => route.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

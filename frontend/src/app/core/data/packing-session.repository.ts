import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingSessionStartItem } from '../storage/storage-backend';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { PackingTemplateRepository } from './packing-template.repository';

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class PackingSessionRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly templateRepository = inject(PackingTemplateRepository);

  readonly sessions = signal<PackingSession[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.sessions.set(await this.storage.listPackingSessions());
    this.loaded.set(true);
  }

  getDetail(id: string): Promise<PackingSessionDetail> {
    return this.storage.getPackingSessionDetail(id);
  }

  /**
   * documentation/Subfeatures/Pakolás.md "Indítás": union of the chosen templates' live items,
   * deduped by `gearItemId` — first occurrence wins (template selection order × in-template
   * sortOrder). The client computes this union (not the server), per the agreed design.
   */
  async start(templateIds: string[], destination: string | null): Promise<PackingSessionDetail> {
    const seenGearItemIds = new Set<string>();
    const items: PackingSessionStartItem[] = [];
    for (const templateId of templateIds) {
      const detail = await this.templateRepository.getDetail(templateId);
      const liveItems = detail.items.filter((item) => !item.deleted).sort((a, b) => a.sortOrder - b.sortOrder);
      for (const item of liveItems) {
        if (seenGearItemIds.has(item.gearItemId)) {
          continue;
        }
        seenGearItemIds.add(item.gearItemId);
        items.push({ id: uuidV4(), gearItemId: item.gearItemId, sortOrder: items.length });
      }
    }

    const saved = await this.storage.startPackingSession({ id: uuidV4(), destination, sourceTemplateIds: templateIds, items });
    this.upsertLocalSummary(saved);
    this.requestDrainIfNative();
    return saved;
  }

  async updateDestination(id: string, destination: string | null): Promise<void> {
    const updated = await this.storage.updatePackingSessionDestination(id, destination);
    this.sessions.update((list) => list.map((session) => (session.id === id ? updated : session)));
    this.requestDrainIfNative();
  }

  /** documentation/Subfeatures/Pakolás.md "Lezárás". */
  async close(id: string): Promise<void> {
    await this.storage.closePackingSession(id);
    this.sessions.update((list) => list.filter((session) => session.id !== id));
    this.requestDrainIfNative();
  }

  async addItem(sessionId: string, gearItemId: string, sortOrder: number): Promise<PackingSessionItem> {
    const item = await this.storage.addPackingSessionItem(sessionId, gearItemId, sortOrder);
    this.requestDrainIfNative();
    return item;
  }

  async updateItemStatus(item: PackingSessionItem, status: PackingSessionItem.StatusEnum): Promise<PackingSessionItem> {
    const updated = await this.storage.updatePackingSessionItem({ ...item, status });
    this.requestDrainIfNative();
    return updated;
  }

  /** `orderedItems` is the full active-section list in its new order; only items whose index actually changed are persisted. */
  async reorderItems(orderedItems: PackingSessionItem[]): Promise<PackingSessionItem[]> {
    const updates = orderedItems
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.sortOrder !== index)
      .map(({ item, index }) => this.storage.updatePackingSessionItem({ ...item, sortOrder: index }));
    const updated = await Promise.all(updates);
    if (updated.length > 0) {
      this.requestDrainIfNative();
    }
    return updated;
  }

  private upsertLocalSummary(saved: PackingSessionDetail): void {
    const summary: PackingSession = {
      id: saved.id,
      destination: saved.destination,
      sourceTemplateIds: saved.sourceTemplateIds,
      deleted: saved.deleted,
      deletedAt: saved.deletedAt,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
    this.sessions.update((list) => [summary, ...list.filter((session) => session.id !== summary.id)]);
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

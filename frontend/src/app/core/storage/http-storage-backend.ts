import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GearItemsService } from '../../api/api/gearItems.service';
import { LifePlansService } from '../../api/api/lifePlans.service';
import { PackingSessionItemsService } from '../../api/api/packingSessionItems.service';
import { PackingSessionsService } from '../../api/api/packingSessions.service';
import { PackingTemplatesService } from '../../api/api/packingTemplates.service';
import { ProfileService } from '../../api/api/profile.service';
import { GearItem } from '../../api/model/gearItem';
import { LifePlan } from '../../api/model/lifePlan';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { uuidV4 } from '../sync/uuid';
import { GearItemReferenceCounts, PackingSessionStartDraft, PackingTemplateDraft, StorageBackend } from './storage-backend';

/** Web (offlineCapable = false): every call is a direct HTTP round-trip, no local store, no outbox. */
@Injectable({ providedIn: 'root' })
export class HttpStorageBackend implements StorageBackend {
  private readonly profileApi = inject(ProfileService);
  private readonly gearApi = inject(GearItemsService);
  private readonly packingTemplatesApi = inject(PackingTemplatesService);
  private readonly packingSessionsApi = inject(PackingSessionsService);
  private readonly packingSessionItemsApi = inject(PackingSessionItemsService);
  private readonly lifePlansApi = inject(LifePlansService);

  async getProfile(): Promise<UserProfile | null> {
    try {
      return await firstValueFrom(this.profileApi.getProfile());
    } catch (error) {
      if (isHttpStatus(error, 404)) {
        return null;
      }
      throw error;
    }
  }

  upsertProfile(profile: UserProfile): Promise<UserProfile> {
    return firstValueFrom(this.profileApi.putProfile(profile));
  }

  listWeightHistory(): Promise<WeightHistoryEntry[]> {
    return firstValueFrom(this.profileApi.listWeightHistory());
  }

  /** POST with an existing id is an idempotent upsert server-side (documentation/Architektúra/Backend-offline first.md HTTP szemantika), so this covers both create and update. */
  upsertWeightHistoryEntry(entry: WeightHistoryEntry): Promise<WeightHistoryEntry> {
    return firstValueFrom(this.profileApi.createWeightHistoryEntry(entry));
  }

  deleteWeightHistoryEntry(id: string): Promise<WeightHistoryEntry> {
    return firstValueFrom(this.profileApi.deleteWeightHistoryEntry(id));
  }

  listGearItems(): Promise<GearItem[]> {
    return firstValueFrom(this.gearApi.listGearItems());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertGearItem(item: GearItem): Promise<GearItem> {
    return firstValueFrom(this.gearApi.createGearItem(item));
  }

  deleteGearItem(id: string): Promise<GearItem> {
    return firstValueFrom(this.gearApi.deleteGearItem(id));
  }

  /** No local store on web to query — the delete confirmation shows a generic message instead. */
  countGearItemReferences(): Promise<GearItemReferenceCounts | null> {
    return Promise.resolve(null);
  }

  listPackingTemplates(): Promise<PackingTemplate[]> {
    return firstValueFrom(this.packingTemplatesApi.listPackingTemplates());
  }

  getPackingTemplateDetail(id: string): Promise<PackingTemplateDetail> {
    return firstValueFrom(this.packingTemplatesApi.getPackingTemplate(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  savePackingTemplate(draft: PackingTemplateDraft): Promise<PackingTemplateDetail> {
    const dto: PackingTemplateDetail = {
      id: draft.id,
      name: draft.name,
      notes: draft.notes,
      deleted: false,
      items: draft.items.map((item) => ({ id: item.id, templateId: draft.id, gearItemId: item.gearItemId, sortOrder: item.sortOrder, deleted: false })),
    };
    return firstValueFrom(this.packingTemplatesApi.createPackingTemplate(dto));
  }

  deletePackingTemplate(id: string): Promise<PackingTemplateDetail> {
    return firstValueFrom(this.packingTemplatesApi.deletePackingTemplate(id));
  }

  listPackingSessions(): Promise<PackingSession[]> {
    return firstValueFrom(this.packingSessionsApi.listPackingSessions());
  }

  getPackingSessionDetail(id: string): Promise<PackingSessionDetail> {
    return firstValueFrom(this.packingSessionsApi.getPackingSession(id));
  }

  startPackingSession(draft: PackingSessionStartDraft): Promise<PackingSessionDetail> {
    const dto: PackingSessionDetail = {
      id: draft.id,
      destination: draft.destination,
      sourceTemplateIds: draft.sourceTemplateIds,
      deleted: false,
      items: draft.items.map((item) => ({
        id: item.id,
        sessionId: draft.id,
        gearItemId: item.gearItemId,
        status: PackingSessionItem.StatusEnum.NotPacked,
        sortOrder: item.sortOrder,
        deleted: false,
      })),
    };
    return firstValueFrom(this.packingSessionsApi.createPackingSession(dto));
  }

  updatePackingSessionDestination(id: string, destination: string | null): Promise<PackingSession> {
    // sourceTemplateIds is immutable after creation; the server ignores it on update (session-level fields only).
    const dto: PackingSession = { id, destination, sourceTemplateIds: [], deleted: false };
    return firstValueFrom(this.packingSessionsApi.updatePackingSession(id, dto));
  }

  closePackingSession(id: string): Promise<PackingSession> {
    return firstValueFrom(this.packingSessionsApi.deletePackingSession(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  addPackingSessionItem(sessionId: string, gearItemId: string, sortOrder: number): Promise<PackingSessionItem> {
    const dto: PackingSessionItem = {
      id: uuidV4(),
      sessionId,
      gearItemId,
      status: PackingSessionItem.StatusEnum.NotPacked,
      sortOrder,
      deleted: false,
    };
    return firstValueFrom(this.packingSessionItemsApi.createPackingSessionItem(dto));
  }

  updatePackingSessionItem(item: PackingSessionItem): Promise<PackingSessionItem> {
    return firstValueFrom(this.packingSessionItemsApi.updatePackingSessionItem(item.id, item));
  }

  listLifePlans(): Promise<LifePlan[]> {
    return firstValueFrom(this.lifePlansApi.listLifePlans());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertLifePlan(plan: LifePlan): Promise<LifePlan> {
    return firstValueFrom(this.lifePlansApi.createLifePlan(plan));
  }

  deleteLifePlan(id: string): Promise<LifePlan> {
    return firstValueFrom(this.lifePlansApi.deleteLifePlan(id));
  }
}

function isHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === status;
}

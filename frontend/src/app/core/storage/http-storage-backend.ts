import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GearItemsService } from '../../api/api/gearItems.service';
import { PackingTemplatesService } from '../../api/api/packingTemplates.service';
import { ProfileService } from '../../api/api/profile.service';
import { GearItem } from '../../api/model/gearItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { PackingTemplateDraft, StorageBackend } from './storage-backend';

/** Web (offlineCapable = false): every call is a direct HTTP round-trip, no local store, no outbox. */
@Injectable({ providedIn: 'root' })
export class HttpStorageBackend implements StorageBackend {
  private readonly profileApi = inject(ProfileService);
  private readonly gearApi = inject(GearItemsService);
  private readonly packingTemplatesApi = inject(PackingTemplatesService);

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
}

function isHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === status;
}

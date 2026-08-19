import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GearService } from '../../api/api/gear.service';
import { ProfileService } from '../../api/api/profile.service';
import { GearItem } from '../../api/model/gearItem';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { StorageBackend } from './storage-backend';

/** Web (offlineCapable = false): every call is a direct HTTP round-trip, no local store, no outbox. */
@Injectable({ providedIn: 'root' })
export class HttpStorageBackend implements StorageBackend {
  private readonly profileApi = inject(ProfileService);
  private readonly gearApi = inject(GearService);

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
}

function isHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === status;
}

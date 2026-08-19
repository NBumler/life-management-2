import { InjectionToken } from '@angular/core';

import { GearItem } from '../../api/model/gearItem';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';

/**
 * documentation/Architektúra/Frontend.md `core/storage/`: two implementations selected once by
 * `offlineCapable` — SqliteStorageBackend (native: local store + outbox) and HttpStorageBackend
 * (web: direct call on the generated client). Repositories (`core/data/`) are the only callers.
 */
export interface StorageBackend {
  getProfile(): Promise<UserProfile | null>;
  /** Local-first upsert. `profile.id` is client-generated (UUID v5, see determinism table) on first save. */
  upsertProfile(profile: UserProfile): Promise<UserProfile>;

  listWeightHistory(): Promise<WeightHistoryEntry[]>;
  upsertWeightHistoryEntry(entry: WeightHistoryEntry): Promise<WeightHistoryEntry>;
  deleteWeightHistoryEntry(id: string): Promise<WeightHistoryEntry>;

  listGearItems(): Promise<GearItem[]>;
  upsertGearItem(item: GearItem): Promise<GearItem>;
  deleteGearItem(id: string): Promise<GearItem>;
}

export const STORAGE_BACKEND = new InjectionToken<StorageBackend>('STORAGE_BACKEND');

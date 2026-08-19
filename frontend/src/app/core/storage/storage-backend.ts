import { InjectionToken } from '@angular/core';

import { GearItem } from '../../api/model/gearItem';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';

/** documentation/Subfeatures/Sablonok.md: the desired live item list for a template save — id is client-generated for a new item, reused for a kept one. */
export interface PackingTemplateSaveItem {
  id: string;
  gearItemId: string;
  sortOrder: number;
}

export interface PackingTemplateDraft {
  id: string;
  name: string;
  notes: string | null;
  items: PackingTemplateSaveItem[];
}

/** documentation/Subfeatures/Pakolás.md "Indítás": the client-computed, deduped initial item set. */
export interface PackingSessionStartItem {
  id: string;
  gearItemId: string;
  sortOrder: number;
}

export interface PackingSessionStartDraft {
  id: string;
  destination: string | null;
  sourceTemplateIds: string[];
  items: PackingSessionStartItem[];
}

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

  listPackingTemplates(): Promise<PackingTemplate[]>;
  getPackingTemplateDetail(id: string): Promise<PackingTemplateDetail>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": template + items saved as one outbox entry. */
  savePackingTemplate(draft: PackingTemplateDraft): Promise<PackingTemplateDetail>;
  deletePackingTemplate(id: string): Promise<PackingTemplateDetail>;

  listPackingSessions(): Promise<PackingSession[]>;
  getPackingSessionDetail(id: string): Promise<PackingSessionDetail>;
  /** documentation/Subfeatures/Pakolás.md "Indítás": session + its initial item set as one outbox entry. */
  startPackingSession(draft: PackingSessionStartDraft): Promise<PackingSessionDetail>;
  /** Session-level fields only (destination) — items are never touched here. */
  updatePackingSessionDestination(id: string, destination: string | null): Promise<PackingSession>;
  /** "Lezárás": soft delete + local cascade to the session's own items. */
  closePackingSession(id: string): Promise<PackingSession>;
  /** "Extra eszköz": add one item to an already-running session — its own outbox entry. */
  addPackingSessionItem(sessionId: string, gearItemId: string, sortOrder: number): Promise<PackingSessionItem>;
  /** Status tap or manual reorder — its own outbox entry per item, deliberately not nested (see PackingSessionItem.yaml). */
  updatePackingSessionItem(item: PackingSessionItem): Promise<PackingSessionItem>;
}

export const STORAGE_BACKEND = new InjectionToken<StorageBackend>('STORAGE_BACKEND');

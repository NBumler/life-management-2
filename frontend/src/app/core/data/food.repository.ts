import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Food } from '../../api/model/food';
import { normalizeBarcode } from '../../shared/barcode-normalization';
import { normalizeName } from '../../shared/name-normalization';
import { DurationUnit, QuantityUnit, durationsEqual, quantitiesEqual } from '../../shared/quantity';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség": thrown when every field matches another live catalog item. */
export class FoodDuplicateError extends Error {
  constructor(readonly conflictingId: string) {
    super('An identical food already exists in the catalog');
  }
}

function textEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeName(a ?? '') === normalizeName(b ?? '');
}

function numberEquals(a: number | null | undefined, b: number | null | undefined): boolean {
  const left = a ?? null;
  const right = b ?? null;
  return left === right;
}

/** documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség (Food)": every field must match for two catalog rows to count as duplicates. */
export function isDuplicateFood(existing: Food, draft: Food): boolean {
  return (
    textEquals(existing.name, draft.name) &&
    textEquals(existing.store, draft.store) &&
    textEquals(existing.brand, draft.brand) &&
    textEquals(existing.note, draft.note) &&
    normalizeBarcode(existing.barcode ?? '') === normalizeBarcode(draft.barcode ?? '') &&
    numberEquals(existing.priceHuf, draft.priceHuf) &&
    quantitiesEqual(
      { amount: existing.netAmount ?? null, unit: (existing.netUnit as QuantityUnit) ?? null },
      { amount: draft.netAmount ?? null, unit: (draft.netUnit as QuantityUnit) ?? null },
    ) &&
    numberEquals(existing.energyKcal, draft.energyKcal) &&
    numberEquals(existing.fatG, draft.fatG) &&
    numberEquals(existing.fatSaturatedG, draft.fatSaturatedG) &&
    numberEquals(existing.fatUnsaturatedG, draft.fatUnsaturatedG) &&
    numberEquals(existing.fatTransG, draft.fatTransG) &&
    numberEquals(existing.carbsG, draft.carbsG) &&
    numberEquals(existing.carbsSugarsG, draft.carbsSugarsG) &&
    numberEquals(existing.carbsComplexG, draft.carbsComplexG) &&
    numberEquals(existing.carbsFiberG, draft.carbsFiberG) &&
    numberEquals(existing.proteinG, draft.proteinG) &&
    numberEquals(existing.saltG, draft.saltG) &&
    numberEquals(existing.sodiumG, draft.sodiumG) &&
    numberEquals(existing.chlorideG, draft.chlorideG) &&
    durationsEqual(
      { amount: existing.shelfRoomAmount ?? null, unit: (existing.shelfRoomUnit as DurationUnit) ?? null },
      { amount: draft.shelfRoomAmount ?? null, unit: (draft.shelfRoomUnit as DurationUnit) ?? null },
    ) &&
    durationsEqual(
      { amount: existing.shelfFridgeAmount ?? null, unit: (existing.shelfFridgeUnit as DurationUnit) ?? null },
      { amount: draft.shelfFridgeAmount ?? null, unit: (draft.shelfFridgeUnit as DurationUnit) ?? null },
    ) &&
    durationsEqual(
      { amount: existing.shelfFreezerAmount ?? null, unit: (existing.shelfFreezerUnit as DurationUnit) ?? null },
      { amount: draft.shelfFreezerAmount ?? null, unit: (draft.shelfFreezerUnit as DurationUnit) ?? null },
    ) &&
    durationsEqual(
      { amount: existing.shelfAfterOpeningAmount ?? null, unit: (existing.shelfAfterOpeningUnit as DurationUnit) ?? null },
      { amount: draft.shelfAfterOpeningAmount ?? null, unit: (draft.shelfAfterOpeningUnit as DurationUnit) ?? null },
    )
  );
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class FoodRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<Food[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listFoods());
    this.loaded.set(true);
  }

  /**
   * documentation/Architektúra/Névegyediség.md: the client pre-checks the field-set duplicate rule
   * against its own already-loaded live list before writing. The server still enforces the same
   * rule (409 UNIQUE_VIOLATION) for the rare genuine multi-device race this local check cannot see.
   */
  async save(draft: Food): Promise<Food> {
    const conflict = this.items().find((item) => item.id !== draft.id && isDuplicateFood(item, draft));
    if (conflict) {
      throw new FoodDuplicateError(conflict.id);
    }

    const toSave: Food = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.upsertFood(toSave);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteFood(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Food } from '../../api/model/food';
import { normalizeBarcode } from '../../shared/barcode-normalization';
import { normalizeName } from '../../shared/name-normalization';
import { DurationUnit, QuantityUnit, durationsEqual, quantitiesEqual } from '../../shared/quantity';
import { FoodReferenceCounts, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { byCatalogName } from './catalog-order';

/** `SyncChangeItem.entityType`s whose local rows affect the food catalog `items()` serves. */
const FOOD_CHANGE_TYPES: ReadonlySet<string> = new Set(['Food']);

/**
 * Identity of a row set for "did the store actually change?" — id + server version + tombstone flag.
 * Order-insensitive: `save()` sorts its in-memory copy while `listFoods()` returns SQLite collation
 * order, and the signature must match across the two so an unchanged set never looks changed.
 */
function foodSetSignature(rows: readonly Food[]): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt ?? ''}:${row.deleted ? 1 : 0}`)
    .sort()
    .join('|');
}

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
    quantitiesEqual(
      { amount: existing.pieceAmount ?? null, unit: (existing.pieceUnit as QuantityUnit) ?? null },
      { amount: draft.pieceAmount ?? null, unit: (draft.pieceUnit as QuantityUnit) ?? null },
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
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Food[]>([]);
  readonly loaded = signal(false);

  /**
   * Native only: once the local store has been read, re-reads are served from the in-memory signal.
   * On web every `load()` re-fetches (there is no delta pull to invalidate a cache — see
   * `DataChangeNotifier`), but the signature guard below still spares an unchanged response from
   * re-triggering every downstream `computed()`.
   */
  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // documentation/Architektúra/Backend-offline first.md §8: a delta pull that changed rows makes
    // the cached snapshot stale — re-read from the local store when it lands. The first effect run
    // only primes the `tick` dependency; every later run is a real post-pull invalidation.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesFood = [...changed].some((type) => FOOD_CHANGE_TYPES.has(type));
      if (touchesFood && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  /**
   * Reads the catalog into `items`. Every food page hits this in `ngOnInit`; with `cacheEnabled` the
   * repeat calls are a no-op. Pass `{ force: true }` to bypass the cache after the store changed
   * underneath us (the `DataChangeNotifier` effect above does this). The `items` signal is only
   * replaced when the row set actually differs, so an unchanged reload doesn't invalidate
   * downstream `computed()`s or re-render lists.
   */
  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    if (this.inFlight !== null) {
      if (!options?.force) {
        return this.inFlight;
      }
      // A forced (post-pull) reload must not ride a read that was queued against the store *before*
      // the pull transaction committed — that would resolve with the pre-pull snapshot and leave
      // the cache stale. Wait the in-flight read out, then read again from the updated store.
      await this.inFlight.catch(() => undefined);
      if (this.inFlight !== null) {
        return this.inFlight;
      }
    }
    this.inFlight = this.readIntoSignal();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  /** Forces a re-read from the local store regardless of cache state. */
  reload(): Promise<void> {
    return this.load({ force: true });
  }

  private async readIntoSignal(): Promise<void> {
    const rows = await this.storage.listFoods();
    const signature = foodSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
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
      next.sort(byCatalogName);
      return next;
    });
    this.lastSignature = foodSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteFood(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.lastSignature = foodSetSignature(this.items());
    this.requestDrainIfNative();
  }

  /** documentation/Subfeatures/Élelmiszerek.md "Törlés": cascade counts for the confirm dialog; `null` on web. */
  countReferences(id: string): Promise<FoodReferenceCounts | null> {
    return this.storage.countFoodReferences(id);
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

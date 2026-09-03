import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Recipe } from '../../api/model/recipe';
import { normalizeName } from '../../shared/name-normalization';
import { RecipeDraft, RecipeReferenceCounts, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { byCatalogName } from './catalog-order';

/**
 * `SyncChangeItem.entityType`s whose local rows affect the recipe catalog `items()` serves.
 * `Food` is included because a `Food` delete cascades to `recipe_ingredient` tombstones locally
 * (see `SyncEngine.buildApplyTasks`).
 */
const RECIPE_CHANGE_TYPES: ReadonlySet<string> = new Set(['Recipe', 'RecipeIngredient', 'Food']);

/**
 * Identity of a row set for "did the store actually change?" — recipe id + version + tombstone, plus
 * the same triple for every ingredient row (a nested-aggregate edit only bumps the child rows).
 * Order-insensitive (both the recipe list and each ingredient list are sorted before joining) so a
 * `save()`-sorted in-memory copy and a `listRecipes()` reload of the same rows hash identically.
 */
function recipeSetSignature(rows: readonly Recipe[]): string {
  return rows
    .map(
      (row) =>
        `${row.id}:${row.updatedAt ?? ''}:${row.deleted ? 1 : 0}:[${row.ingredients
          .map((ingredient) => `${ingredient.id}:${ingredient.updatedAt ?? ''}:${ingredient.deleted ? 1 : 0}`)
          .sort()
          .join(',')}]`,
    )
    .sort()
    .join('|');
}

/** documentation/Subfeatures/Recept.md "Duplikáció": thrown when either the name or the live ingredient set already matches another live recipe. */
export class RecipeDuplicateError extends Error {
  constructor(readonly conflictingId: string) {
    super('An identical recipe already exists in the catalog');
  }
}

function textEquals(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

interface IngredientSignature {
  foodId: string;
  quantityAmount: number;
  quantityUnit: string;
}

function encodeIngredient(ingredient: IngredientSignature): string {
  return `${ingredient.foodId}|${ingredient.quantityAmount}|${ingredient.quantityUnit}`;
}

/**
 * documentation/Subfeatures/Recept.md "Duplikáció": tiltott ha (1) a neve megegyezik egy élő
 * recepttel, vagy (2) a hozzávaló-halmaz (foodId+amount+unit párok, sorrendtől függetlenül)
 * megegyezik — ez utóbbi csak akkor vizsgált, ha a mentendő receptnek van hozzávalója (két üres
 * hozzávalós recept sosem duplikátum egymással).
 */
export function isDuplicateRecipe(existing: Recipe, draft: { id: string; name: string; ingredients: IngredientSignature[] }): boolean {
  if (existing.id === draft.id) {
    return false;
  }
  if (textEquals(existing.name, draft.name)) {
    return true;
  }
  if (draft.ingredients.length === 0) {
    return false;
  }
  const existingLive = existing.ingredients.filter((ingredient) => !ingredient.deleted);
  if (existingLive.length !== draft.ingredients.length) {
    return false;
  }
  const existingSignature = new Set(existingLive.map(encodeIngredient));
  return draft.ingredients.every((ingredient) => existingSignature.has(encodeIngredient(ingredient)));
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class RecipeRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<Recipe[]>([]);
  readonly loaded = signal(false);

  /** See FoodRepository — native serves repeat reads from memory; web re-fetches but the signature guard still shields downstream `computed()`s. */
  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // See FoodRepository — re-read after a delta pull; first run only primes the `tick` dependency.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesRecipe = [...changed].some((type) => RECIPE_CHANGE_TYPES.has(type));
      if (touchesRecipe && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  /**
   * Reads the recipe catalog (with ingredients) into `items`. Cached on native; pass
   * `{ force: true }` to re-read after the store changed. `items` is only replaced when the row set
   * — recipes or their ingredients — actually differs, sparing the O(recipes × ingredients) ranking
   * pipeline (catalog-ratios.ts) an unnecessary recompute.
   */
  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    if (this.inFlight !== null) {
      if (!options?.force) {
        return this.inFlight;
      }
      // See FoodRepository — a forced post-pull reload must not ride a read queued before the pull
      // transaction committed; wait it out, then re-read from the updated store.
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
    const rows = await this.storage.listRecipes();
    const signature = recipeSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
    this.loaded.set(true);
  }

  /**
   * documentation/Subfeatures/Recept.md "Backend-offline: helyi ellenőrzés is": the client
   * pre-checks both duplicate rules against its own already-loaded live list before writing. The
   * server still enforces the same rules (409 UNIQUE_VIOLATION) for a genuine multi-device race.
   */
  async save(draft: RecipeDraft): Promise<Recipe> {
    const conflict = this.items().find((item) =>
      isDuplicateRecipe(item, { id: draft.id, name: draft.name, ingredients: draft.ingredients }),
    );
    if (conflict) {
      throw new RecipeDuplicateError(conflict.id);
    }

    const toSave: RecipeDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveRecipe(toSave);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort(byCatalogName);
      return next;
    });
    this.lastSignature = recipeSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteRecipe(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.lastSignature = recipeSetSignature(this.items());
    this.requestDrainIfNative();
  }

  /** documentation/Subfeatures/Recept.md "CRUD / törlés": referencing-meal count for the confirm dialog; `null` on web. */
  countReferences(id: string): Promise<RecipeReferenceCounts | null> {
    return this.storage.countRecipeReferences(id);
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

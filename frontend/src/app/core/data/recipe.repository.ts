import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Recipe } from '../../api/model/recipe';
import { normalizeName } from '../../shared/name-normalization';
import { RecipeDraft, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

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

  readonly items = signal<Recipe[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listRecipes());
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
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteRecipe(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

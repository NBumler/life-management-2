import { InjectionToken } from '@angular/core';

import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { Meal } from '../../api/model/meal';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { Recipe } from '../../api/model/recipe';
import { ShoppingList } from '../../api/model/shoppingList';
import { StoredFood } from '../../api/model/storedFood';
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

export interface GearItemReferenceCounts {
  templateCount: number;
  sessionCount: number;
}

export interface PackingSessionStartDraft {
  id: string;
  destination: string | null;
  sourceTemplateIds: string[];
  items: PackingSessionStartItem[];
}

/** documentation/Subfeatures/Recept.md: the desired live ingredient list for a recipe save — id is client-generated for a new ingredient, reused for a kept one. */
export interface RecipeIngredientSaveItem {
  id: string;
  foodId: string;
  quantityAmount: number;
  quantityUnit: string;
  sortOrder: number;
}

export interface RecipeDraft {
  id: string;
  name: string;
  note: string | null;
  ingredients: RecipeIngredientSaveItem[];
}

/**
 * documentation/Subfeatures/Étkezés.md "Tétel — közös": the desired live item list for a meal save
 * — id is client-generated for a new item, reused for a kept one. Discriminated on `type` so a
 * screen constructing a RECIPE/FOOD/CUSTOM row can't accidentally set another type's fields.
 */
export type MealItemSaveItem =
  | { id: string; type: 'RECIPE'; recipeId: string; servings: number; sortOrder: number }
  | { id: string; type: 'FOOD'; foodId: string; quantityAmount: number; quantityUnit: string; servings: number; sortOrder: number }
  | {
      id: string;
      type: 'CUSTOM';
      displayName: string;
      caloriesKcal: number;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      priceHuf: number | null;
      servings: number;
      sortOrder: number;
    };

export interface MealDraft {
  id: string;
  eatenAt: string;
  timeZoneId: string;
  note: string | null;
  items: MealItemSaveItem[];
}

/** Expands a discriminated `MealItemSaveItem` into the flat nullable-superset field set every persistence layer (SQLite row, outbox payload, HttpStorageBackend) needs — unused per-type fields are explicitly nulled rather than left undefined. */
export function expandMealItemSaveItem(
  item: MealItemSaveItem,
  mealId: string,
): {
  id: string;
  mealId: string;
  type: string;
  recipeId: string | null;
  foodId: string | null;
  quantityAmount: number | null;
  quantityUnit: string | null;
  displayName: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  priceHuf: number | null;
  servings: number;
  sortOrder: number;
} {
  const base = { id: item.id, mealId, servings: item.servings, sortOrder: item.sortOrder };
  switch (item.type) {
    case 'RECIPE':
      return {
        ...base,
        type: 'RECIPE',
        recipeId: item.recipeId,
        foodId: null,
        quantityAmount: null,
        quantityUnit: null,
        displayName: null,
        caloriesKcal: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        priceHuf: null,
      };
    case 'FOOD':
      return {
        ...base,
        type: 'FOOD',
        recipeId: null,
        foodId: item.foodId,
        quantityAmount: item.quantityAmount,
        quantityUnit: item.quantityUnit,
        displayName: null,
        caloriesKcal: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        priceHuf: null,
      };
    case 'CUSTOM':
      return {
        ...base,
        type: 'CUSTOM',
        recipeId: null,
        foodId: null,
        quantityAmount: null,
        quantityUnit: null,
        displayName: item.displayName,
        caloriesKcal: item.caloriesKcal,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        priceHuf: item.priceHuf,
      };
  }
}

/**
 * documentation/Subfeatures/Bevásárlólista írás.md "Tétel hozzáadása": the desired live item list
 * for a shopping list save — id is client-generated for a new item, reused for a kept one.
 * Discriminated on `type` so a screen constructing a FOOD/NON_FOOD row can't accidentally set the
 * other type's fields. Quantity is required for FOOD (the whole point of that type) but optional
 * for NON_FOOD (only `name` is required there).
 */
export type ShoppingListItemSaveItem =
  | { id: string; type: 'FOOD'; foodId: string; quantityAmount: number; quantityUnit: string; checked: boolean; sortOrder: number }
  | {
      id: string;
      type: 'NON_FOOD';
      name: string;
      note: string | null;
      quantityAmount: number | null;
      quantityUnit: string | null;
      checked: boolean;
      sortOrder: number;
    };

export interface ShoppingListDraft {
  id: string;
  name: string | null;
  items: ShoppingListItemSaveItem[];
}

/** Expands a discriminated `ShoppingListItemSaveItem` into the flat nullable-superset field set every persistence layer (SQLite row, outbox payload, HttpStorageBackend) needs — unused per-type fields are explicitly nulled rather than left undefined. */
export function expandShoppingListItemSaveItem(
  item: ShoppingListItemSaveItem,
  shoppingListId: string,
): {
  id: string;
  shoppingListId: string;
  type: string;
  foodId: string | null;
  name: string | null;
  note: string | null;
  quantityAmount: number | null;
  quantityUnit: string | null;
  checked: boolean;
  sortOrder: number;
} {
  const base = { id: item.id, shoppingListId, checked: item.checked, sortOrder: item.sortOrder };
  switch (item.type) {
    case 'FOOD':
      return { ...base, type: 'FOOD', foodId: item.foodId, name: null, note: null, quantityAmount: item.quantityAmount, quantityUnit: item.quantityUnit };
    case 'NON_FOOD':
      return { ...base, type: 'NON_FOOD', foodId: null, name: item.name, note: item.note, quantityAmount: item.quantityAmount, quantityUnit: item.quantityUnit };
  }
}

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — the atomic "Bevásárlás vége" request. All
 * ids (`storageEntryIds`, the new list's `id` and its items' ids) are client-generated
 * (documentation/Architektúra/Backend-offline first.md §2) — built by
 * `pages/menu/shopping/shopping-list-complete.ts`'s `buildCompleteDraft`.
 */
export interface ShoppingListCompleteFoodEntryDraft {
  shoppingListItemId: string;
  storageEntryIds: string[];
  expirationDate: string;
  storageLocation: string;
}

/** The flattened, resolved per-row materialization of `checkedFoodEntries` — what the local SQLite write actually needs (one row per `storageEntryIds` element), separate from the wire payload sent to the server. */
export interface ShoppingListCompleteStorageEntryDraft {
  id: string;
  foodId: string;
  quantityAmount: number;
  quantityUnit: string;
  storageLocation: string;
  expiresOn: string;
}

export interface ShoppingListCompleteNewListDraft {
  id: string;
  name: string | null;
  items: ShoppingListItemSaveItem[];
}

export interface ShoppingListCompleteDraft {
  shoppingListId: string;
  checkedFoodEntries: ShoppingListCompleteFoodEntryDraft[];
  storageEntries: ShoppingListCompleteStorageEntryDraft[];
  newActiveList: ShoppingListCompleteNewListDraft | null;
}

export interface ShoppingListCompleteResult {
  archivedListId: string;
  createdStorageEntryIds: string[];
  newActiveListId: string | null;
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
  /**
   * documentation/Subfeatures/Eszközök.md "Törlés UI": affected live template/session count for the
   * delete confirmation ("helyi store lekérdezés"). `null` when not computable — the web build has no
   * local store to query (documentation/Architektúra/Backend-offline first.md §1: web is online-only).
   */
  countGearItemReferences(gearItemId: string): Promise<GearItemReferenceCounts | null>;

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

  listLifePlans(): Promise<LifePlan[]>;
  upsertLifePlan(plan: LifePlan): Promise<LifePlan>;
  deleteLifePlan(id: string): Promise<LifePlan>;

  listHouseholdRooms(): Promise<HouseholdRoom[]>;
  upsertHouseholdRoom(room: HouseholdRoom): Promise<HouseholdRoom>;
  /** documentation/Subfeatures/Háztartási feladatok.md "Törlés": cascades to every live task in the room. */
  deleteHouseholdRoom(id: string): Promise<HouseholdRoom>;

  listHouseholdTasks(): Promise<HouseholdTask[]>;
  upsertHouseholdTask(task: HouseholdTask): Promise<HouseholdTask>;
  deleteHouseholdTask(id: string): Promise<HouseholdTask>;

  listEvents(): Promise<CalendarEvent[]>;
  upsertEvent(event: CalendarEvent): Promise<CalendarEvent>;
  /** documentation/Features/Események.md "Modell: egy sor = egy sorozat": deletes the whole series. */
  deleteEvent(id: string): Promise<CalendarEvent>;

  /** documentation/Subfeatures/Élelmiszerek.md: shared/global catalog — not scoped by user. */
  listFoods(): Promise<Food[]>;
  upsertFood(food: Food): Promise<Food>;
  /** documentation/Subfeatures/Élelmiszer tárolás.md "Törlés": cascades to every live storage item referencing this catalog entry. */
  deleteFood(id: string): Promise<Food>;

  listStoredFoods(): Promise<StoredFood[]>;
  upsertStoredFood(item: StoredFood): Promise<StoredFood>;
  deleteStoredFood(id: string): Promise<StoredFood>;

  /** documentation/Subfeatures/Recept.md: shared/global catalog — not scoped by user. Every row (incl. list entries) embeds its full live+tombstoned ingredient set. */
  listRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": recipe + ingredients saved as one outbox entry. */
  saveRecipe(draft: RecipeDraft): Promise<Recipe>;
  /** documentation/Subfeatures/Recept.md "CRUD / törlés": cascades to every live ingredient on this recipe. */
  deleteRecipe(id: string): Promise<Recipe>;

  /** documentation/Subfeatures/Étkezés.md: per-user meal log. Every row (incl. list entries) embeds its full live+tombstoned item set. */
  listMeals(): Promise<Meal[]>;
  getMeal(id: string): Promise<Meal>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": meal + items saved as one outbox entry. */
  saveMeal(draft: MealDraft): Promise<Meal>;
  /** documentation/Subfeatures/Étkezés.md: cascades to every live item on this meal. */
  deleteMeal(id: string): Promise<Meal>;

  /** documentation/Subfeatures/Bevásárlólista írás.md: per-user active shopping list. Every row (incl. list entries) embeds its full live+tombstoned item set. */
  listShoppingLists(): Promise<ShoppingList[]>;
  getShoppingList(id: string): Promise<ShoppingList>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": list + items saved as one outbox entry. */
  saveShoppingList(draft: ShoppingListDraft): Promise<ShoppingList>;
  /** documentation/Subfeatures/Bevásárlólista írás.md "Törlés": cascades to every live item on this list. */
  deleteShoppingList(id: string): Promise<ShoppingList>;
  /** documentation/Subfeatures/Bevásárlás teljesítve.md — atomic multi-entity completion: StoredFood rows + list archive + optional spun-off active list, as one outbox entry. */
  completeShoppingList(draft: ShoppingListCompleteDraft): Promise<ShoppingListCompleteResult>;
}

export const STORAGE_BACKEND = new InjectionToken<StorageBackend>('STORAGE_BACKEND');

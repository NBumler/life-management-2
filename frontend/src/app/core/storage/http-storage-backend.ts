import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { EventsService } from '../../api/api/events.service';
import { FoodsService } from '../../api/api/foods.service';
import { GearItemsService } from '../../api/api/gearItems.service';
import { HouseholdRoomsService } from '../../api/api/householdRooms.service';
import { HouseholdTasksService } from '../../api/api/householdTasks.service';
import { LifePlansService } from '../../api/api/lifePlans.service';
import { MealsService } from '../../api/api/meals.service';
import { PackingSessionItemsService } from '../../api/api/packingSessionItems.service';
import { PackingSessionsService } from '../../api/api/packingSessions.service';
import { PackingTemplatesService } from '../../api/api/packingTemplates.service';
import { ProfileService } from '../../api/api/profile.service';
import { RecipesService } from '../../api/api/recipes.service';
import { ShoppingListsService } from '../../api/api/shoppingLists.service';
import { StoredFoodsService } from '../../api/api/storedFoods.service';
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
import { uuidV4 } from '../sync/uuid';
import {
  GearItemReferenceCounts,
  MealDraft,
  PackingSessionStartDraft,
  PackingTemplateDraft,
  RecipeDraft,
  ShoppingListDraft,
  StorageBackend,
  expandMealItemSaveItem,
  expandShoppingListItemSaveItem,
} from './storage-backend';

/** Web (offlineCapable = false): every call is a direct HTTP round-trip, no local store, no outbox. */
@Injectable({ providedIn: 'root' })
export class HttpStorageBackend implements StorageBackend {
  private readonly profileApi = inject(ProfileService);
  private readonly gearApi = inject(GearItemsService);
  private readonly packingTemplatesApi = inject(PackingTemplatesService);
  private readonly packingSessionsApi = inject(PackingSessionsService);
  private readonly packingSessionItemsApi = inject(PackingSessionItemsService);
  private readonly lifePlansApi = inject(LifePlansService);
  private readonly householdRoomsApi = inject(HouseholdRoomsService);
  private readonly householdTasksApi = inject(HouseholdTasksService);
  private readonly eventsApi = inject(EventsService);
  private readonly foodsApi = inject(FoodsService);
  private readonly storedFoodsApi = inject(StoredFoodsService);
  private readonly recipesApi = inject(RecipesService);
  private readonly mealsApi = inject(MealsService);
  private readonly shoppingListsApi = inject(ShoppingListsService);

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

  listHouseholdRooms(): Promise<HouseholdRoom[]> {
    return firstValueFrom(this.householdRoomsApi.listHouseholdRooms());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertHouseholdRoom(room: HouseholdRoom): Promise<HouseholdRoom> {
    return firstValueFrom(this.householdRoomsApi.createHouseholdRoom(room));
  }

  deleteHouseholdRoom(id: string): Promise<HouseholdRoom> {
    return firstValueFrom(this.householdRoomsApi.deleteHouseholdRoom(id));
  }

  listHouseholdTasks(): Promise<HouseholdTask[]> {
    return firstValueFrom(this.householdTasksApi.listHouseholdTasks());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertHouseholdTask(task: HouseholdTask): Promise<HouseholdTask> {
    return firstValueFrom(this.householdTasksApi.createHouseholdTask(task));
  }

  deleteHouseholdTask(id: string): Promise<HouseholdTask> {
    return firstValueFrom(this.householdTasksApi.deleteHouseholdTask(id));
  }

  listEvents(): Promise<CalendarEvent[]> {
    return firstValueFrom(this.eventsApi.listEvents());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertEvent(event: CalendarEvent): Promise<CalendarEvent> {
    return firstValueFrom(this.eventsApi.createEvent(event));
  }

  deleteEvent(id: string): Promise<CalendarEvent> {
    return firstValueFrom(this.eventsApi.deleteEvent(id));
  }

  listFoods(): Promise<Food[]> {
    return firstValueFrom(this.foodsApi.listFoods());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertFood(food: Food): Promise<Food> {
    return firstValueFrom(this.foodsApi.createFood(food));
  }

  deleteFood(id: string): Promise<Food> {
    return firstValueFrom(this.foodsApi.deleteFood(id));
  }

  listStoredFoods(): Promise<StoredFood[]> {
    return firstValueFrom(this.storedFoodsApi.listStoredFoods());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertStoredFood(item: StoredFood): Promise<StoredFood> {
    return firstValueFrom(this.storedFoodsApi.createStoredFood(item));
  }

  deleteStoredFood(id: string): Promise<StoredFood> {
    return firstValueFrom(this.storedFoodsApi.deleteStoredFood(id));
  }

  listRecipes(): Promise<Recipe[]> {
    return firstValueFrom(this.recipesApi.listRecipes());
  }

  getRecipe(id: string): Promise<Recipe> {
    return firstValueFrom(this.recipesApi.getRecipe(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveRecipe(draft: RecipeDraft): Promise<Recipe> {
    const dto: Recipe = {
      id: draft.id,
      name: draft.name,
      note: draft.note,
      deleted: false,
      ingredients: draft.ingredients.map((ingredient) => ({
        id: ingredient.id,
        recipeId: draft.id,
        foodId: ingredient.foodId,
        quantityAmount: ingredient.quantityAmount,
        quantityUnit: ingredient.quantityUnit,
        sortOrder: ingredient.sortOrder,
        deleted: false,
      })),
    };
    return firstValueFrom(this.recipesApi.createRecipe(dto));
  }

  deleteRecipe(id: string): Promise<Recipe> {
    return firstValueFrom(this.recipesApi.deleteRecipe(id));
  }

  listMeals(): Promise<Meal[]> {
    return firstValueFrom(this.mealsApi.listMeals());
  }

  getMeal(id: string): Promise<Meal> {
    return firstValueFrom(this.mealsApi.getMeal(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveMeal(draft: MealDraft): Promise<Meal> {
    const dto: Meal = {
      id: draft.id,
      eatenAt: draft.eatenAt,
      timeZoneId: draft.timeZoneId,
      note: draft.note,
      deleted: false,
      items: draft.items.map((item) => ({ ...expandMealItemSaveItem(item, draft.id), deleted: false }) as Meal['items'][number]),
    };
    return firstValueFrom(this.mealsApi.createMeal(dto));
  }

  deleteMeal(id: string): Promise<Meal> {
    return firstValueFrom(this.mealsApi.deleteMeal(id));
  }

  listShoppingLists(): Promise<ShoppingList[]> {
    return firstValueFrom(this.shoppingListsApi.listShoppingLists());
  }

  getShoppingList(id: string): Promise<ShoppingList> {
    return firstValueFrom(this.shoppingListsApi.getShoppingList(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveShoppingList(draft: ShoppingListDraft): Promise<ShoppingList> {
    const dto: ShoppingList = {
      id: draft.id,
      name: draft.name,
      deleted: false,
      items: draft.items.map((item) => ({ ...expandShoppingListItemSaveItem(item, draft.id), deleted: false }) as ShoppingList['items'][number]),
    };
    return firstValueFrom(this.shoppingListsApi.createShoppingList(dto));
  }

  deleteShoppingList(id: string): Promise<ShoppingList> {
    return firstValueFrom(this.shoppingListsApi.deleteShoppingList(id));
  }
}

function isHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === status;
}

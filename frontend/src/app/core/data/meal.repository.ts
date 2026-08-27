import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Meal } from '../../api/model/meal';
import { planStockConsumption } from '../../pages/food/storage/stock-consumption';
import { today } from '../../shared/local-date';
import { QuantityUnit, canonicalQuantityAmount } from '../../shared/quantity';
import { MealDraft, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';
import { FoodRepository } from './food.repository';
import { RecipeRepository } from './recipe.repository';
import { StoredFoodRepository } from './stored-food.repository';

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class MealRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly foodRepository = inject(FoodRepository);
  private readonly recipeRepository = inject(RecipeRepository);
  private readonly storedFoodRepository = inject(StoredFoodRepository);

  readonly items = signal<Meal[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listMeals());
    this.loaded.set(true);
  }

  /**
   * documentation/Subfeatures/Étkezés.md "Készlet": stock is deducted only when this is a genuinely
   * new meal, never on an edit of an existing one — checked against the already-loaded live list,
   * same "is this id new" test the storage layer itself uses for POST vs PUT.
   */
  async save(draft: MealDraft): Promise<Meal> {
    const isCreate = !this.items().some((meal) => meal.id === draft.id);
    const toSave: MealDraft = { ...draft, id: draft.id || uuidV4() };

    if (isCreate) {
      await this.consumeStock(toSave);
    }

    const saved = await this.storage.saveMeal(toSave);
    this.items.update((list) => {
      const next = list.filter((item) => item.id !== saved.id);
      next.push(saved);
      next.sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteMeal(id);
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.requestDrainIfNative();
  }

  /**
   * documentation/Subfeatures/Recept forrású étkezés.md / Élelmiszer forrású étkezés.md: aggregates
   * every RECIPE item's live ingredients and every FOOD item's own quantity into one canonical
   * per-`foodId` demand map (CUSTOM items never touch storage), then hands it to the pure
   * `planStockConsumption` FIFO/opened-first planner and applies the result through the existing
   * `StoredFoodRepository` — each affected row is its own independent local write + outbox entry.
   */
  private async consumeStock(draft: MealDraft): Promise<void> {
    const demand = new Map<string, number>();
    for (const item of draft.items) {
      if (item.type === 'RECIPE') {
        const recipe = this.recipeRepository.items().find((candidate) => candidate.id === item.recipeId);
        if (recipe === undefined) {
          continue;
        }
        for (const ingredient of recipe.ingredients.filter((candidate) => !candidate.deleted)) {
          const canonical =
            canonicalQuantityAmount(ingredient.quantityAmount, ingredient.quantityUnit as QuantityUnit) * item.servings;
          demand.set(ingredient.foodId, (demand.get(ingredient.foodId) ?? 0) + canonical);
        }
      } else if (item.type === 'FOOD') {
        const canonical = canonicalQuantityAmount(item.quantityAmount, item.quantityUnit as QuantityUnit) * item.servings;
        demand.set(item.foodId, (demand.get(item.foodId) ?? 0) + canonical);
      }
    }
    if (demand.size === 0) {
      return;
    }

    const nowIso = new Date().toISOString();
    const plan = planStockConsumption(demand, this.storedFoodRepository.items(), this.foodRepository.items(), today(), nowIso);
    for (const update of plan.updates) {
      await this.storedFoodRepository.save(update);
    }
    for (const id of plan.removeIds) {
      await this.storedFoodRepository.remove(id);
    }
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

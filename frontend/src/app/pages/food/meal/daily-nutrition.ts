import { Food } from '../../../api/model/food';
import { Meal } from '../../../api/model/meal';
import { MealItem } from '../../../api/model/mealItem';
import { Recipe } from '../../../api/model/recipe';
import { MealItemSaveItem } from '../../../core/storage/storage-backend';
import { computeMealItemEffective } from './meal-item-summary';

export interface DailyNutritionTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  priceHuf: number;
  /** A referenced Recipe/Food no longer resolves for at least one item — see meal-item-summary.ts. */
  incomplete: boolean;
}

const ZERO_TOTALS: DailyNutritionTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, priceHuf: 0, incomplete: false };

/**
 * documentation/Subfeatures/Étkezés.md "Dashboard (vékony)" — sums the live items of a given set of
 * meals into one day's totals for the 4 progress bars + the daily price line, reusing
 * `computeMealItemEffective` per item rather than re-deriving nutrient math. Meal-set-agnostic by
 * design: callers pass an already day-filtered list (e.g. `MealDashboardPage.dayMeals()`).
 */
export function computeDailyNutrition(meals: readonly Meal[], recipes: readonly Recipe[], foods: readonly Food[]): DailyNutritionTotals {
  return meals.reduce((totals, meal) => {
    return meal.items
      .filter((item) => !item.deleted)
      .reduce((inner, item) => {
        const effective = computeMealItemEffective(toSaveItem(item), recipes, foods);
        return {
          kcal: inner.kcal + effective.energyKcal,
          proteinG: inner.proteinG + effective.proteinG,
          carbsG: inner.carbsG + effective.carbsG,
          fatG: inner.fatG + effective.fatG,
          priceHuf: inner.priceHuf + effective.priceHuf,
          incomplete: inner.incomplete || effective.incomplete,
        };
      }, totals);
  }, ZERO_TOTALS);
}

function toSaveItem(item: MealItem): MealItemSaveItem {
  if (item.type === 'RECIPE') {
    return { id: item.id, type: 'RECIPE', recipeId: item.recipeId ?? '', servings: item.servings, sortOrder: item.sortOrder };
  }
  if (item.type === 'FOOD') {
    return {
      id: item.id,
      type: 'FOOD',
      foodId: item.foodId ?? '',
      quantityAmount: item.quantityAmount ?? 0,
      quantityUnit: item.quantityUnit ?? 'g',
      servings: item.servings,
      sortOrder: item.sortOrder,
    };
  }
  return {
    id: item.id,
    type: 'CUSTOM',
    displayName: item.displayName ?? '',
    caloriesKcal: item.caloriesKcal ?? 0,
    proteinG: item.proteinG ?? null,
    carbsG: item.carbsG ?? null,
    fatG: item.fatG ?? null,
    priceHuf: item.priceHuf ?? null,
    servings: item.servings,
    sortOrder: item.sortOrder,
  };
}

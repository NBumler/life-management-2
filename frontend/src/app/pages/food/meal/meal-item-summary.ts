import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { QuantityUnit } from '../../../shared/quantity';
import { computeRecipeSummary } from '../recipe/recipe-summary';
import { MealItemSaveItem } from '../../../core/storage/storage-backend';

/**
 * documentation/Subfeatures/Étkezés.md "Tétel — közös" / [[Recept forrású étkezés]] / [[Élelmiszer
 * forrású étkezés]] / [[Egyéni forrású étkezés]] — one item's effective (servings-multiplied)
 * macros/price, live against the current Recipe/Food catalog snapshot. Reuses
 * `recipe-summary.ts`'s per-100g/db scaling model for RECIPE (the recipe's own live ingredient sum
 * × servings) and FOOD (a single-ingredient sum × servings) — CUSTOM never touches the catalog.
 */
export interface MealItemEffective {
  priceHuf: number;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Recipe/Food reference no longer resolvable, or a catalog field missing partway through the sum. */
  incomplete: boolean;
}

const ZERO: MealItemEffective = { priceHuf: 0, energyKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, incomplete: false };

function scale(effective: Omit<MealItemEffective, 'incomplete'>, servings: number): Omit<MealItemEffective, 'incomplete'> {
  return {
    priceHuf: effective.priceHuf * servings,
    energyKcal: effective.energyKcal * servings,
    proteinG: effective.proteinG * servings,
    carbsG: effective.carbsG * servings,
    fatG: effective.fatG * servings,
  };
}

export function computeMealItemEffective(item: MealItemSaveItem, recipes: readonly Recipe[], foods: readonly Food[]): MealItemEffective {
  if (item.type === 'RECIPE') {
    const recipe = recipes.find((candidate) => candidate.id === item.recipeId);
    if (recipe === undefined) {
      return { ...ZERO, incomplete: true };
    }
    const ingredients = recipe.ingredients
      .filter((ingredient) => !ingredient.deleted)
      .map((ingredient) => ({ foodId: ingredient.foodId, quantityAmount: ingredient.quantityAmount, quantityUnit: ingredient.quantityUnit as QuantityUnit }));
    const summary = computeRecipeSummary(ingredients, foods);
    return { ...scale(summary, item.servings), incomplete: summary.incomplete };
  }
  if (item.type === 'FOOD') {
    const summary = computeRecipeSummary([{ foodId: item.foodId, quantityAmount: item.quantityAmount, quantityUnit: item.quantityUnit as QuantityUnit }], foods);
    return { ...scale(summary, item.servings), incomplete: summary.incomplete };
  }
  return {
    ...scale(
      { priceHuf: item.priceHuf ?? 0, energyKcal: item.caloriesKcal, proteinG: item.proteinG ?? 0, carbsG: item.carbsG ?? 0, fatG: item.fatG ?? 0 },
      item.servings,
    ),
    incomplete: false,
  };
}

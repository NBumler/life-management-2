import { MealItemIngredientOverride } from '../../../api/model/mealItemIngredientOverride';
import { Recipe } from '../../../api/model/recipe';

/**
 * backlog/121 — one ingredient of a RECIPE meal item as it was actually used, **per 1 serving**:
 * the per-meal override's quantity when there is one, otherwise the recipe's. The item's `servings`
 * multiplies this exactly like an untouched ingredient ((override ?? recipe) × servings), so macros,
 * price and the stock deduction all read from this one list.
 */
export interface EffectiveIngredient {
  recipeIngredientId: string;
  foodId: string;
  quantityAmount: number;
  quantityUnit: string;
  /** The recipe's own quantity — null for an off-recipe override (ingredient since removed from the recipe). */
  recipeAmount: number | null;
  recipeUnit: string | null;
  overridden: boolean;
  /** The override's ingredient no longer exists on the recipe; it keeps counting via its `foodId` snapshot. */
  offRecipe: boolean;
}

export function effectiveRecipeIngredients(
  recipe: Recipe | undefined,
  overrides: readonly MealItemIngredientOverride[] | null | undefined,
): EffectiveIngredient[] {
  const byIngredient = new Map((overrides ?? []).map((override) => [override.recipeIngredientId, override]));
  const live = (recipe?.ingredients ?? []).filter((ingredient) => !ingredient.deleted).sort((a, b) => a.sortOrder - b.sortOrder);
  const result: EffectiveIngredient[] = live.map((ingredient) => {
    const override = byIngredient.get(ingredient.id);
    byIngredient.delete(ingredient.id);
    return {
      recipeIngredientId: ingredient.id,
      foodId: ingredient.foodId,
      quantityAmount: override?.quantityAmount ?? ingredient.quantityAmount,
      quantityUnit: override?.quantityUnit ?? ingredient.quantityUnit,
      recipeAmount: ingredient.quantityAmount,
      recipeUnit: ingredient.quantityUnit,
      overridden: override !== undefined,
      offRecipe: false,
    };
  });
  for (const override of byIngredient.values()) {
    result.push({
      recipeIngredientId: override.recipeIngredientId,
      foodId: override.foodId,
      quantityAmount: override.quantityAmount,
      quantityUnit: override.quantityUnit,
      recipeAmount: null,
      recipeUnit: null,
      overridden: true,
      offRecipe: true,
    });
  }
  return result;
}

/** Whether a recipe item's overrides make it differ from the recipe as written ("el van térítve"). */
export function isDivertedFromRecipe(effective: readonly EffectiveIngredient[]): boolean {
  return effective.some(
    (ingredient) => ingredient.offRecipe || (ingredient.overridden && (ingredient.quantityAmount !== ingredient.recipeAmount || ingredient.quantityUnit !== ingredient.recipeUnit)),
  );
}

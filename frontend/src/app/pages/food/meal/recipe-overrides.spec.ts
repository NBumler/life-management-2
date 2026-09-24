import { Recipe } from '../../../api/model/recipe';
import { effectiveRecipeIngredients, isDivertedFromRecipe } from './recipe-overrides';

function recipe(): Recipe {
  return {
    id: 'r1',
    name: 'Túrós tészta',
    deleted: false,
    ingredients: [
      { id: 'i2', recipeId: 'r1', foodId: 'teszta', quantityAmount: 250, quantityUnit: 'g', sortOrder: 1, deleted: false },
      { id: 'i1', recipeId: 'r1', foodId: 'turo', quantityAmount: 500, quantityUnit: 'g', sortOrder: 0, deleted: false },
      { id: 'i3', recipeId: 'r1', foodId: 'szalonna', quantityAmount: 100, quantityUnit: 'g', sortOrder: 2, deleted: true },
    ],
  } as unknown as Recipe;
}

describe('effectiveRecipeIngredients (backlog/121)', () => {
  it('without overrides it is the live recipe in order', () => {
    const result = effectiveRecipeIngredients(recipe(), []);
    expect(result.map((i) => [i.foodId, i.quantityAmount, i.overridden])).toEqual([
      ['turo', 500, false],
      ['teszta', 250, false],
    ]);
    expect(isDivertedFromRecipe(result)).toBeFalse();
  });

  it('an override replaces the recipe quantity (0 = left out) and keeps the recipe value for display', () => {
    const result = effectiveRecipeIngredients(recipe(), [
      { recipeIngredientId: 'i1', foodId: 'turo', quantityAmount: 400, quantityUnit: 'g' },
      { recipeIngredientId: 'i2', foodId: 'teszta', quantityAmount: 0, quantityUnit: 'g' },
    ]);
    expect(result[0]).toEqual(jasmine.objectContaining({ quantityAmount: 400, recipeAmount: 500, overridden: true }));
    expect(result[1]).toEqual(jasmine.objectContaining({ quantityAmount: 0, overridden: true }));
    expect(isDivertedFromRecipe(result)).toBeTrue();
  });

  it('an override equal to the recipe does not count as diverted', () => {
    const result = effectiveRecipeIngredients(recipe(), [{ recipeIngredientId: 'i1', foodId: 'turo', quantityAmount: 500, quantityUnit: 'g' }]);
    expect(isDivertedFromRecipe(result)).toBeFalse();
  });

  it('an override whose ingredient left the recipe keeps counting via its food snapshot, flagged off-recipe', () => {
    const result = effectiveRecipeIngredients(recipe(), [{ recipeIngredientId: 'i3', foodId: 'szalonna', quantityAmount: 50, quantityUnit: 'g' }]);
    expect(result.length).toBe(3);
    expect(result[2]).toEqual(jasmine.objectContaining({ foodId: 'szalonna', quantityAmount: 50, offRecipe: true, recipeAmount: null }));
  });

  it('an unknown recipe yields only the off-recipe overrides', () => {
    expect(effectiveRecipeIngredients(undefined, [])).toEqual([]);
  });
});

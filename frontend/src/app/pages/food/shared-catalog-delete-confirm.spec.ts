import { TranslateService } from '@ngx-translate/core';

import { FoodReferenceCounts, RecipeReferenceCounts } from '../../core/storage/storage-backend';
import { buildFoodDeleteConfirmMessage, buildRecipeDeleteConfirmMessage } from './shared-catalog-delete-confirm';

/** Echoes the key plus its params so assertions can see which key + interpolation was chosen. */
const translate = {
  instant: (key: string, params?: Record<string, unknown>) => (params ? `${key}::${JSON.stringify(params)}` : key),
} as unknown as TranslateService;

function foodCounts(overrides: Partial<FoodReferenceCounts> = {}): FoodReferenceCounts {
  return { storedFoodCount: 0, recipeIngredientCount: 0, mealItemCount: 0, shoppingListItemCount: 0, ...overrides };
}

describe('buildFoodDeleteConfirmMessage', () => {
  it('uses the generic shared-catalog message when counts are unknown (web)', () => {
    expect(buildFoodDeleteConfirmMessage(translate, 'Tej', null)).toBe(
      'FOOD.CATALOG.DELETE_CONFIRM_MESSAGE::{"name":"Tej"}',
    );
  });

  it('uses the generic message when nothing references the item', () => {
    expect(buildFoodDeleteConfirmMessage(translate, 'Tej', foodCounts())).toBe(
      'FOOD.CATALOG.DELETE_CONFIRM_MESSAGE::{"name":"Tej"}',
    );
  });

  it('lists only the non-empty reference groups, in a fixed order', () => {
    const msg = buildFoodDeleteConfirmMessage(
      translate,
      'Tej',
      foodCounts({ storedFoodCount: 2, mealItemCount: 3, shoppingListItemCount: 1 }),
    );

    expect(msg).toContain('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE_WITH_REFS::');
    expect(msg).toContain(
      '"refs":"FOOD.CATALOG.DELETE_REF_STORED_FOOD::{\\"count\\":2}, ' +
        'FOOD.CATALOG.DELETE_REF_MEAL_ITEM::{\\"count\\":3}, ' +
        'FOOD.CATALOG.DELETE_REF_SHOPPING_LIST_ITEM::{\\"count\\":1}"',
    );
  });
});

describe('buildRecipeDeleteConfirmMessage', () => {
  it('uses the generic message when counts are unknown or zero', () => {
    expect(buildRecipeDeleteConfirmMessage(translate, 'Bolognai', null)).toBe(
      'FOOD.RECIPE.DELETE_CONFIRM_MESSAGE::{"name":"Bolognai"}',
    );
    const zero: RecipeReferenceCounts = { mealItemCount: 0 };
    expect(buildRecipeDeleteConfirmMessage(translate, 'Bolognai', zero)).toBe(
      'FOOD.RECIPE.DELETE_CONFIRM_MESSAGE::{"name":"Bolognai"}',
    );
  });

  it('names the referencing meal items and flags the multi-user impact', () => {
    const msg = buildRecipeDeleteConfirmMessage(translate, 'Bolognai', { mealItemCount: 4 });

    expect(msg).toContain('FOOD.RECIPE.DELETE_CONFIRM_MESSAGE_WITH_REFS::');
    expect(msg).toContain('"refs":"FOOD.RECIPE.DELETE_REF_MEAL_ITEM::{\\"count\\":4}"');
  });
});

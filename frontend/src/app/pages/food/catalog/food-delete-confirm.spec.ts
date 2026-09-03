import { TranslateService } from '@ngx-translate/core';

import { FoodReferenceCounts } from '../../../core/storage/storage-backend';
import { buildFoodDeleteConfirmMessage } from './food-delete-confirm';

/** Echoes the key plus its params so assertions can see which key + interpolation was chosen. */
const translate = {
  instant: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}::${JSON.stringify(params)}` : key,
} as unknown as TranslateService;

function counts(overrides: Partial<FoodReferenceCounts> = {}): FoodReferenceCounts {
  return {
    storedFoodCount: 0,
    recipeIngredientCount: 0,
    mealItemCount: 0,
    shoppingListItemCount: 0,
    ...overrides,
  };
}

describe('buildFoodDeleteConfirmMessage', () => {
  it('uses the generic shared-catalog message when counts are unknown (web)', () => {
    const msg = buildFoodDeleteConfirmMessage(translate, 'Tej', null);

    expect(msg).toBe('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE::{"name":"Tej"}');
  });

  it('uses the generic message when nothing references the item', () => {
    const msg = buildFoodDeleteConfirmMessage(translate, 'Tej', counts());

    expect(msg).toBe('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE::{"name":"Tej"}');
  });

  it('lists only the non-empty reference groups, in a fixed order', () => {
    const msg = buildFoodDeleteConfirmMessage(
      translate,
      'Tej',
      counts({ storedFoodCount: 2, mealItemCount: 3, shoppingListItemCount: 1 }),
    );

    expect(msg).toContain('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE_WITH_REFS::');
    expect(msg).toContain('"name":"Tej"');
    expect(msg).toContain(
      '"refs":"FOOD.CATALOG.DELETE_REF_STORED_FOOD::{\\"count\\":2}, ' +
        'FOOD.CATALOG.DELETE_REF_MEAL_ITEM::{\\"count\\":3}, ' +
        'FOOD.CATALOG.DELETE_REF_SHOPPING_LIST_ITEM::{\\"count\\":1}"',
    );
  });

  it('includes a single group when only one table references the item', () => {
    const msg = buildFoodDeleteConfirmMessage(translate, 'Tej', counts({ recipeIngredientCount: 1 }));

    expect(msg).toContain('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE_WITH_REFS::');
    expect(msg).toContain('"refs":"FOOD.CATALOG.DELETE_REF_RECIPE_INGREDIENT::{\\"count\\":1}"');
  });
});

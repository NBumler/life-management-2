import { TranslateService } from '@ngx-translate/core';

import { FoodReferenceCounts, RecipeReferenceCounts } from '../../core/storage/storage-backend';

/**
 * documentation/Subfeatures/Élelmiszerek.md + Recept.md "Törlés": the delete-confirm dialog for a
 * shared catalog entry names the concrete cascade targets when they are known (native local store)
 * and always flags the multi-user impact. `counts` is `null` on web (no local store to query) or
 * when nothing references the entry → the generic shared-catalog warning; otherwise the WITH_REFS
 * variant, listing each non-empty group in a fixed order.
 */
function buildMessage(
  translate: TranslateService,
  keys: { generic: string; withRefs: string },
  name: string,
  groups: readonly [count: number, key: string][],
): string {
  const refs = groups.filter(([count]) => count > 0).map(([count, key]) => translate.instant(key, { count }));
  if (refs.length === 0) {
    return translate.instant(keys.generic, { name });
  }
  return translate.instant(keys.withRefs, { name, refs: refs.join(', ') });
}

export function buildFoodDeleteConfirmMessage(
  translate: TranslateService,
  name: string,
  counts: FoodReferenceCounts | null,
): string {
  if (!counts) {
    return translate.instant('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE', { name });
  }
  return buildMessage(
    translate,
    { generic: 'FOOD.CATALOG.DELETE_CONFIRM_MESSAGE', withRefs: 'FOOD.CATALOG.DELETE_CONFIRM_MESSAGE_WITH_REFS' },
    name,
    [
      [counts.storedFoodCount, 'FOOD.CATALOG.DELETE_REF_STORED_FOOD'],
      [counts.recipeIngredientCount, 'FOOD.CATALOG.DELETE_REF_RECIPE_INGREDIENT'],
      [counts.mealItemCount, 'FOOD.CATALOG.DELETE_REF_MEAL_ITEM'],
      [counts.shoppingListItemCount, 'FOOD.CATALOG.DELETE_REF_SHOPPING_LIST_ITEM'],
    ],
  );
}

export function buildRecipeDeleteConfirmMessage(
  translate: TranslateService,
  name: string,
  counts: RecipeReferenceCounts | null,
): string {
  if (!counts) {
    return translate.instant('FOOD.RECIPE.DELETE_CONFIRM_MESSAGE', { name });
  }
  return buildMessage(
    translate,
    { generic: 'FOOD.RECIPE.DELETE_CONFIRM_MESSAGE', withRefs: 'FOOD.RECIPE.DELETE_CONFIRM_MESSAGE_WITH_REFS' },
    name,
    [[counts.mealItemCount, 'FOOD.RECIPE.DELETE_REF_MEAL_ITEM']],
  );
}

import { TranslateService } from '@ngx-translate/core';

import { FoodReferenceCounts } from '../../../core/storage/storage-backend';

/**
 * documentation/Subfeatures/Élelmiszerek.md "Törlés": the confirm dialog names the concrete cascade
 * targets when they are known (native local store) and always flags the shared-catalog, multi-user
 * impact. `counts` is `null` on web (no local store to query) or when nothing references the item →
 * the generic shared-catalog warning; otherwise the WITH_REFS variant listing each non-empty group.
 */
export function buildFoodDeleteConfirmMessage(
  translate: TranslateService,
  name: string,
  counts: FoodReferenceCounts | null,
): string {
  const generic = translate.instant('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE', { name });
  if (!counts) {
    return generic;
  }
  const groups: [number, string][] = [
    [counts.storedFoodCount, 'FOOD.CATALOG.DELETE_REF_STORED_FOOD'],
    [counts.recipeIngredientCount, 'FOOD.CATALOG.DELETE_REF_RECIPE_INGREDIENT'],
    [counts.mealItemCount, 'FOOD.CATALOG.DELETE_REF_MEAL_ITEM'],
    [counts.shoppingListItemCount, 'FOOD.CATALOG.DELETE_REF_SHOPPING_LIST_ITEM'],
  ];
  const refs = groups
    .filter(([count]) => count > 0)
    .map(([count, key]) => translate.instant(key, { count }));
  if (refs.length === 0) {
    return generic;
  }
  return translate.instant('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE_WITH_REFS', { name, refs: refs.join(', ') });
}

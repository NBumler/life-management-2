/**
 * Pure helpers for `SqliteStorageBackend.deleteFood`'s local mirror of the server's Food-delete
 * cascade (documentation/Subfeatures/Élelmiszerek.md "Törlés"). Kept out of the storage backend
 * itself because that class has no test harness; these do.
 */

/** A meal_item row the Food delete will remove — only its parent meal id matters here. */
export interface CascadeMealItemRow {
  meal_id: string;
}

/**
 * Which meals are left with zero live items once the Food delete's `meal_item` cascade is applied.
 *
 * @param cascadeMealItemRows the meal_item rows the delete removes (one entry per row; a meal id
 *   repeats once per removed item on that meal).
 * @param liveItemCountByMealId each affected meal's *current* live meal_item count — still counting
 *   the rows that are about to be removed, since the cascade hasn't run yet.
 */
export function emptiedMeals(
  cascadeMealItemRows: readonly CascadeMealItemRow[],
  liveItemCountByMealId: ReadonlyMap<string, number>,
): string[] {
  const removedByMeal = new Map<string, number>();
  for (const row of cascadeMealItemRows) {
    removedByMeal.set(row.meal_id, (removedByMeal.get(row.meal_id) ?? 0) + 1);
  }

  const emptied: string[] = [];
  for (const [mealId, removed] of removedByMeal) {
    const remaining = (liveItemCountByMealId.get(mealId) ?? 0) - removed;
    if (remaining <= 0) {
      emptied.push(mealId);
    }
  }
  return emptied;
}

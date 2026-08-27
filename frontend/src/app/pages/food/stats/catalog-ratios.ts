import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { QuantityUnit, canonicalQuantityAmount } from '../../../shared/quantity';
import { computeRecipeSummary } from '../recipe/recipe-summary';

/**
 * documentation/Subfeatures/Kaja statisztika.md "Katalógus arányok" — pure ranking utility over a
 * local catalog snapshot, mirroring recipe-summary.ts's "client rolls forward" shape (no backend
 * endpoint computes this). Two independent catalogs (Élelmiszerek, Receptek) rank separately —
 * there is no combined ranking.
 */

export type RatioMetric = 'PROTEIN_PER_KCAL' | 'PROTEIN_PER_CARBS' | 'PROTEIN_PER_PRICE';
export type SortDirection = 'DESC' | 'ASC';

/** `ratio`/`rank` are both `null` together — the "hiányos" case (spec: not computable, listed after the ranked rows, alphabetical among themselves). */
export interface CatalogRatioRow {
  id: string;
  name: string;
  ratio: number | null;
  rank: number | null;
}

export function computeRatio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

/**
 * documentation/Subfeatures/Kaja statisztika.md "Bázis mennyiség": `ár_per_100 = priceHuf × (100 /
 * nettó_baseAmount)`. A `db`-unit net content has no weight/volume dimension to scale to "per 100
 * g/ml" — same exclusion `recipe-summary.ts`'s `priceContribution` already applies for the same reason.
 */
export function pricePer100(food: Food): number | null {
  if (food.priceHuf == null || food.netAmount == null || food.netUnit == null || food.netUnit === 'db') {
    return null;
  }
  const netBase = canonicalQuantityAmount(food.netAmount, food.netUnit as QuantityUnit);
  if (netBase === 0) {
    return null;
  }
  return food.priceHuf * (100 / netBase);
}

function foodRatio(food: Food, metric: RatioMetric): number | null {
  switch (metric) {
    case 'PROTEIN_PER_KCAL':
      return computeRatio(food.proteinG, food.energyKcal);
    case 'PROTEIN_PER_CARBS':
      return computeRatio(food.proteinG, food.carbsG);
    case 'PROTEIN_PER_PRICE':
      return computeRatio(food.proteinG, pricePer100(food));
  }
}

function recipeRatio(recipe: Recipe, foods: readonly Food[], metric: RatioMetric): number | null {
  const summary = computeRecipeSummary(
    recipe.ingredients
      .filter((ingredient) => !ingredient.deleted)
      .map((ingredient) => ({ foodId: ingredient.foodId, quantityAmount: ingredient.quantityAmount, quantityUnit: ingredient.quantityUnit as QuantityUnit })),
    foods,
  );
  if (summary.incomplete) {
    return null;
  }
  switch (metric) {
    case 'PROTEIN_PER_KCAL':
      return computeRatio(summary.proteinG, summary.energyKcal);
    case 'PROTEIN_PER_CARBS':
      return computeRatio(summary.proteinG, summary.carbsG);
    case 'PROTEIN_PER_PRICE':
      return computeRatio(summary.proteinG, summary.priceHuf);
  }
}

/** documentation/Subfeatures/Kaja statisztika.md "Rendezés és keresés": valid rows ranked 1..N by ratio + direction; hiányos rows follow, sorted by name, with no rank. */
function buildRanking(rows: readonly { id: string; name: string; ratio: number | null }[], direction: SortDirection): CatalogRatioRow[] {
  const valid = rows.filter((row) => row.ratio !== null);
  const incomplete = rows.filter((row) => row.ratio === null);
  valid.sort((a, b) => (direction === 'DESC' ? b.ratio! - a.ratio! : a.ratio! - b.ratio!));
  incomplete.sort((a, b) => a.name.localeCompare(b.name));
  return [
    ...valid.map((row, index): CatalogRatioRow => ({ ...row, rank: index + 1 })),
    ...incomplete.map((row): CatalogRatioRow => ({ ...row, rank: null })),
  ];
}

export function rankFoods(foods: readonly Food[], metric: RatioMetric, direction: SortDirection): CatalogRatioRow[] {
  const rows = foods.filter((food) => !food.deleted).map((food) => ({ id: food.id, name: food.name, ratio: foodRatio(food, metric) }));
  return buildRanking(rows, direction);
}

export function rankRecipes(recipes: readonly Recipe[], foods: readonly Food[], metric: RatioMetric, direction: SortDirection): CatalogRatioRow[] {
  const rows = recipes.filter((recipe) => !recipe.deleted).map((recipe) => ({ id: recipe.id, name: recipe.name, ratio: recipeRatio(recipe, foods, metric) }));
  return buildRanking(rows, direction);
}

import { Food } from '../../../api/model/food';
import { QuantityUnit } from '../../../shared/quantity';
import { formatFoodQuantity, resolveFoodQuantity } from '../food-quantity';

/**
 * documentation/Subfeatures/Recept.md "Automatikus összegzés" — pure calculation utility working
 * off a snapshot of the (already locally-synced) Food catalog, so it runs identically Backend-offline
 * and Full-offline. No backend endpoint computes this — same "client rolls forward" reasoning as
 * shelf-life.ts's expiry math.
 */

export interface RecipeSummary {
  priceHuf: number;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Total canonical gram/ml equivalent across all ingredients — the recipe's own "bázis mennyiség", used to normalize price to a per-100 basis the same way `pricePer100` does for a single Food. */
  baseAmountG: number;
  /** documentation/Subfeatures/Recept.md: set when any ingredient's price/nutrient math couldn't be completed (missing catalog field, or a since-deleted Food). */
  incomplete: boolean;
}

export interface RecipeIngredientQuantity {
  foodId: string;
  quantityAmount: number;
  quantityUnit: QuantityUnit;
}

/** documentation/Subfeatures/Recept.md "Mennyiség → tápanyag": (baseAmount / 100) × (tápanyag / 100 g|ml); missing catalog field → 0 + hiányos. */
function nutrientContribution(baseAmount: number, per100: number | null | undefined): { value: number; missing: boolean } {
  if (per100 == null) {
    return { value: 0, missing: true };
  }
  return { value: (baseAmount / 100) * per100, missing: false };
}

/**
 * documentation/Subfeatures/Recept.md "Receptösszeg = hozzávalók összege" — sums price + the four
 * headline nutrients across every ingredient. `foods` may be a pre-built id→Food map (callers that
 * summarize many recipes over the same catalog — e.g. catalog-ratios.ts — pass one so the per-recipe
 * cost isn't an O(catalog) linear scan per ingredient).
 */
export function computeRecipeSummary(
  ingredients: RecipeIngredientQuantity[],
  foods: readonly Food[] | ReadonlyMap<string, Food>,
): RecipeSummary {
  const byId: ReadonlyMap<string, Food> = foods instanceof Map ? foods : new Map((foods as readonly Food[]).map((food) => [food.id, food]));
  let priceHuf = 0;
  let energyKcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let baseAmountG = 0;
  let incomplete = false;

  for (const ingredient of ingredients) {
    const food = byId.get(ingredient.foodId);
    if (food === undefined) {
      incomplete = true;
      continue;
    }
    // documentation/Subfeatures/Recept.md: `db`/`cs`/SI all resolve through the shared Food-aware
    // helper — `packages` drives price (× priceHuf), `baseAmount` drives the per-100 nutrient math.
    const resolved = resolveFoodQuantity(ingredient.quantityAmount, ingredient.quantityUnit, food);
    const baseAmount = resolved.baseAmount ?? 0;
    const priceMissing = food.priceHuf == null || resolved.packages === null;
    const energy = nutrientContribution(baseAmount, food.energyKcal);
    const protein = nutrientContribution(baseAmount, food.proteinG);
    const carbs = nutrientContribution(baseAmount, food.carbsG);
    const fat = nutrientContribution(baseAmount, food.fatG);

    priceHuf += priceMissing ? 0 : resolved.packages! * food.priceHuf!;
    energyKcal += energy.value;
    proteinG += protein.value;
    carbsG += carbs.value;
    fatG += fat.value;
    baseAmountG += baseAmount;
    incomplete =
      incomplete || resolved.baseAmount === null || priceMissing || energy.missing || protein.missing || carbs.missing || fat.missing;
  }

  return { priceHuf, energyKcal, proteinG, carbsG, fatG, baseAmountG, incomplete };
}

/**
 * documentation/Subfeatures/Recept.md "`db` / `cs` megjelenítés" — thin re-export of the shared
 * `formatFoodQuantity` with the recipe-list argument order kept for its existing callers.
 */
export function formatIngredientQuantity(food: Food | undefined, amount: number, unit: QuantityUnit): string {
  return formatFoodQuantity(amount, unit, food);
}

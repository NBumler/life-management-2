import { Food } from '../../../api/model/food';
import { QuantityUnit, canonicalQuantityAmount, quantityFamily } from '../../../shared/quantity';

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

/**
 * documentation/Subfeatures/Recept.md "Mennyiség → tápanyag": the ingredient's gram/ml equivalent.
 * `db`: darabszám × nettó tartalom (canonical g/ml) — 0 (and "hiányos") if the catalog has no usable
 * net content. Weight/volume units: the given amount, canonicalized to the same base unit.
 */
function baseAmountOf(amount: number, unit: QuantityUnit, food: Food): { baseAmount: number; missing: boolean } {
  if (unit !== 'db') {
    return { baseAmount: canonicalQuantityAmount(amount, unit), missing: false };
  }
  if (food.netAmount == null || food.netUnit == null || food.netUnit === 'db') {
    return { baseAmount: 0, missing: true };
  }
  return { baseAmount: amount * canonicalQuantityAmount(food.netAmount, food.netUnit as QuantityUnit), missing: false };
}

/** documentation/Subfeatures/Recept.md "Mennyiség → tápanyag": (baseAmount / 100) × (tápanyag / 100 g|ml); missing catalog field → 0 + hiányos. */
function nutrientContribution(baseAmount: number, per100: number | null | undefined): { value: number; missing: boolean } {
  if (per100 == null) {
    return { value: 0, missing: true };
  }
  return { value: (baseAmount / 100) * per100, missing: false };
}

/** documentation/Subfeatures/Recept.md "Ár": N db → N × priceHuf; other units use the net-content package ratio. */
function priceContribution(amount: number, unit: QuantityUnit, food: Food): { value: number; missing: boolean } {
  if (food.priceHuf == null) {
    return { value: 0, missing: true };
  }
  if (unit === 'db') {
    return { value: amount * food.priceHuf, missing: false };
  }
  if (food.netAmount == null || food.netUnit == null || food.netUnit === 'db') {
    return { value: 0, missing: true };
  }
  const netUnit = food.netUnit as QuantityUnit;
  if (quantityFamily(unit) !== quantityFamily(netUnit)) {
    return { value: 0, missing: true };
  }
  const usedBase = canonicalQuantityAmount(amount, unit);
  const netBase = canonicalQuantityAmount(food.netAmount, netUnit);
  return { value: (usedBase / netBase) * food.priceHuf, missing: false };
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
    const { baseAmount, missing: baseMissing } = baseAmountOf(ingredient.quantityAmount, ingredient.quantityUnit, food);
    const price = priceContribution(ingredient.quantityAmount, ingredient.quantityUnit, food);
    const energy = nutrientContribution(baseAmount, food.energyKcal);
    const protein = nutrientContribution(baseAmount, food.proteinG);
    const carbs = nutrientContribution(baseAmount, food.carbsG);
    const fat = nutrientContribution(baseAmount, food.fatG);

    priceHuf += price.value;
    energyKcal += energy.value;
    proteinG += protein.value;
    carbsG += carbs.value;
    fatG += fat.value;
    baseAmountG += baseAmount;
    incomplete = incomplete || baseMissing || price.missing || energy.missing || protein.missing || carbs.missing || fat.missing;
  }

  return { priceHuf, energyKcal, proteinG, carbsG, fatG, baseAmountG, incomplete };
}

/** documentation/Subfeatures/Recept.md "`db` megjelenítés": `2db (1000g)` when the catalog's net content is known, else just `2db`. */
export function formatIngredientQuantity(food: Food | undefined, amount: number, unit: QuantityUnit): string {
  if (unit !== 'db' || food === undefined || food.netAmount == null || food.netUnit == null) {
    return `${amount}${unit}`;
  }
  return `${amount}db (${amount * food.netAmount}${food.netUnit})`;
}

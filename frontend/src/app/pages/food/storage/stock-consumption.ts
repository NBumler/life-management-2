import { Food } from '../../../api/model/food';
import { StoredFood } from '../../../api/model/storedFood';
import {
  QUANTITY_PIECE_MULTIPLIERS,
  QUANTITY_VOLUME_MULTIPLIERS,
  QUANTITY_WEIGHT_MULTIPLIERS,
  QuantityUnit,
  canonicalQuantityAmount,
  quantityFamily,
} from '../../../shared/quantity';
import { afterOpeningDuration, computeOpenedExpiry } from './shelf-life';

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md "Készletcsökkenés étkezéskor" — pure client-side
 * FIFO/opened-first consumption plan, called from Meal creation (RECIPE/FOOD items only; CUSTOM
 * never touches storage). `demandCanonical` is per-`foodId`, already summed across every item in the
 * meal and expressed in that food's canonical base unit (g/ml/db) — the caller (`MealRepository`)
 * is responsible for that conversion via `shared/quantity.ts`'s `canonicalQuantityAmount`.
 *
 * Rules (numbered as in the spec):
 * 1. Consume already-opened rows first, FIFO by `expiresOn` ascending.
 * 2. If still short, consume closed rows next — opening each one first (expiry recomputed per the
 *    felbontás rule), also FIFO by `expiresOn`.
 * 3. Multiple rows may be touched until the demand is satisfied.
 * 4. Under-stock is not an error — existing rows are consumed down to (and including) zero; any
 *    unmet remainder is silently dropped (treated as an unadministered purchase).
 * 5. A row left at ≤0 is removed from storage, not saved with a zero/negative quantity.
 */
export interface StockConsumptionPlan {
  /** Rows still >0 after consumption — save these (quantity, and possibly opened/openedAt/expiresOn, changed). */
  updates: StoredFood[];
  /** Rows consumed down to ≤0 — remove these. */
  removeIds: string[];
}

export function planStockConsumption(
  demandCanonical: ReadonlyMap<string, number>,
  storedFoods: readonly StoredFood[],
  foods: readonly Food[],
  todayIso: string,
  nowIso: string,
): StockConsumptionPlan {
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const updates: StoredFood[] = [];
  const removeIds: string[] = [];

  for (const [foodId, demand] of demandCanonical) {
    if (demand <= 0) {
      continue;
    }
    const food = foodById.get(foodId);
    const rowsForFood = storedFoods.filter((row) => row.foodId === foodId);
    const opened = rowsForFood.filter((row) => row.opened).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
    const closed = rowsForFood.filter((row) => !row.opened).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));

    let remaining = demand;
    for (const row of [...opened, ...closed]) {
      if (remaining <= 0) {
        break;
      }
      const unit = row.quantityUnit as QuantityUnit;
      const rowCanonical = canonicalQuantityAmount(row.quantityAmount, unit);
      const consumed = Math.min(remaining, rowCanonical);
      const remainingCanonical = rowCanonical - consumed;
      remaining -= consumed;

      const wasOpened = row.opened;
      const nextOpened = true;
      const nextExpiresOn =
        wasOpened || food === undefined ? row.expiresOn : computeOpenedExpiry(row.expiresOn, todayIso, afterOpeningDuration(food));

      if (remainingCanonical <= 0) {
        removeIds.push(row.id);
        continue;
      }
      updates.push({
        ...row,
        quantityAmount: fromCanonical(remainingCanonical, unit),
        opened: nextOpened,
        openedAt: wasOpened ? row.openedAt : nowIso,
        expiresOn: nextExpiresOn,
      });
    }
  }

  return { updates, removeIds };
}

function multiplierFor(unit: QuantityUnit): number {
  const family = quantityFamily(unit);
  const table = family === 'weight' ? QUANTITY_WEIGHT_MULTIPLIERS : family === 'volume' ? QUANTITY_VOLUME_MULTIPLIERS : QUANTITY_PIECE_MULTIPLIERS;
  return table[unit];
}

function fromCanonical(canonicalAmount: number, unit: QuantityUnit): number {
  return canonicalAmount / multiplierFor(unit);
}

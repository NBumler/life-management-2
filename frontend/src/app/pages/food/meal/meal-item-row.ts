import { Injector, Signal, WritableSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

import { MealItemSaveItem } from '../../../core/storage/storage-backend';
import { uuidV4 } from '../../../core/sync/uuid';
import { ParsedQuantity, QuantityUnit } from '../../../shared/quantity';

/**
 * documentation/Subfeatures/Étkezés.md "Tétel — közös" — the meal editor's per-item working model.
 * One reorderable list mixes three source types (RECIPE / FOOD / CUSTOM); each row keeps its own
 * editable fields as signals so the item-editor modal and the summary list can share the exact same
 * mutable object. `toSaveItem` projects a row into the persistence-facing `MealItemSaveItem`.
 *
 * FOOD quantity follows the recipe-edit ingredient pattern: a `FormControl` bound to
 * `<app-quantity-input [formControl]>`, mirrored to a read-only `quantity` signal (`toSignal`) so
 * `computed()`s in the editor/list stay reactive to it.
 */

/** Frozen so the shared module-level sentinel can't be mutated in place by a future caller. */
export const NO_QUANTITY: ParsedQuantity<QuantityUnit> = Object.freeze({ amount: null, unit: null });

export interface RecipeItemRow {
  id: string;
  type: 'RECIPE';
  recipeId: string;
  servings: WritableSignal<number>;
}

export interface FoodItemRow {
  id: string;
  type: 'FOOD';
  foodId: string;
  quantityControl: FormControl<ParsedQuantity<QuantityUnit>>;
  quantity: Signal<ParsedQuantity<QuantityUnit>>;
  servings: WritableSignal<number>;
}

export interface CustomItemRow {
  id: string;
  type: 'CUSTOM';
  displayName: WritableSignal<string>;
  caloriesKcal: WritableSignal<number | null>;
  proteinG: WritableSignal<number | null>;
  carbsG: WritableSignal<number | null>;
  fatG: WritableSignal<number | null>;
  priceHuf: WritableSignal<number | null>;
  servings: WritableSignal<number>;
}

export type ItemRow = RecipeItemRow | FoodItemRow | CustomItemRow;

export function createRecipeRow(recipeId: string): RecipeItemRow {
  return { id: uuidV4(), type: 'RECIPE', recipeId, servings: signal(1) };
}

function buildFoodRow(id: string, foodId: string, quantity: ParsedQuantity<QuantityUnit>, servings: number, injector: Injector): FoodItemRow {
  const quantityControl = new FormControl<ParsedQuantity<QuantityUnit>>(quantity, { nonNullable: true });
  const quantitySignal = toSignal(quantityControl.valueChanges, { initialValue: quantityControl.getRawValue(), injector });
  return { id, type: 'FOOD', foodId, quantityControl, quantity: quantitySignal, servings: signal(servings) };
}

export function createFoodRow(foodId: string, injector: Injector): FoodItemRow {
  return buildFoodRow(uuidV4(), foodId, NO_QUANTITY, 1, injector);
}

export function createCustomRow(): CustomItemRow {
  return {
    id: uuidV4(),
    type: 'CUSTOM',
    displayName: signal(''),
    caloriesKcal: signal(null),
    proteinG: signal(null),
    carbsG: signal(null),
    fatG: signal(null),
    priceHuf: signal(null),
    servings: signal(1),
  };
}

/** Shape of a persisted `MealItem` as it arrives from the repository (flat nullable superset). */
export interface MealItemDto {
  id: string;
  type: string;
  recipeId?: string | null;
  foodId?: string | null;
  quantityAmount?: number | null;
  quantityUnit?: string | null;
  displayName?: string | null;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  priceHuf?: number | null;
  servings: number;
}

export function buildRowFromDto(item: MealItemDto, injector: Injector): ItemRow {
  if (item.type === 'RECIPE') {
    return { id: item.id, type: 'RECIPE', recipeId: item.recipeId ?? '', servings: signal(item.servings) };
  }
  if (item.type === 'FOOD') {
    return buildFoodRow(
      item.id,
      item.foodId ?? '',
      { amount: item.quantityAmount ?? null, unit: (item.quantityUnit as QuantityUnit) ?? null },
      item.servings,
      injector,
    );
  }
  return {
    id: item.id,
    type: 'CUSTOM',
    displayName: signal(item.displayName ?? ''),
    caloriesKcal: signal(item.caloriesKcal ?? null),
    proteinG: signal(item.proteinG ?? null),
    carbsG: signal(item.carbsG ?? null),
    fatG: signal(item.fatG ?? null),
    priceHuf: signal(item.priceHuf ?? null),
    servings: signal(item.servings),
  };
}

export function toSaveItem(row: ItemRow, sortOrder: number): MealItemSaveItem {
  if (row.type === 'RECIPE') {
    return { id: row.id, type: 'RECIPE', recipeId: row.recipeId, servings: row.servings(), sortOrder };
  }
  if (row.type === 'FOOD') {
    const quantity = row.quantity();
    return {
      id: row.id,
      type: 'FOOD',
      foodId: row.foodId,
      quantityAmount: quantity.amount ?? 0,
      quantityUnit: quantity.unit ?? 'g',
      servings: row.servings(),
      sortOrder,
    };
  }
  return {
    id: row.id,
    type: 'CUSTOM',
    displayName: row.displayName(),
    caloriesKcal: row.caloriesKcal() ?? 0,
    proteinG: row.proteinG(),
    carbsG: row.carbsG(),
    fatG: row.fatG(),
    priceHuf: row.priceHuf(),
    servings: row.servings(),
    sortOrder,
  };
}

/**
 * A row is complete when it carries everything `save()` requires: a positive `servings`, plus a
 * quantity (FOOD) or a name + calories (CUSTOM). Drives both the save-time guard and the "incomplete"
 * marker on the summary list.
 */
export function isRowComplete(row: ItemRow): boolean {
  if (row.servings() <= 0) {
    return false;
  }
  if (row.type === 'FOOD') {
    return row.quantity().amount !== null;
  }
  if (row.type === 'CUSTOM') {
    return row.displayName().trim() !== '' && row.caloriesKcal() !== null;
  }
  return true;
}

/**
 * A value copy of a row's editable fields, taken when the item editor opens so a "Mégse" can put the
 * shared row object back exactly as it was (the editor binds straight to the row's signals /
 * `FormControl`, so without this a cancel would keep every keystroke). `restoreRow` is the inverse.
 */
export type RowSnapshot =
  | { type: 'RECIPE'; servings: number }
  | { type: 'FOOD'; servings: number; quantity: ParsedQuantity<QuantityUnit> }
  | {
      type: 'CUSTOM';
      servings: number;
      displayName: string;
      caloriesKcal: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      priceHuf: number | null;
    };

export function snapshotRow(row: ItemRow): RowSnapshot {
  if (row.type === 'RECIPE') {
    return { type: 'RECIPE', servings: row.servings() };
  }
  if (row.type === 'FOOD') {
    return { type: 'FOOD', servings: row.servings(), quantity: row.quantityControl.getRawValue() };
  }
  return {
    type: 'CUSTOM',
    servings: row.servings(),
    displayName: row.displayName(),
    caloriesKcal: row.caloriesKcal(),
    proteinG: row.proteinG(),
    carbsG: row.carbsG(),
    fatG: row.fatG(),
    priceHuf: row.priceHuf(),
  };
}

export function restoreRow(row: ItemRow, snapshot: RowSnapshot): void {
  if (row.type === 'RECIPE' && snapshot.type === 'RECIPE') {
    row.servings.set(snapshot.servings);
    return;
  }
  if (row.type === 'FOOD' && snapshot.type === 'FOOD') {
    row.servings.set(snapshot.servings);
    row.quantityControl.setValue(snapshot.quantity);
    return;
  }
  if (row.type === 'CUSTOM' && snapshot.type === 'CUSTOM') {
    row.servings.set(snapshot.servings);
    row.displayName.set(snapshot.displayName);
    row.caloriesKcal.set(snapshot.caloriesKcal);
    row.proteinG.set(snapshot.proteinG);
    row.carbsG.set(snapshot.carbsG);
    row.fatG.set(snapshot.fatG);
    row.priceHuf.set(snapshot.priceHuf);
  }
}

/**
 * Whether a freshly added row still needs the user to type something before it can be saved — used
 * to auto-open the item editor right after a pick. A RECIPE row is born valid (`servings` = 1), so
 * it never needs the editor unless the user wants to change the multiplier.
 */
export function rowNeedsInput(row: ItemRow): boolean {
  if (row.type === 'FOOD') {
    return row.quantity().amount === null;
  }
  if (row.type === 'CUSTOM') {
    return row.displayName().trim() === '' || row.caloriesKcal() === null;
  }
  return false;
}

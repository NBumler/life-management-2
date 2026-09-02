import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import {
  ShoppingListCompleteDraft,
  ShoppingListCompleteFoodEntryDraft,
  ShoppingListCompleteNewListDraft,
  ShoppingListCompleteStorageEntryDraft,
  ShoppingListItemSaveItem,
} from '../../../core/storage/storage-backend';
import { uuidV4 } from '../../../core/sync/uuid';

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — pure draft-building logic for the completion
 * wizard, kept separate from the page so the split/partition rules are unit-testable without a
 * component fixture. Every id (`storageEntryIds`, the new list's/items' ids) is freshly
 * client-generated here (documentation/Architektúra/Backend-offline first.md §2) — local-first
 * writes need the final state known before the server responds, so the wizard must resolve
 * `expirationDate`/`storageLocation`/the split quantity concretely up front (via the same
 * `shelf-life.ts` the manual StoredFood-creation flow already uses), never leaving that to the
 * server's own defaulting fallback.
 */

export interface CheckedFoodWizardInput {
  item: ShoppingListItem;
  expirationDate: string;
  storageLocation: string;
  foodNetAmount: number | null;
  foodNetUnit: string | null;
}

/** documentation/Subfeatures/Bevásárlás teljesítve.md "1./2.": checked FOOD items need a wizard entry; every other live item that stayed unchecked carries over to the spun-off list (checked NON_FOOD items are "megvett" too — they just don't get a StoredFood row or a spot on the new list). */
export function partitionItems(items: readonly ShoppingListItem[]): { checkedFood: ShoppingListItem[]; leftover: ShoppingListItem[] } {
  const live = items.filter((item) => !item.deleted);
  return {
    checkedFood: live.filter((item) => item.type === 'FOOD' && item.checked),
    leftover: live.filter((item) => !item.checked),
  };
}

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md "Létrehozás — bevásárlásból":
 *  - `cs` + a whole `amount` N → N storage rows (you carried home N packages);
 *  - `cs` + a fractional `amount` → exactly 1 row with that fractional quantity;
 *  - legacy `db` (no longer selectable — backlog/063): rounded **up** to whole packages, then split
 *    like `cs` (with no darab-definíció `1 db = 1 cs`, so this is `ceil(amount)` rows);
 *  - every other unit → 1 row.
 *
 * Floored at 1 and kept bit-identical to the backend's own `splitCountFor()` (ShoppingListService).
 */
export function splitCountFor(item: ShoppingListItem): number {
  const amount = item.quantityAmount ?? 1;
  if (item.quantityUnit === 'db') {
    return Math.max(1, Math.ceil(amount));
  }
  if (item.quantityUnit === 'cs') {
    return Number.isInteger(amount) ? Math.max(1, amount) : 1;
  }
  return 1;
}

export function buildCompleteDraft(
  listId: string,
  allItems: readonly ShoppingListItem[],
  wizardInputs: readonly CheckedFoodWizardInput[],
): ShoppingListCompleteDraft {
  const checkedFoodEntries: ShoppingListCompleteFoodEntryDraft[] = [];
  const storageEntries: ShoppingListCompleteStorageEntryDraft[] = [];

  for (const input of wizardInputs) {
    const splitCount = splitCountFor(input.item);
    const storageEntryIds = Array.from({ length: splitCount }, () => uuidV4());
    checkedFoodEntries.push({
      shoppingListItemId: input.item.id,
      storageEntryIds,
      expirationDate: input.expirationDate,
      storageLocation: input.storageLocation,
    });

    const [rowAmount, rowUnit] =
      splitCount > 1
        ? [input.foodNetAmount ?? 1, input.foodNetAmount !== null ? (input.foodNetUnit ?? 'cs') : 'cs']
        : [input.item.quantityAmount ?? 0, input.item.quantityUnit ?? 'g'];
    for (const id of storageEntryIds) {
      storageEntries.push({
        id,
        foodId: input.item.foodId ?? '',
        quantityAmount: rowAmount,
        quantityUnit: rowUnit,
        storageLocation: input.storageLocation,
        expiresOn: input.expirationDate,
      });
    }
  }

  const { leftover } = partitionItems(allItems);
  const newActiveList: ShoppingListCompleteNewListDraft | null =
    leftover.length === 0 ? null : { id: uuidV4(), name: null, items: leftover.map((item, index) => toSaveItem(item, index)) };

  return { shoppingListId: listId, checkedFoodEntries, storageEntries, newActiveList };
}

/** documentation/Subfeatures/Bevásárlás előzmény.md "Újralistázás" also reuses this: copying a live item into a fresh, unchecked item on a new list. */
export function toSaveItem(item: ShoppingListItem, sortOrder: number): ShoppingListItemSaveItem {
  if (item.type === 'FOOD') {
    return {
      id: uuidV4(),
      type: 'FOOD',
      foodId: item.foodId ?? '',
      quantityAmount: item.quantityAmount ?? 0,
      quantityUnit: item.quantityUnit ?? 'g',
      checked: false,
      sortOrder,
    };
  }
  return {
    id: uuidV4(),
    type: 'NON_FOOD',
    name: item.name ?? '',
    note: item.note ?? null,
    quantityAmount: item.quantityAmount ?? null,
    quantityUnit: item.quantityUnit ?? null,
    checked: false,
    sortOrder,
  };
}

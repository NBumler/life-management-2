import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import { CheckedFoodWizardInput, buildCompleteDraft, partitionItems, splitCountFor } from './shopping-list-complete';

function foodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i1', shoppingListId: 'sl1', type: 'FOOD', foodId: 'f1', quantityAmount: 1, quantityUnit: 'kg', checked: false, sortOrder: 0, deleted: false, ...overrides };
}

function nonFoodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i2', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Mosószer', note: null, checked: false, sortOrder: 1, deleted: false, ...overrides };
}

describe('partitionItems', () => {
  it('checkedFood: only live, checked FOOD items', () => {
    const items = [
      foodItem({ id: 'checked-food', checked: true }),
      foodItem({ id: 'unchecked-food', checked: false }),
      nonFoodItem({ id: 'checked-nonfood', checked: true }),
      foodItem({ id: 'deleted-checked-food', checked: true, deleted: true }),
    ];

    expect(partitionItems(items).checkedFood.map((i) => i.id)).toEqual(['checked-food']);
  });

  it('leftover: every live item that stayed unchecked, regardless of type (checked non-food is not leftover)', () => {
    const items = [
      foodItem({ id: 'checked-food', checked: true }),
      foodItem({ id: 'unchecked-food', checked: false }),
      nonFoodItem({ id: 'unchecked-nonfood', checked: false }),
      nonFoodItem({ id: 'checked-nonfood', checked: true }),
      nonFoodItem({ id: 'deleted-unchecked', checked: false, deleted: true }),
    ];

    expect(partitionItems(items).leftover.map((i) => i.id)).toEqual(['unchecked-food', 'unchecked-nonfood']);
  });
});

describe('splitCountFor', () => {
  it('returns the whole amount for a cs-unit item', () => {
    expect(splitCountFor(foodItem({ quantityAmount: 3, quantityUnit: 'cs' }))).toBe(3);
  });

  it('backlog/063: a fractional cs amount is a single row', () => {
    expect(splitCountFor(foodItem({ quantityAmount: 2.5, quantityUnit: 'cs' }))).toBe(1);
  });

  it('backlog/063: a legacy db amount rounds up to whole packages', () => {
    expect(splitCountFor(foodItem({ quantityAmount: 2, quantityUnit: 'db' }))).toBe(2);
    expect(splitCountFor(foodItem({ quantityAmount: 2.1, quantityUnit: 'db' }))).toBe(3);
  });

  it('returns 1 for any other unit, regardless of amount', () => {
    expect(splitCountFor(foodItem({ quantityAmount: 5, quantityUnit: 'kg' }))).toBe(1);
  });
});

describe('buildCompleteDraft', () => {
  it('expands a db-unit checked item into one storageEntryId/storageEntry per unit', () => {
    const item = foodItem({ id: 'i1', checked: true, quantityAmount: 3, quantityUnit: 'cs' });
    const input: CheckedFoodWizardInput = { item, expirationDate: '2026-09-01', storageLocation: 'FRIDGE', foodNetAmount: 0.5, foodNetUnit: 'l' };

    const draft = buildCompleteDraft('sl1', [item], [input]);

    expect(draft.checkedFoodEntries[0].storageEntryIds.length).toBe(3);
    expect(draft.storageEntries.length).toBe(3);
    expect(draft.storageEntries.every((entry) => entry.quantityAmount === 0.5 && entry.quantityUnit === 'l')).toBeTrue();
  });

  it('falls back to 1 db when the catalog has no net amount for a db-unit split', () => {
    const item = foodItem({ id: 'i1', checked: true, quantityAmount: 2, quantityUnit: 'cs' });
    const input: CheckedFoodWizardInput = { item, expirationDate: '2026-09-01', storageLocation: 'ROOM', foodNetAmount: null, foodNetUnit: null };

    const draft = buildCompleteDraft('sl1', [item], [input]);

    expect(draft.storageEntries.every((entry) => entry.quantityAmount === 1 && entry.quantityUnit === 'cs')).toBeTrue();
  });

  it('a non-db unit produces exactly one storage entry using the item\'s own quantity', () => {
    const item = foodItem({ id: 'i1', checked: true, quantityAmount: 1.5, quantityUnit: 'kg' });
    const input: CheckedFoodWizardInput = { item, expirationDate: '2026-09-01', storageLocation: 'FREEZER', foodNetAmount: 0.5, foodNetUnit: 'l' };

    const draft = buildCompleteDraft('sl1', [item], [input]);

    expect(draft.storageEntries).toEqual([
      jasmine.objectContaining({ quantityAmount: 1.5, quantityUnit: 'kg', storageLocation: 'FREEZER', expiresOn: '2026-09-01' }),
    ]);
  });

  it('newActiveList is null when nothing was left unchecked', () => {
    const item = foodItem({ id: 'i1', checked: true, quantityAmount: 1, quantityUnit: 'kg' });
    const input: CheckedFoodWizardInput = { item, expirationDate: '2026-09-01', storageLocation: 'ROOM', foodNetAmount: null, foodNetUnit: null };

    const draft = buildCompleteDraft('sl1', [item], [input]);

    expect(draft.newActiveList).toBeNull();
  });

  it('newActiveList carries fresh ids and checked=false for every leftover item', () => {
    const checked = foodItem({ id: 'checked', checked: true, quantityAmount: 1, quantityUnit: 'kg' });
    const leftover = nonFoodItem({ id: 'leftover', checked: false, name: 'Mosószer' });
    const input: CheckedFoodWizardInput = { item: checked, expirationDate: '2026-09-01', storageLocation: 'ROOM', foodNetAmount: null, foodNetUnit: null };

    const draft = buildCompleteDraft('sl1', [checked, leftover], [input]);

    expect(draft.newActiveList).not.toBeNull();
    expect(draft.newActiveList!.items.length).toBe(1);
    expect(draft.newActiveList!.items[0].id).not.toBe('leftover');
    expect(draft.newActiveList!.items[0].checked).toBeFalse();
    expect(draft.newActiveList!.id).not.toBe('sl1');
  });
});

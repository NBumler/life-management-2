import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import { filterAndRankHistory, searchableText } from './shopping-history';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

function foodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i1', shoppingListId: 'sl1', type: 'FOOD', foodId: 'f1', quantityAmount: 1, quantityUnit: 'kg', checked: true, sortOrder: 0, deleted: false, ...overrides };
}

function nonFoodItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return { id: 'i2', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Mosószer', note: 'Lidl', checked: false, sortOrder: 1, deleted: false, ...overrides };
}

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl1', name: 'Heti bevásárlás', status: 'ARCHIVED', completedAt: '2026-08-20T10:00:00.000Z', deleted: false, items: [], ...overrides };
}

describe('searchableText', () => {
  it('resolves the catalog name for FOOD items', () => {
    const list = shoppingList({ items: [foodItem()] });
    expect(searchableText(list, [food({ id: 'f1', name: 'Tej' })])).toContain('Tej');
  });

  it('uses name+note for NON_FOOD items', () => {
    const list = shoppingList({ items: [nonFoodItem({ name: 'Mosószer', note: 'Lidl' })] });
    const text = searchableText(list, []);
    expect(text).toContain('Mosószer');
    expect(text).toContain('Lidl');
  });

  it('excludes deleted items', () => {
    const list = shoppingList({ items: [nonFoodItem({ name: 'Törölve', deleted: true })] });
    expect(searchableText(list, [])).not.toContain('Törölve');
  });

  it('includes the list name', () => {
    const list = shoppingList({ name: 'Karácsonyi', items: [] });
    expect(searchableText(list, [])).toContain('Karácsonyi');
  });
});

describe('filterAndRankHistory', () => {
  it('only returns ARCHIVED lists', () => {
    const lists = [shoppingList({ id: 'archived', status: 'ARCHIVED' }), shoppingList({ id: 'active', status: 'ACTIVE' })];
    expect(filterAndRankHistory(lists, [], '').map((l) => l.id)).toEqual(['archived']);
  });

  it('matches by list name or item text', () => {
    const lists = [
      shoppingList({ id: 'match-name', name: 'Karácsonyi bevásárlás' }),
      shoppingList({ id: 'match-item', name: 'Sima', items: [nonFoodItem({ name: 'Gyertya' })] }),
      shoppingList({ id: 'no-match', name: 'Egyéb' }),
    ];
    expect(filterAndRankHistory(lists, [], 'karácsony').map((l) => l.id)).toEqual(['match-name']);
    expect(filterAndRankHistory(lists, [], 'gyertya').map((l) => l.id)).toEqual(['match-item']);
  });

  it('defaults to most-recently-completed first when there is no query', () => {
    const lists = [
      shoppingList({ id: 'older', completedAt: '2026-08-01T00:00:00.000Z' }),
      shoppingList({ id: 'newer', completedAt: '2026-08-20T00:00:00.000Z' }),
    ];
    expect(filterAndRankHistory(lists, [], '').map((l) => l.id)).toEqual(['newer', 'older']);
  });

  it('documentation/Architektúra/Szöveges keresés.md: an accent-exact match ranks ahead of a fold-only match while searching', () => {
    const lists = [shoppingList({ id: 'plain', name: 'Sor' }), shoppingList({ id: 'accented', name: 'Sör' })];
    expect(filterAndRankHistory(lists, [], 'sör').map((l) => l.id)).toEqual(['accented', 'plain']);
  });
});

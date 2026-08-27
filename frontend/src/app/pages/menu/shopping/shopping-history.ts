import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { compareRank, matchesSearch } from '../../../shared/text-search';

/**
 * documentation/Subfeatures/Bevásárlás előzmény.md "Szöveges keresés" — search targets: list name,
 * item display names (FOOD's resolved catalog name / NON_FOOD's own name), NON_FOOD's free text.
 * Joined into one candidate string rather than several OR'd `matchesSearch` calls (the pattern flat
 * single-field list pages use) since a shopping list has a variable number of item fields to search.
 */
export function searchableText(list: ShoppingList, foods: readonly Food[]): string {
  const itemTexts: string[] = [];
  for (const item of list.items) {
    if (item.deleted) {
      continue;
    }
    if (item.type === 'FOOD') {
      const food = foods.find((candidate) => candidate.id === item.foodId);
      if (food) {
        itemTexts.push(food.name);
      }
    } else {
      if (item.name) {
        itemTexts.push(item.name);
      }
      if (item.note) {
        itemTexts.push(item.note);
      }
    }
  }
  return [list.name ?? '', ...itemTexts].join(' ');
}

/** documentation/Subfeatures/Bevásárlás előzmény.md: only ARCHIVED lists; default order is most-recently-completed first, with accent-exact search matches promoted only while actively searching. */
export function filterAndRankHistory(lists: readonly ShoppingList[], foods: readonly Food[], query: string): ShoppingList[] {
  return lists
    .filter((list) => list.status === 'ARCHIVED' && matchesSearch(query, searchableText(list, foods)))
    .sort((a, b) => compareRank(query, searchableText(a, foods), searchableText(b, foods)) || (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

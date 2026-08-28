import { Router } from '@angular/router';

/**
 * documentation/Features/Kaja.md — the food tab's five sub-sections and their routes, in one place.
 * Each food page renders the same segmented hub in its header and delegates its `switchSection` here,
 * so adding/renaming a section is a single edit instead of a five-page shotgun change, and no page
 * can drift on which value it treats as "self".
 */
export type FoodSection = 'meal' | 'storage' | 'catalog' | 'recipe' | 'stats';

const FOOD_SECTION_ROUTES: Record<FoodSection, string> = {
  meal: '/tabs/food/meal',
  storage: '/tabs/food/storage',
  catalog: '/tabs/food/catalog',
  recipe: '/tabs/food/recipe',
  stats: '/tabs/food/stats',
};

/** Navigate to another food sub-section. No-op for the page's own section or an unknown value. */
export function navigateFoodSection(router: Router, section: string, current: FoodSection): void {
  if (section === current) {
    return;
  }
  const target = FOOD_SECTION_ROUTES[section as FoodSection];
  if (target !== undefined) {
    void router.navigateByUrl(target);
  }
}

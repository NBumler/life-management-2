import { FeatureFlagKey } from './feature-flags.service';

/**
 * documentation/Features/Kezdőlap.md — the home screen's widget set (`backlog/095`), config-driven
 * like the tab registry: order is this array's order, a widget is shown only when its `flag` is
 * `null` or enabled. Extend by adding an entry (and its render case in `home.page.html`).
 */
export type HomeWidgetKey = 'quick-actions' | 'today-nutrition';

export interface HomeWidgetDef {
  key: HomeWidgetKey;
  flag: FeatureFlagKey | null;
}

export const HOME_WIDGETS: readonly HomeWidgetDef[] = [
  { key: 'quick-actions', flag: null },
  { key: 'today-nutrition', flag: 'tab.kaja' },
];

/**
 * A single quick-action button inside the `quick-actions` widget. `route` is an absolute app URL of
 * a create flow (or the closest hub when the exact target needs a choice, e.g. the 4 climbing
 * contexts). Flag-gated the same way; an action whose flag is off is dropped, and the widget hides
 * itself when none remain.
 */
export interface QuickActionDef {
  key: string;
  flag: FeatureFlagKey | null;
  route: string;
  icon: string;
  labelKey: string;
}

export const HOME_QUICK_ACTIONS: readonly QuickActionDef[] = [
  { key: 'new-meal', flag: 'tab.kaja', route: '/tabs/food/meal/new', icon: 'restaurant-outline', labelKey: 'HOME.QUICK.NEW_MEAL' },
  { key: 'new-climb', flag: 'edzes.maszonaplo', route: '/tabs/workout/climbing', icon: 'trail-sign-outline', labelKey: 'HOME.QUICK.NEW_CLIMB' },
];

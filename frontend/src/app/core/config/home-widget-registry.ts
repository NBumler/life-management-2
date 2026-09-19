import { FeatureFlagKey } from './feature-flags.service';

/**
 * documentation/Features/Kezdőlap.md — the home screen's widget set (`backlog/095`), config-driven
 * like the tab registry: order is this array's order, a widget is shown only when its `flag` is
 * `null` or enabled. Extend by adding an entry (and its render case in `home.page.html`).
 */
export type HomeWidgetKey = 'quick-actions' | 'today-nutrition' | 'today-workouts';

export interface HomeWidgetDef {
  key: HomeWidgetKey;
  flag: FeatureFlagKey | null;
}

export const HOME_WIDGETS: readonly HomeWidgetDef[] = [
  { key: 'quick-actions', flag: null },
  { key: 'today-nutrition', flag: 'tab.kaja' },
  // Row-level flags (HOME_TODAY_WORKOUT_ROWS) decide what's inside; the widget itself hides only
  // when none of its 5 rows qualify (same pattern as HOME_QUICK_ACTIONS).
  { key: 'today-workouts', flag: null },
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

/**
 * A single activity row inside the `today-workouts` widget (`backlog/112`). Flag-gated the same way
 * as `HOME_QUICK_ACTIONS`; a row whose flag is off is dropped, and the widget hides itself entirely
 * when none remain. `TodayWorkoutsService.summary` supplies the per-row count/kcal by `key`.
 */
export type TodayWorkoutRowKey = 'steps' | 'workout' | 'climbing' | 'swim' | 'bike';

export interface TodayWorkoutRowDef {
  key: TodayWorkoutRowKey;
  flag: FeatureFlagKey | null;
  labelKey: string;
  icon: string;
}

export const HOME_TODAY_WORKOUT_ROWS: readonly TodayWorkoutRowDef[] = [
  { key: 'steps', flag: 'menu.lepesszam', labelKey: 'HOME.WORKOUTS.STEPS', icon: 'footsteps-outline' },
  { key: 'workout', flag: 'tab.edzes', labelKey: 'HOME.WORKOUTS.WORKOUT', icon: 'barbell-outline' },
  { key: 'climbing', flag: 'edzes.maszonaplo', labelKey: 'HOME.WORKOUTS.CLIMBING', icon: 'trail-sign-outline' },
  { key: 'swim', flag: 'edzes.uszas', labelKey: 'HOME.WORKOUTS.SWIM', icon: 'water-outline' },
  { key: 'bike', flag: 'edzes.bicikli', labelKey: 'HOME.WORKOUTS.BIKE', icon: 'bicycle-outline' },
];

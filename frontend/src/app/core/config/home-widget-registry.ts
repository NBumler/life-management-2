import { FeatureFlagKey } from './feature-flags.service';

/**
 * documentation/Features/Kezdőlap.md — the home screen's widget set (`backlog/095`), config-driven
 * like the tab registry: order is this array's order, a widget is shown only when its `flag` is
 * `null` or enabled. Extend by adding an entry (and its render case in `home.page.html`).
 */
export type HomeWidgetKey = 'today-nutrition' | 'today-workouts';

export interface HomeWidgetDef {
  key: HomeWidgetKey;
  flag: FeatureFlagKey | null;
}

export const HOME_WIDGETS: readonly HomeWidgetDef[] = [
  { key: 'today-nutrition', flag: 'tab.kaja' },
  // Row-level flags (HOME_TODAY_WORKOUT_ROWS) decide what's inside; the widget itself hides only
  // when none of its rows qualify.
  { key: 'today-workouts', flag: null },
];

/**
 * A single activity row inside the `today-workouts` widget (`backlog/112`). Flag-gated the same way
 * as `HOME_WIDGETS`; a row whose flag is off is dropped, and the widget hides itself entirely
 * when none remain. `TodayWorkoutsService.summary` supplies the per-row count/kcal by `key`.
 */
export type TodayWorkoutRowKey = 'steps' | 'workout' | 'climbing' | 'swim' | 'bike' | 'volleyball' | 'stretch';

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
  { key: 'volleyball', flag: 'edzes.roplabda', labelKey: 'HOME.WORKOUTS.VOLLEYBALL', icon: 'basketball-outline' },
  { key: 'stretch', flag: 'edzes.nyujtas', labelKey: 'HOME.WORKOUTS.STRETCH', icon: 'body-outline' },
];

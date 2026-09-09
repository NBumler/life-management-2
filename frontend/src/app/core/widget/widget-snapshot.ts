import { TodayNutritionSummary } from '../data/today-nutrition.service';

/**
 * documentation/Features/Android kezdőképernyő widget.md — the JSON contract between the Angular
 * `WidgetSnapshotService` (writer) and the native `AppWidgetProvider`s (readers). Written to the
 * `@capacitor/preferences` / `CapacitorStorage` key below, exactly like `lm2_notifBgPlan`. Every
 * user-facing string is pre-localized here (the widget process runs no JS); the native side only
 * formats numbers and assembles `"<intake> / <goal>"` lines.
 */
export const WIDGET_SNAPSHOT_KEY = 'lm2_widgetSnapshot';
export const WIDGET_SNAPSHOT_VERSION = 1;

/** Route deep-links a widget tap stashes for `NotificationSchedulerService.drainPendingRoute()`. */
export const WIDGET_ROUTES = {
  open: '/tabs/home',
  nutrition: '/tabs/food',
  steps: '/tabs/menu/steps',
  profile: '/tabs/menu/profile',
  newMeal: '/tabs/food/meal/new',
  newClimb: '/tabs/workout/climbing',
} as const;

/** i18n keys the service resolves via `TranslateService.instant` before calling {@link buildWidgetSnapshot}. */
export const WIDGET_LABEL_KEYS = {
  appTitle: 'WIDGET.APP_TITLE',
  nutritionTitle: 'WIDGET.NUTRITION_TITLE',
  stepsTitle: 'WIDGET.STEPS_TITLE',
  quickTitle: 'WIDGET.QUICK_TITLE',
  kcal: 'WIDGET.KCAL',
  protein: 'WIDGET.PROTEIN',
  carbs: 'WIDGET.CARBS',
  fat: 'WIDGET.FAT',
  stepsUnit: 'WIDGET.STEPS_UNIT',
  remaining: 'WIDGET.REMAINING',
  loggedOut: 'WIDGET.LOGGED_OUT',
  noProfile: 'WIDGET.NO_PROFILE',
  newMeal: 'WIDGET.NEW_MEAL',
  newClimb: 'WIDGET.NEW_CLIMB',
} as const;

export type WidgetLabels = Record<keyof typeof WIDGET_LABEL_KEYS, string>;

export interface WidgetNutrient {
  intake: number;
  goal: number;
}

export interface WidgetSnapshot {
  version: number;
  writtenAt: number;
  loggedIn: boolean;
  lang: string;
  /** `null` when the profile lacks the TDEE inputs — the nutrition / summary widgets show `labels.noProfile`. */
  nutrition: {
    incomplete: boolean;
    kcal: WidgetNutrient;
    proteinG: WidgetNutrient;
    carbsG: WidgetNutrient;
    fatG: WidgetNutrient;
  } | null;
  steps: {
    count: number;
    goal: number;
  };
  labels: WidgetLabels;
  routes: typeof WIDGET_ROUTES;
}

export interface WidgetSnapshotInputs {
  loggedIn: boolean;
  lang: string;
  nutrition: TodayNutritionSummary;
  stepCount: number;
  stepGoal: number;
  labels: WidgetLabels;
  now?: number;
}

const clampNonNegative = (value: number): number => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0);

export function buildWidgetSnapshot(inputs: WidgetSnapshotInputs): WidgetSnapshot {
  const n = inputs.nutrition;
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    writtenAt: inputs.now ?? Date.now(),
    loggedIn: inputs.loggedIn,
    lang: inputs.lang,
    nutrition:
      inputs.loggedIn && n.computable
        ? {
            incomplete: n.incomplete,
            kcal: nutrient(n.kcal),
            proteinG: nutrient(n.proteinG),
            carbsG: nutrient(n.carbsG),
            fatG: nutrient(n.fatG),
          }
        : null,
    steps: {
      count: clampNonNegative(inputs.stepCount),
      goal: clampNonNegative(inputs.stepGoal),
    },
    labels: inputs.labels,
    routes: WIDGET_ROUTES,
  };
}

function nutrient(progress: { intake: number; goal: number }): WidgetNutrient {
  return { intake: clampNonNegative(progress.intake), goal: clampNonNegative(progress.goal) };
}

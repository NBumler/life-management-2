/**
 * documentation/Features/Kezdőlap.md + documentation/Subfeatures/Heti adatok.md — the one calculation
 * behind both the home screen's "today" widgets and the weekly overview (`backlog/233`). Every figure
 * is a Σ of per-day values over a list of client-local calendar days, so the weekly numbers are by
 * construction the sum of the daily ones, and a one-day list reproduces the home widgets exactly.
 *
 * Pure TS, no Angular — the services feed it their repository signals.
 */
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { ClimbingSession } from '../../api/model/climbingSession';
import { DailyStepLog } from '../../api/model/dailyStepLog';
import { Food } from '../../api/model/food';
import { Meal } from '../../api/model/meal';
import { Recipe } from '../../api/model/recipe';
import { StretchSession } from '../../api/model/stretchSession';
import { SwimLog } from '../../api/model/swimLog';
import { UserProfile } from '../../api/model/userProfile';
import { VolleyballLog } from '../../api/model/volleyballLog';
import { WorkoutSession } from '../../api/model/workoutSession';
import { computeDailyNutrition } from '../../shared/food/daily-nutrition';
import { TdeeProfileInput, computeTdee } from '../../shared/tdee-calculator';
import { calendarDayInZone } from '../../shared/timezone';
import {
  bikeKcalForDay,
  climbingKcalForDay,
  stepKcalForDay,
  stretchKcalForDay,
  swimKcalForDay,
  volleyballKcalForDay,
  workoutKcalForDay,
} from './activity-kcal';

/** One nutrient's intake over the counted days against the Σ of those days' goals. */
export interface NutrientProgress {
  intake: number;
  goal: number;
}

export interface NutritionSummary {
  /** `false` when the profile is missing inputs `computeTdee` needs — the widget then shows a hint. */
  computable: boolean;
  /** A referenced Recipe/Food no longer resolves for at least one counted meal item. */
  incomplete: boolean;
  kcal: NutrientProgress;
  proteinG: NutrientProgress;
  carbsG: NutrientProgress;
  fatG: NutrientProgress;
}

/** One activity type's tally over the counted days. */
export interface ActivityTally {
  /** Number of live log rows (for steps: days with a step log). */
  count: number;
  kcal: number;
}

export interface WorkoutsSummary {
  steps: ActivityTally & { stepCount: number };
  workout: ActivityTally;
  climbing: ActivityTally;
  swim: ActivityTally;
  bike: ActivityTally;
  volleyball: ActivityTally;
  /** backlog/169 — stretching sessions (never a load day, but they burn a little). */
  stretch: ActivityTally;
  totalKcal: number;
}

/** Every log the `activityExtraKcal` term of the TDEE reads. */
export interface ActivityLogs {
  steps: readonly DailyStepLog[];
  workouts: readonly WorkoutSession[];
  climbs: readonly ClimbingSession[];
  swims: readonly SwimLog[];
  bikes: readonly BikeRideLog[];
  volleyballs: readonly VolleyballLog[];
  stretches: readonly StretchSession[];
}

export interface NutritionInputs {
  meals: readonly Meal[];
  recipes: readonly Recipe[];
  foods: readonly Food[];
  profile: UserProfile | null;
  logs: ActivityLogs;
}

const EMPTY: NutrientProgress = { intake: 0, goal: 0 };

function toTdeeInput(profile: UserProfile | null): TdeeProfileInput {
  return {
    birthDate: profile?.birthDate ?? null,
    sex: profile?.sex ?? null,
    heightCm: profile?.heightCm ?? null,
    currentWeightKg: profile?.currentWeightKg ?? null,
    goal: profile?.goal ?? null,
    kgPerWeek: profile?.kgPerWeek ?? null,
  };
}

/** documentation/Features/Tápérték kalkulátor.md — step kcal + Σ training kcal for `day` at the current weight. */
export function activityExtraKcalForDay(logs: ActivityLogs, day: string, bodyWeightKg: number | null): number {
  return (
    stepKcalForDay(logs.steps, day, bodyWeightKg) +
    workoutKcalForDay(logs.workouts, day, bodyWeightKg) +
    swimKcalForDay(logs.swims, day, bodyWeightKg) +
    bikeKcalForDay(logs.bikes, day, bodyWeightKg) +
    volleyballKcalForDay(logs.volleyballs, day, bodyWeightKg) +
    stretchKcalForDay(logs.stretches, day, bodyWeightKg) +
    climbingKcalForDay(logs.climbs, day, bodyWeightKg)
  );
}

/**
 * Intake over the meals eaten on any of `days` (in `zone`) vs. the Σ of each day's own goal —
 * `computeTdee` with that day's `activityExtraKcal`, the same chain as the Étkezés dashboard.
 */
export function nutritionForDays(inputs: NutritionInputs, days: readonly string[], zone: string): NutritionSummary {
  const daySet = new Set(days);
  const meals = inputs.meals.filter((meal) => daySet.has(calendarDayInZone(meal.eatenAt, zone)));
  const totals = computeDailyNutrition(meals, inputs.recipes, inputs.foods);
  const notComputable: NutritionSummary = {
    computable: false,
    incomplete: totals.incomplete,
    kcal: EMPTY,
    proteinG: EMPTY,
    carbsG: EMPTY,
    fatG: EMPTY,
  };

  const tdeeInput = toTdeeInput(inputs.profile);
  const weight = inputs.profile?.currentWeightKg ?? null;
  const goals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const day of days) {
    const tdee = computeTdee(tdeeInput, day, activityExtraKcalForDay(inputs.logs, day, weight));
    if (!tdee.computable) {
      return notComputable;
    }
    goals.kcal += tdee.dailyAllowanceKcal;
    goals.proteinG += tdee.macros.proteinGoalG;
    goals.carbsG += tdee.macros.carbsGoalG;
    goals.fatG += tdee.macros.fatGoalG;
  }
  if (days.length === 0) {
    return notComputable;
  }

  return {
    computable: true,
    incomplete: totals.incomplete,
    kcal: { intake: totals.kcal, goal: goals.kcal },
    proteinG: { intake: totals.proteinG, goal: goals.proteinG },
    carbsG: { intake: totals.carbsG, goal: goals.carbsG },
    fatG: { intake: totals.fatG, goal: goals.fatG },
  };
}

function tally<T extends { deleted?: boolean; date: string }>(
  rows: readonly T[],
  daySet: ReadonlySet<string>,
  days: readonly string[],
  kcalForDay: (rows: readonly T[], day: string, bodyWeightKg: number | null) => number,
  bodyWeightKg: number | null,
): ActivityTally {
  return {
    count: rows.filter((row) => !row.deleted && daySet.has(row.date)).length,
    kcal: days.reduce((sum, day) => sum + kcalForDay(rows, day, bodyWeightKg), 0),
  };
}

/** Per-activity count + kcal over `days`, plus the combined total (the Σ `activityExtraKcal` of those days). */
export function workoutsForDays(logs: ActivityLogs, days: readonly string[], bodyWeightKg: number | null): WorkoutsSummary {
  const daySet = new Set(days);
  const stepLogs = logs.steps.filter((log) => !log.deleted && daySet.has(log.date));

  const steps = {
    count: stepLogs.length,
    stepCount: stepLogs.reduce((sum, log) => sum + log.stepCount, 0),
    kcal: days.reduce((sum, day) => sum + stepKcalForDay(logs.steps, day, bodyWeightKg), 0),
  };
  const workout = tally(logs.workouts, daySet, days, workoutKcalForDay, bodyWeightKg);
  const climbing = tally(logs.climbs, daySet, days, climbingKcalForDay, bodyWeightKg);
  const swim = tally(logs.swims, daySet, days, swimKcalForDay, bodyWeightKg);
  const bike = tally(logs.bikes, daySet, days, bikeKcalForDay, bodyWeightKg);
  const volleyball = tally(logs.volleyballs, daySet, days, volleyballKcalForDay, bodyWeightKg);
  const stretch = tally(logs.stretches, daySet, days, stretchKcalForDay, bodyWeightKg);

  return {
    steps,
    workout,
    climbing,
    swim,
    bike,
    volleyball,
    stretch,
    totalKcal: steps.kcal + workout.kcal + climbing.kcal + swim.kcal + bike.kcal + volleyball.kcal + stretch.kcal,
  };
}

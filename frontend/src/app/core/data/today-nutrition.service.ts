import { Injectable, computed, inject } from '@angular/core';

import { UserProfile } from '../../api/model/userProfile';
import { computeDailyNutrition } from '../../pages/food/meal/daily-nutrition';
import { today } from '../../shared/local-date';
import { TdeeProfileInput, computeTdee } from '../../shared/tdee-calculator';
import { calendarDayInZone, deviceTimeZoneId } from '../../shared/timezone';
import { bikeKcalForDay, climbingKcalForDay, stepKcalForDay, swimKcalForDay, workoutKcalForDay } from './activity-kcal';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { FoodRepository } from './food.repository';
import { MealRepository } from './meal.repository';
import { ProfileRepository } from './profile.repository';
import { RecipeRepository } from './recipe.repository';
import { SwimLogRepository } from './swim-log.repository';
import { WorkoutSessionRepository } from './workout-session.repository';

/** One nutrient's today-so-far intake against today's goal. */
export interface NutrientProgress {
  intake: number;
  goal: number;
}

export interface TodayNutritionSummary {
  /** `false` when the profile is missing inputs `computeTdee` needs — the widget then shows a hint. */
  computable: boolean;
  /** A referenced Recipe/Food no longer resolves for at least one of today's meal items. */
  incomplete: boolean;
  kcal: NutrientProgress;
  proteinG: NutrientProgress;
  carbsG: NutrientProgress;
  fatG: NutrientProgress;
}

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

const EMPTY: NutrientProgress = { intake: 0, goal: 0 };

/**
 * documentation/Features/Kezdőlap.md — the "Mai étkezés állása" home widget's data source
 * (`backlog/095`). Reuses the exact `MealDashboardPage` chain — `computeDailyNutrition` over today's
 * meals + `computeTdee(activityExtraKcal)` — so the widget and the Étkezés dashboard agree. All
 * inputs are repository signals (local store), so `summary` recomputes live after a delta pull and
 * works Full-offline — [[Backend-offline first]].
 */
@Injectable({ providedIn: 'root' })
export class TodayNutritionService {
  private readonly meals = inject(MealRepository);
  private readonly recipes = inject(RecipeRepository);
  private readonly foods = inject(FoodRepository);
  private readonly profile = inject(ProfileRepository);
  private readonly workouts = inject(WorkoutSessionRepository);
  private readonly swims = inject(SwimLogRepository);
  private readonly bikes = inject(BikeRideLogRepository);
  private readonly climbs = inject(ClimbingSessionRepository);
  private readonly steps = inject(DailyStepLogRepository);

  private readonly todaysMeals = computed(() => {
    const day = today();
    const zone = deviceTimeZoneId();
    return this.meals.items().filter((meal) => calendarDayInZone(meal.eatenAt, zone) === day);
  });

  /** documentation/Features/Tápérték kalkulátor.md — step kcal + Σ training kcal at the current weight. */
  private readonly activityExtraKcal = computed(() => {
    const day = today();
    const weight = this.profile.profile()?.currentWeightKg ?? null;
    return (
      stepKcalForDay(this.steps.items(), day, weight) +
      workoutKcalForDay(this.workouts.items(), day, weight) +
      swimKcalForDay(this.swims.items(), day, weight) +
      bikeKcalForDay(this.bikes.items(), day, weight) +
      climbingKcalForDay(this.climbs.items(), day, weight)
    );
  });

  readonly summary = computed<TodayNutritionSummary>(() => {
    const totals = computeDailyNutrition(this.todaysMeals(), this.recipes.items(), this.foods.items());
    const tdee = computeTdee(toTdeeInput(this.profile.profile()), today(), this.activityExtraKcal());
    if (!tdee.computable) {
      return { computable: false, incomplete: totals.incomplete, kcal: EMPTY, proteinG: EMPTY, carbsG: EMPTY, fatG: EMPTY };
    }
    return {
      computable: true,
      incomplete: totals.incomplete,
      kcal: { intake: totals.kcal, goal: tdee.dailyAllowanceKcal },
      proteinG: { intake: totals.proteinG, goal: tdee.macros.proteinGoalG },
      carbsG: { intake: totals.carbsG, goal: tdee.macros.carbsGoalG },
      fatG: { intake: totals.fatG, goal: tdee.macros.fatGoalG },
    };
  });

  /** Load every repository the summary reads. Safe to call on each `HomePage` entry. */
  async load(): Promise<void> {
    await Promise.all([
      this.meals.load(),
      this.recipes.load(),
      this.foods.load(),
      this.profile.load(),
      this.workouts.load(),
      this.swims.load(),
      this.bikes.load(),
      this.climbs.load(),
      this.steps.load(),
    ]);
  }
}

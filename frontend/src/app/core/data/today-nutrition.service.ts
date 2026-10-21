import { Injectable, computed, inject } from '@angular/core';

import { today } from '../../shared/local-date';
import { deviceTimeZoneId } from '../../shared/timezone';
import { ActivityLogs, NutrientProgress, NutritionSummary, nutritionForDays } from './day-summary';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { FoodRepository } from './food.repository';
import { MealRepository } from './meal.repository';
import { ProfileRepository } from './profile.repository';
import { RecipeRepository } from './recipe.repository';
import { SwimLogRepository } from './swim-log.repository';
import { StretchSessionRepository } from './stretch-session.repository';
import { VolleyballLogRepository } from './volleyball-log.repository';
import { WorkoutSessionRepository } from './workout-session.repository';

export type { NutrientProgress };
export type TodayNutritionSummary = NutritionSummary;

/**
 * documentation/Features/Kezdőlap.md — the "Mai étkezés állása" home widget's data source (`backlog/095`).
 * Reuses the exact `MealDashboardPage` chain — `computeDailyNutrition` over today's meals +
 * `computeTdee(activityExtraKcal)` — so the widget and the Étkezés dashboard agree; the math lives in
 * `day-summary.ts` (`nutritionForDays` over `[today]`), shared with the weekly overview (`backlog/233`).
 * All inputs are repository signals (local store), so `summary` recomputes live after a delta pull and
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
  private readonly volleyballs = inject(VolleyballLogRepository);
  private readonly stretches = inject(StretchSessionRepository);
  private readonly climbs = inject(ClimbingSessionRepository);
  private readonly steps = inject(DailyStepLogRepository);

  private readonly logs = computed<ActivityLogs>(() => ({
    steps: this.steps.items(),
    workouts: this.workouts.items(),
    climbs: this.climbs.items(),
    swims: this.swims.items(),
    bikes: this.bikes.items(),
    volleyballs: this.volleyballs.items(),
    stretches: this.stretches.items(),
  }));

  readonly summary = computed<TodayNutritionSummary>(() =>
    nutritionForDays(
      {
        meals: this.meals.items(),
        recipes: this.recipes.items(),
        foods: this.foods.items(),
        profile: this.profile.profile(),
        logs: this.logs(),
      },
      [today()],
      deviceTimeZoneId(),
    ),
  );

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
      this.volleyballs.load(),
      this.stretches.load(),
      this.climbs.load(),
      this.steps.load(),
    ]);
  }
}

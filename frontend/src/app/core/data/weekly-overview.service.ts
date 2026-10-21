import { Injectable, computed, inject, signal } from '@angular/core';

import { addDaysIso, daysInRange, startOfIsoWeek, today } from '../../shared/local-date';
import { deviceTimeZoneId } from '../../shared/timezone';
import { ActivityLogs, NutritionSummary, WorkoutsSummary, nutritionForDays, workoutsForDays } from './day-summary';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { FoodRepository } from './food.repository';
import { MealRepository } from './meal.repository';
import { ProfileRepository } from './profile.repository';
import { RecipeRepository } from './recipe.repository';
import { StretchSessionRepository } from './stretch-session.repository';
import { SwimLogRepository } from './swim-log.repository';
import { VolleyballLogRepository } from './volleyball-log.repository';
import { WorkoutSessionRepository } from './workout-session.repository';

/**
 * documentation/Subfeatures/Heti adatok.md — the weekly overview's data source (`backlog/233`).
 * A Monday–Sunday week (`weekStart`), counted up to today in the current week and in full for a
 * past one; the nutrition and workout summaries are `day-summary.ts` over those counted days — the
 * exact functions behind the home screen's "today" widgets, so a week is always the Σ of its days.
 * Repository signals only (local store) — Full-offline safe, [[Backend-offline first]].
 */
@Injectable({ providedIn: 'root' })
export class WeeklyOverviewService {
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

  /** Monday of the shown week (`YYYY-MM-DD`). */
  readonly weekStart = signal(startOfIsoWeek(today()));
  readonly weekEnd = computed(() => addDaysIso(this.weekStart(), 6));
  readonly isCurrentWeek = computed(() => this.weekStart() === startOfIsoWeek(today()));

  /** The days the summaries count: Monday → today in the current week, all 7 for a past week. */
  readonly countedDays = computed(() => {
    const now = today();
    const end = this.weekEnd() < now ? this.weekEnd() : now;
    return daysInRange(this.weekStart(), end);
  });

  private readonly logs = computed<ActivityLogs>(() => ({
    steps: this.steps.items(),
    workouts: this.workouts.items(),
    climbs: this.climbs.items(),
    swims: this.swims.items(),
    bikes: this.bikes.items(),
    volleyballs: this.volleyballs.items(),
    stretches: this.stretches.items(),
  }));

  readonly nutrition = computed<NutritionSummary>(() =>
    nutritionForDays(
      {
        meals: this.meals.items(),
        recipes: this.recipes.items(),
        foods: this.foods.items(),
        profile: this.profile.profile(),
        logs: this.logs(),
      },
      this.countedDays(),
      deviceTimeZoneId(),
    ),
  );

  readonly workoutsSummary = computed<WorkoutsSummary>(() =>
    workoutsForDays(this.logs(), this.countedDays(), this.profile.profile()?.currentWeightKg ?? null),
  );

  showCurrentWeek(): void {
    this.weekStart.set(startOfIsoWeek(today()));
  }

  previousWeek(): void {
    this.weekStart.update((start) => addDaysIso(start, -7));
  }

  /** No-op on the current week — the future isn't navigable. */
  nextWeek(): void {
    if (!this.isCurrentWeek()) {
      this.weekStart.update((start) => addDaysIso(start, 7));
    }
  }

  /** Load every repository the summaries read. Safe to call on each page entry. */
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

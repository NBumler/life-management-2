import { Injectable, computed, inject } from '@angular/core';

import { today } from '../../shared/local-date';
import { ActivityTally, WorkoutsSummary, workoutsForDays } from './day-summary';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { ProfileRepository } from './profile.repository';
import { SwimLogRepository } from './swim-log.repository';
import { StretchSessionRepository } from './stretch-session.repository';
import { VolleyballLogRepository } from './volleyball-log.repository';
import { WorkoutSessionRepository } from './workout-session.repository';

export type TodayActivityTally = ActivityTally;
export type TodayWorkoutsSummary = WorkoutsSummary;

/**
 * documentation/Features/Kezdőlap.md — the "Mai edzések" home widget's data source (`backlog/112`).
 * Per-activity breakdown of today's logged workouts + their `activity-kcal.ts` calorie contribution,
 * so the widget can show each activity individually as well as the combined total (the same total
 * {@link TodayNutritionService.summary}'s `activityExtraKcal` folds into the TDEE). The math lives in
 * `day-summary.ts` (`workoutsForDays` over `[today]`), shared with the weekly overview (`backlog/233`).
 * All inputs are repository signals (local store), so `summary` recomputes live after a delta pull and
 * works Full-offline — [[Backend-offline first]].
 */
@Injectable({ providedIn: 'root' })
export class TodayWorkoutsService {
  private readonly profile = inject(ProfileRepository);
  private readonly steps = inject(DailyStepLogRepository);
  private readonly workouts = inject(WorkoutSessionRepository);
  private readonly climbs = inject(ClimbingSessionRepository);
  private readonly swims = inject(SwimLogRepository);
  private readonly bikes = inject(BikeRideLogRepository);
  private readonly volleyballs = inject(VolleyballLogRepository);
  private readonly stretches = inject(StretchSessionRepository);

  readonly summary = computed<TodayWorkoutsSummary>(() =>
    workoutsForDays(
      {
        steps: this.steps.items(),
        workouts: this.workouts.items(),
        climbs: this.climbs.items(),
        swims: this.swims.items(),
        bikes: this.bikes.items(),
        volleyballs: this.volleyballs.items(),
        stretches: this.stretches.items(),
      },
      [today()],
      this.profile.profile()?.currentWeightKg ?? null,
    ),
  );

  /** Load every repository the summary reads. Safe to call on each `HomePage` entry. */
  async load(): Promise<void> {
    await Promise.all([
      this.profile.load(),
      this.steps.load(),
      this.workouts.load(),
      this.climbs.load(),
      this.swims.load(),
      this.bikes.load(),
      this.volleyballs.load(),
      this.stretches.load(),
    ]);
  }
}

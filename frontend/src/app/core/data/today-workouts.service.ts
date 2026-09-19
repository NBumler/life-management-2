import { Injectable, computed, inject } from '@angular/core';

import { today } from '../../shared/local-date';
import {
  bikeKcalForDay,
  climbingKcalForDay,
  stepKcalForDay,
  swimKcalForDay,
  workoutKcalForDay,
} from './activity-kcal';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { ProfileRepository } from './profile.repository';
import { SwimLogRepository } from './swim-log.repository';
import { WorkoutSessionRepository } from './workout-session.repository';

/** One activity type's today-so-far tally. */
export interface TodayActivityTally {
  /** Number of live log rows today (0 or 1 for steps, one row per day; 0+ for the rest). */
  count: number;
  kcal: number;
}

export interface TodayWorkoutsSummary {
  steps: TodayActivityTally & { stepCount: number };
  workout: TodayActivityTally;
  climbing: TodayActivityTally;
  swim: TodayActivityTally;
  bike: TodayActivityTally;
  totalKcal: number;
}

/**
 * documentation/Features/Kezdőlap.md — the "Mai edzések" home widget's data source (`backlog/112`).
 * Per-activity breakdown of today's logged workouts + their `activity-kcal.ts` calorie contribution,
 * so the widget can show each activity individually as well as the combined total (the same total
 * {@link TodayNutritionService.summary}'s `activityExtraKcal` folds into the TDEE). All inputs are
 * repository signals (local store), so `summary` recomputes live after a delta pull and works
 * Full-offline — [[Backend-offline first]].
 */
@Injectable({ providedIn: 'root' })
export class TodayWorkoutsService {
  private readonly profile = inject(ProfileRepository);
  private readonly steps = inject(DailyStepLogRepository);
  private readonly workouts = inject(WorkoutSessionRepository);
  private readonly climbs = inject(ClimbingSessionRepository);
  private readonly swims = inject(SwimLogRepository);
  private readonly bikes = inject(BikeRideLogRepository);

  readonly summary = computed<TodayWorkoutsSummary>(() => {
    const day = today();
    const weight = this.profile.profile()?.currentWeightKg ?? null;

    const stepLog = this.steps.items().find((log) => !log.deleted && log.date === day);
    const workoutCount = this.workouts.items().filter((s) => !s.deleted && s.date === day).length;
    const climbCount = this.climbs.items().filter((s) => !s.deleted && s.date === day).length;
    const swimCount = this.swims.items().filter((s) => !s.deleted && s.date === day).length;
    const bikeCount = this.bikes.items().filter((s) => !s.deleted && s.date === day).length;

    const steps = { count: stepLog === undefined ? 0 : 1, stepCount: stepLog?.stepCount ?? 0, kcal: stepKcalForDay(this.steps.items(), day, weight) };
    const workout = { count: workoutCount, kcal: workoutKcalForDay(this.workouts.items(), day, weight) };
    const climbing = { count: climbCount, kcal: climbingKcalForDay(this.climbs.items(), day, weight) };
    const swim = { count: swimCount, kcal: swimKcalForDay(this.swims.items(), day, weight) };
    const bike = { count: bikeCount, kcal: bikeKcalForDay(this.bikes.items(), day, weight) };

    return {
      steps,
      workout,
      climbing,
      swim,
      bike,
      totalKcal: steps.kcal + workout.kcal + climbing.kcal + swim.kcal + bike.kcal,
    };
  });

  /** Load every repository the summary reads. Safe to call on each `HomePage` entry. */
  async load(): Promise<void> {
    await Promise.all([
      this.profile.load(),
      this.steps.load(),
      this.workouts.load(),
      this.climbs.load(),
      this.swims.load(),
      this.bikes.load(),
    ]);
  }
}

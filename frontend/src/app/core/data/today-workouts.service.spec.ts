import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BikeRideLog } from '../../api/model/bikeRideLog';
import { ClimbingSession } from '../../api/model/climbingSession';
import { DailyStepLog } from '../../api/model/dailyStepLog';
import { SwimLog } from '../../api/model/swimLog';
import { UserProfile } from '../../api/model/userProfile';
import { WorkoutSession } from '../../api/model/workoutSession';
import { today } from '../../shared/local-date';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { ProfileRepository } from './profile.repository';
import { SwimLogRepository } from './swim-log.repository';
import { TodayWorkoutsService } from './today-workouts.service';
import { WorkoutSessionRepository } from './workout-session.repository';

// documentation/Features/Kezdőlap.md — the "Mai edzések" widget data source (backlog/112).
function fullProfile(weightKg: number): UserProfile {
  return {
    birthDate: '1990-01-01',
    sex: 'MALE',
    heightCm: 180,
    currentWeightKg: weightKg,
    goal: 'MAINTENANCE',
    kgPerWeek: null,
  } as UserProfile;
}

describe('TodayWorkoutsService', () => {
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let steps: ReturnType<typeof signal<DailyStepLog[]>>;
  let workouts: ReturnType<typeof signal<WorkoutSession[]>>;
  let climbs: ReturnType<typeof signal<ClimbingSession[]>>;
  let swims: ReturnType<typeof signal<SwimLog[]>>;
  let bikes: ReturnType<typeof signal<BikeRideLog[]>>;
  const loads: jasmine.Spy[] = [];

  function configure(): TodayWorkoutsService {
    profile = signal<UserProfile | null>(null);
    steps = signal<DailyStepLog[]>([]);
    workouts = signal<WorkoutSession[]>([]);
    climbs = signal<ClimbingSession[]>([]);
    swims = signal<SwimLog[]>([]);
    bikes = signal<BikeRideLog[]>([]);
    loads.length = 0;

    function repoProvider<T>(token: unknown, items: ReturnType<typeof signal<T[]>>) {
      const load = jasmine.createSpy('load').and.resolveTo(undefined);
      loads.push(load);
      return { provide: token, useValue: { items, load } };
    }
    const profileLoad = jasmine.createSpy('profileLoad').and.resolveTo(undefined);
    loads.push(profileLoad);

    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileRepository, useValue: { profile, load: profileLoad } },
        repoProvider(DailyStepLogRepository, steps),
        repoProvider(WorkoutSessionRepository, workouts),
        repoProvider(ClimbingSessionRepository, climbs),
        repoProvider(SwimLogRepository, swims),
        repoProvider(BikeRideLogRepository, bikes),
      ],
    });
    return TestBed.inject(TodayWorkoutsService);
  }

  it('is all-zero with no logs and no profile weight', () => {
    const service = configure();
    const s = service.summary();

    expect(s.steps).toEqual({ count: 0, stepCount: 0, kcal: 0 });
    expect(s.workout).toEqual({ count: 0, kcal: 0 });
    expect(s.climbing).toEqual({ count: 0, kcal: 0 });
    expect(s.swim).toEqual({ count: 0, kcal: 0 });
    expect(s.bike).toEqual({ count: 0, kcal: 0 });
    expect(s.totalKcal).toBe(0);
  });

  it('counts only today\'s live rows per activity and sums their kcal into totalKcal', () => {
    const service = configure();
    profile.set(fullProfile(80));
    const day = today();

    steps.set([{ id: 's1', date: day, stepCount: 8000, deleted: false }]);
    workouts.set([
      { id: 'w1', date: day, workoutType: 'GENERAL_WEIGHTS', durationMinutes: 45, deleted: false } as WorkoutSession,
      { id: 'w2', date: '2000-01-01', workoutType: 'GENERAL_WEIGHTS', durationMinutes: 45, deleted: false } as WorkoutSession,
    ]);
    climbs.set([
      { id: 'c1', date: day, locationType: 'INDOOR', discipline: 'BOULDER', totalSessionDurationMinutes: 60, attempts: [], deleted: false } as ClimbingSession,
    ]);
    swims.set([{ id: 'sw1', date: day, durationMinutes: 30, intensity: 'CRAWL_FREESTYLE', deleted: false } as SwimLog]);
    bikes.set([{ id: 'b1', date: day, durationMinutes: 40, intensity: 'ROAD_LEISURE', deleted: false } as BikeRideLog]);

    const s = service.summary();
    expect(s.steps.stepCount).toBe(8000);
    expect(s.steps.kcal).toBeGreaterThan(0);
    expect(s.workout.count).toBe(1); // the other-day session is excluded
    expect(s.workout.kcal).toBeGreaterThan(0);
    expect(s.climbing.count).toBe(1);
    expect(s.swim.count).toBe(1);
    expect(s.bike.count).toBe(1);
    expect(s.totalKcal).toBeCloseTo(
      s.steps.kcal + s.workout.kcal + s.climbing.kcal + s.swim.kcal + s.bike.kcal,
      6,
    );
  });

  it('load() loads every underlying repository', async () => {
    const service = configure();
    await service.load();

    expect(loads.length).toBe(6);
    for (const load of loads) {
      expect(load).toHaveBeenCalledTimes(1);
    }
  });
});

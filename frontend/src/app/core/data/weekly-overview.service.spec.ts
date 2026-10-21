import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DailyStepLog } from '../../api/model/dailyStepLog';
import { UserProfile } from '../../api/model/userProfile';
import { addDaysIso, startOfIsoWeek, today } from '../../shared/local-date';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { FoodRepository } from './food.repository';
import { MealRepository } from './meal.repository';
import { ProfileRepository } from './profile.repository';
import { RecipeRepository } from './recipe.repository';
import { StretchSessionRepository } from './stretch-session.repository';
import { SwimLogRepository } from './swim-log.repository';
import { TodayNutritionService } from './today-nutrition.service';
import { TodayWorkoutsService } from './today-workouts.service';
import { VolleyballLogRepository } from './volleyball-log.repository';
import { WeeklyOverviewService } from './weekly-overview.service';
import { WorkoutSessionRepository } from './workout-session.repository';

// documentation/Subfeatures/Heti adatok.md (backlog/233).
const ITEM_REPOS = [
  MealRepository,
  RecipeRepository,
  FoodRepository,
  WorkoutSessionRepository,
  SwimLogRepository,
  BikeRideLogRepository,
  VolleyballLogRepository,
  StretchSessionRepository,
  ClimbingSessionRepository,
];

function fullProfile(): UserProfile {
  return {
    birthDate: '1990-01-01',
    sex: 'MALE',
    heightCm: 180,
    currentWeightKg: 80,
    goal: 'MAINTENANCE',
    kgPerWeek: null,
  } as UserProfile;
}

describe('WeeklyOverviewService', () => {
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let steps: ReturnType<typeof signal<DailyStepLog[]>>;
  const loads: jasmine.Spy[] = [];

  function configure(): WeeklyOverviewService {
    profile = signal<UserProfile | null>(fullProfile());
    steps = signal<DailyStepLog[]>([]);
    loads.length = 0;

    function repo(token: unknown, items = signal<unknown[]>([])) {
      const load = jasmine.createSpy('load').and.resolveTo(undefined);
      loads.push(load);
      return { provide: token, useValue: { items, load } };
    }
    const profileLoad = jasmine.createSpy('profileLoad').and.resolveTo(undefined);
    loads.push(profileLoad);

    TestBed.configureTestingModule({
      providers: [
        ...ITEM_REPOS.map((token) => repo(token)),
        repo(DailyStepLogRepository, steps as ReturnType<typeof signal<unknown[]>>),
        { provide: ProfileRepository, useValue: { profile, load: profileLoad } },
      ],
    });
    return TestBed.inject(WeeklyOverviewService);
  }

  afterEach(() => jasmine.clock().uninstall());

  /** Pin "today" to a Wednesday so the current week counts Mon → Wed. */
  function onWednesday(): void {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 21, 12, 0, 0));
  }

  it('opens on the current week, counted Monday → today', () => {
    onWednesday();
    const service = configure();

    expect(service.weekStart()).toBe('2026-10-19');
    expect(service.weekEnd()).toBe('2026-10-25');
    expect(service.isCurrentWeek()).toBe(true);
    expect(service.countedDays()).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
  });

  it('a past week counts all 7 days; next never steps past the current week', () => {
    onWednesday();
    const service = configure();

    service.nextWeek();
    expect(service.weekStart()).toBe('2026-10-19');

    service.previousWeek();
    expect(service.weekStart()).toBe('2026-10-12');
    expect(service.isCurrentWeek()).toBe(false);
    expect(service.countedDays().length).toBe(7);

    service.nextWeek();
    expect(service.isCurrentWeek()).toBe(true);

    service.previousWeek();
    service.previousWeek();
    service.showCurrentWeek();
    expect(service.weekStart()).toBe('2026-10-19');
  });

  it('on a Monday the week equals the home screen\'s today widgets exactly', () => {
    const day = today();
    const service = configure();
    service.weekStart.set(day); // treat today as the week's first counted day
    steps.set([{ id: 's1', date: day, stepCount: 11000, deleted: false }]);

    const todayNutrition = TestBed.inject(TodayNutritionService);
    const todayWorkouts = TestBed.inject(TodayWorkoutsService);
    expect(service.countedDays()).toEqual([day]);
    expect(service.nutrition()).toEqual(todayNutrition.summary());
    expect(service.workoutsSummary()).toEqual(todayWorkouts.summary());
  });

  it('sums the counted days of the shown week only', () => {
    const service = configure();
    const monday = startOfIsoWeek(today());
    steps.set([
      { id: 's1', date: monday, stepCount: 4000, deleted: false },
      { id: 's0', date: addDaysIso(monday, -1), stepCount: 9000, deleted: false },
    ]);

    expect(service.workoutsSummary().steps.stepCount).toBe(4000);
    service.previousWeek();
    expect(service.workoutsSummary().steps.stepCount).toBe(9000);
  });

  it('load() loads every underlying repository', async () => {
    const service = configure();
    await service.load();

    expect(loads.length).toBe(11);
    for (const load of loads) {
      expect(load).toHaveBeenCalledTimes(1);
    }
  });
});

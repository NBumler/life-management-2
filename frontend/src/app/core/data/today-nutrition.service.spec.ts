import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UserProfile } from '../../api/model/userProfile';
import { BikeRideLogRepository } from './bike-ride-log.repository';
import { ClimbingSessionRepository } from './climbing-session.repository';
import { DailyStepLogRepository } from './daily-step-log.repository';
import { FoodRepository } from './food.repository';
import { MealRepository } from './meal.repository';
import { ProfileRepository } from './profile.repository';
import { RecipeRepository } from './recipe.repository';
import { SwimLogRepository } from './swim-log.repository';
import { TodayNutritionService } from './today-nutrition.service';
import { WorkoutSessionRepository } from './workout-session.repository';

// documentation/Features/Kezdőlap.md — the "Mai étkezés állása" widget data source (backlog/095).
const ITEM_REPOS = [
  MealRepository,
  RecipeRepository,
  FoodRepository,
  WorkoutSessionRepository,
  SwimLogRepository,
  BikeRideLogRepository,
  ClimbingSessionRepository,
  DailyStepLogRepository,
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

describe('TodayNutritionService', () => {
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  const loads: jasmine.Spy[] = [];

  function configure(): TodayNutritionService {
    profile = signal<UserProfile | null>(null);
    loads.length = 0;

    const providers = ITEM_REPOS.map((token) => {
      const load = jasmine.createSpy('load').and.resolveTo(undefined);
      loads.push(load);
      return { provide: token, useValue: { items: signal([]), load } };
    });
    const profileLoad = jasmine.createSpy('profileLoad').and.resolveTo(undefined);
    loads.push(profileLoad);

    TestBed.configureTestingModule({
      providers: [...providers, { provide: ProfileRepository, useValue: { profile, load: profileLoad } }],
    });
    return TestBed.inject(TodayNutritionService);
  }

  it('is not computable and reports zeroed progress when the profile has no TDEE inputs', () => {
    const service = configure();
    const s = service.summary();

    expect(s.computable).toBe(false);
    expect(s.kcal).toEqual({ intake: 0, goal: 0 });
    expect(s.proteinG).toEqual({ intake: 0, goal: 0 });
  });

  it('computes goals from the profile once complete; intake is 0 with no meals today', () => {
    const service = configure();
    profile.set(fullProfile());

    const s = service.summary();
    expect(s.computable).toBe(true);
    expect(s.kcal.intake).toBe(0);
    expect(s.kcal.goal).toBeGreaterThan(0);
    expect(s.proteinG.goal).toBeGreaterThan(0);
    expect(s.carbsG.goal).toBeGreaterThan(0);
    expect(s.fatG.goal).toBeGreaterThan(0);
  });

  it('load() loads every underlying repository', async () => {
    const service = configure();
    await service.load();

    expect(loads.length).toBe(9);
    for (const load of loads) {
      expect(load).toHaveBeenCalledTimes(1);
    }
  });
});

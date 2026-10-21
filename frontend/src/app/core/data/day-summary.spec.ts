import { Meal } from '../../api/model/meal';
import { MealItem } from '../../api/model/mealItem';
import { SwimLog } from '../../api/model/swimLog';
import { UserProfile } from '../../api/model/userProfile';
import { ActivityLogs, NutritionInputs, nutritionForDays, workoutsForDays } from './day-summary';

// documentation/Subfeatures/Heti adatok.md (backlog/233) — the week is the Σ of its days.
const ZONE = 'Europe/Budapest';
const MON = '2026-10-19';
const TUE = '2026-10-20';
const WED = '2026-10-21';

function profile(): UserProfile {
  return {
    birthDate: '1990-01-01',
    sex: 'MALE',
    heightCm: 180,
    currentWeightKg: 80,
    goal: 'MAINTENANCE',
    kgPerWeek: null,
  } as UserProfile;
}

function customItem(mealId: string, kcal: number): MealItem {
  return {
    id: `${mealId}-item`,
    mealId,
    type: 'CUSTOM',
    displayName: 'Torta',
    caloriesKcal: kcal,
    proteinG: 10,
    carbsG: 20,
    fatG: 5,
    priceHuf: 0,
    servings: 1,
    sortOrder: 0,
    deleted: false,
  };
}

/** A meal at local noon on `day` (Budapest is UTC+1/+2, so 10:00Z stays on the same calendar day). */
function meal(id: string, day: string, kcal: number): Meal {
  return { id, eatenAt: `${day}T10:00:00.000Z`, timeZoneId: ZONE, note: null, deleted: false, items: [customItem(id, kcal)] };
}

function logs(overrides: Partial<ActivityLogs> = {}): ActivityLogs {
  return { steps: [], workouts: [], climbs: [], swims: [], bikes: [], volleyballs: [], stretches: [], ...overrides };
}

function inputs(overrides: Partial<NutritionInputs> = {}): NutritionInputs {
  return { meals: [], recipes: [], foods: [], profile: profile(), logs: logs(), ...overrides };
}

describe('nutritionForDays()', () => {
  it('sums the intake of the counted days only', () => {
    const meals = [meal('m1', MON, 500), meal('m2', TUE, 700), meal('m3', WED, 900)];

    const s = nutritionForDays(inputs({ meals }), [MON, TUE], ZONE);
    expect(s.computable).toBe(true);
    expect(s.kcal.intake).toBe(1200);
    expect(s.proteinG.intake).toBe(20);
  });

  it('the goal is the Σ of each counted day\'s own goal, activity kcal included per day', () => {
    const activity = logs({
      steps: [{ id: 's1', date: TUE, stepCount: 13000, deleted: false }],
      swims: [{ id: 'sw1', date: WED, durationMinutes: 30, intensity: 'CRAWL_FREESTYLE', deleted: false } as SwimLog],
    });
    const input = inputs({ logs: activity });

    const week = nutritionForDays(input, [MON, TUE, WED], ZONE);
    const perDay = [MON, TUE, WED].map((day) => nutritionForDays(input, [day], ZONE));

    expect(perDay[1].kcal.goal).toBeGreaterThan(perDay[0].kcal.goal); // the step day earns extra
    expect(perDay[2].kcal.goal).toBeGreaterThan(perDay[0].kcal.goal); // so does the swim day
    expect(week.kcal.goal).toBeCloseTo(perDay.reduce((sum, d) => sum + d.kcal.goal, 0), 6);
    expect(week.proteinG.goal).toBeCloseTo(perDay.reduce((sum, d) => sum + d.proteinG.goal, 0), 6);
    expect(week.carbsG.goal).toBeCloseTo(perDay.reduce((sum, d) => sum + d.carbsG.goal, 0), 6);
    expect(week.fatG.goal).toBeCloseTo(perDay.reduce((sum, d) => sum + d.fatG.goal, 0), 6);
  });

  it('is not computable without TDEE inputs, nor for an empty day list', () => {
    expect(nutritionForDays(inputs({ profile: null }), [MON], ZONE).computable).toBe(false);
    expect(nutritionForDays(inputs(), [], ZONE).computable).toBe(false);
  });

  it('flags incomplete when a counted day\'s item references a missing food', () => {
    const broken: Meal = {
      ...meal('m1', MON, 0),
      items: [{ ...customItem('m1', 0), type: 'FOOD', foodId: 'gone', quantityAmount: 100, quantityUnit: 'g' } as MealItem],
    };
    expect(nutritionForDays(inputs({ meals: [broken] }), [MON], ZONE).incomplete).toBe(true);
    expect(nutritionForDays(inputs({ meals: [broken] }), [TUE], ZONE).incomplete).toBe(false);
  });
});

describe('workoutsForDays()', () => {
  it('counts live rows and sums kcal + steps over the counted days', () => {
    const activity = logs({
      steps: [
        { id: 's1', date: MON, stepCount: 8000, deleted: false },
        { id: 's2', date: TUE, stepCount: 5000, deleted: false },
        { id: 's3', date: WED, stepCount: 20000, deleted: false },
      ],
      volleyballs: [
        { id: 'v1', date: MON, durationMinutes: 90, deleted: false },
        { id: 'v2', date: TUE, durationMinutes: 60, deleted: false },
        { id: 'v3', date: TUE, durationMinutes: 60, deleted: true },
      ],
    });

    const s = workoutsForDays(activity, [MON, TUE], 80);
    expect(s.steps.count).toBe(2);
    expect(s.steps.stepCount).toBe(13000);
    expect(s.volleyball.count).toBe(2);
    expect(s.volleyball.kcal).toBeCloseTo(2.0 * 80 * 2.5, 6);
    expect(s.totalKcal).toBeCloseTo(s.steps.kcal + s.volleyball.kcal, 6);
  });

  it('a week\'s totals equal the Σ of its single days', () => {
    const activity = logs({
      steps: [
        { id: 's1', date: MON, stepCount: 8000, deleted: false },
        { id: 's2', date: WED, stepCount: 12000, deleted: false },
      ],
      swims: [{ id: 'sw1', date: TUE, durationMinutes: 30, intensity: 'CRAWL_FREESTYLE', deleted: false } as SwimLog],
    });
    const days = [MON, TUE, WED];

    const week = workoutsForDays(activity, days, 80);
    const perDay = days.map((day) => workoutsForDays(activity, [day], 80));

    expect(week.totalKcal).toBeCloseTo(perDay.reduce((sum, d) => sum + d.totalKcal, 0), 6);
    expect(week.steps.stepCount).toBe(perDay.reduce((sum, d) => sum + d.steps.stepCount, 0));
    expect(week.swim.count).toBe(1);
  });
});

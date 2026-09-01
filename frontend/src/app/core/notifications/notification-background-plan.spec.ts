import { Food } from '../../api/model/food';
import { StoredFood } from '../../api/model/storedFood';
import { CalorieStreakDay } from './notification-rules';
import { BackgroundPlanSources, FIXED_HORIZON_DAYS, buildBackgroundPlan } from './notification-background-plan';
import { NOTIFICATION_TYPES, NotificationType } from './notification-types';

const ALL_TYPES = new Set<NotificationType>(NOTIFICATION_TYPES);

function storedFood(overrides: Partial<StoredFood>): StoredFood {
  return {
    id: 'sf-1',
    foodId: 'food-1',
    quantityAmount: 1,
    quantityUnit: 'db',
    storageLocation: StoredFood.StorageLocationEnum.Fridge,
    expiresOn: '2026-09-10',
    opened: false,
    deleted: false,
    ...overrides,
  };
}

function food(overrides: Partial<Food>): Food {
  return { id: 'food-1', name: 'Tej', deleted: false, ...overrides };
}

function sources(overrides: Partial<BackgroundPlanSources> = {}): BackgroundPlanSources {
  return {
    storedFoods: [],
    foods: [],
    householdTasks: [],
    calorieStreakToday: [],
    ...overrides,
  };
}

const TODAY = '2026-09-01';

describe('buildBackgroundPlan', () => {
  it('projects FOOD_EXPIRING_DAILY one entry per day across the fixed horizon', () => {
    // expiry 2026-09-04, no catalog time → 2-day lead → window opens 2026-09-02
    const item = storedFood({ expiresOn: '2026-09-04' });

    const plan = buildBackgroundPlan(ALL_TYPES, sources({ storedFoods: [item], foods: [food({})] }), TODAY);

    const foodKeys = plan.entries.filter((e) => e.type === 'FOOD_EXPIRING_DAILY').map((e) => e.key);
    // today (09-01) is still outside the window; 09-02 and 09-03 are inside
    expect(foodKeys).toEqual(['sf-1:2026-09-02', 'sf-1:2026-09-03']);
  });

  it('collapses lifetime-keyed FOOD_SPOILED_ONCE to a single earliest entry', () => {
    // already spoiled today → the rule yields it for 09-01, 09-02, 09-03 with the same key `sf-1`
    const item = storedFood({ expiresOn: '2026-08-20' });

    const plan = buildBackgroundPlan(ALL_TYPES, sources({ storedFoods: [item], foods: [food({})] }), TODAY);

    const spoiled = plan.entries.filter((e) => e.type === 'FOOD_SPOILED_ONCE');
    expect(spoiled.length).toBe(1);
    expect(spoiled[0].fireAt).toBe('2026-09-01T09:00:00');
  });

  it('projects the HOUSEHOLD_TASK_DUE digest per calendar day', () => {
    const tasks = [
      { id: 't1', name: 'Porszívó', nextDue: '2026-09-01', deleted: false },
      { id: 't2', name: 'Mosás', nextDue: '2026-09-03', deleted: false },
    ];

    const plan = buildBackgroundPlan(ALL_TYPES, sources({ householdTasks: tasks }), TODAY);

    const digest = plan.entries.filter((e) => e.type === 'HOUSEHOLD_TASK_DUE');
    // 09-01: only t1 due (1 → name). 09-02: still only t1. 09-03: t1 + t2 (2 → count).
    expect(digest.map((e) => e.key)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(digest[2].params).toEqual({ count: 2 });
  });

  it('includes CALORIE_STREAK only for today', () => {
    const streak: CalorieStreakDay[] = ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31'].map(
      (date) => ({ date, intakeKcal: 3000, allowanceKcal: 2000 }),
    );

    const plan = buildBackgroundPlan(ALL_TYPES, sources({ calorieStreakToday: streak }), TODAY);

    const cal = plan.entries.filter((e) => e.type === 'CALORIE_STREAK');
    expect(cal.length).toBe(1);
    expect(cal[0].fireAt).toBe('2026-09-01T09:00:00');
  });

  it('never emits EVENT_OCCURRENCE (the live scheduler owns those)', () => {
    const plan = buildBackgroundPlan(ALL_TYPES, sources(), TODAY);
    expect(plan.entries.some((e) => e.type === 'EVENT_OCCURRENCE')).toBeFalse();
  });

  it('returns a STEPS_LOW template only when the type is active', () => {
    const on = buildBackgroundPlan(ALL_TYPES, sources(), TODAY);
    expect(on.stepsLow).toEqual({
      key: TODAY,
      fireAt: '2026-09-01T20:00:00',
      threshold: 2000,
      titleKey: 'NOTIFICATIONS.STEPS_LOW.TITLE',
      bodyKey: 'NOTIFICATIONS.STEPS_LOW.BODY',
      route: '/tabs/menu/steps',
    });

    const off = buildBackgroundPlan(
      new Set([...ALL_TYPES].filter((t) => t !== 'STEPS_LOW')),
      sources(),
      TODAY,
    );
    expect(off.stepsLow).toBeNull();
  });

  it('threads the Lead-time szerkesztő tuning into the STEPS_LOW threshold and the food lead window', () => {
    const item = storedFood({ expiresOn: '2026-09-06' }); // expiry-5 from TODAY
    const catalog = [food({ shelfFridgeAmount: 10, shelfFridgeUnit: 'nap' })];
    const tuning = {
      foodExpiringLeadDaysLong: 5,
      foodExpiringLeadDaysShort: 2,
      stepsLowThreshold: 4000,
      calorieStreakMarginKcal: 750,
    };

    const plan = buildBackgroundPlan(ALL_TYPES, sources({ storedFoods: [item], foods: catalog }), TODAY, tuning);

    expect(plan.stepsLow?.threshold).toBe(4000);
    // long lead widened to 5 → an expiry-5 item is already in the window on TODAY
    expect(plan.entries.some((e) => e.type === 'FOOD_EXPIRING_DAILY' && e.fireAt.startsWith(TODAY))).toBeTrue();
  });

  it('skips a type whose switch is off', () => {
    const item = storedFood({ expiresOn: '2026-09-02' });
    const only = new Set<NotificationType>(['HOUSEHOLD_TASK_DUE']);

    const plan = buildBackgroundPlan(only, sources({ storedFoods: [item], foods: [food({})] }), TODAY);

    expect(plan.entries.every((e) => e.type === 'HOUSEHOLD_TASK_DUE')).toBeTrue();
  });

  it('sorts entries by fire time', () => {
    const item = storedFood({ expiresOn: '2026-09-04' });
    const tasks = [{ id: 't1', name: 'Porszívó', nextDue: '2026-09-01', deleted: false }];

    const plan = buildBackgroundPlan(ALL_TYPES, sources({ storedFoods: [item], foods: [food({})], householdTasks: tasks }), TODAY);

    const times = plan.entries.map((e) => e.fireAt);
    expect(times).toEqual([...times].sort((a, b) => a.localeCompare(b)));
  });

  it('covers exactly FIXED_HORIZON_DAYS days of daily entries', () => {
    const tasks = [{ id: 't1', name: 'X', nextDue: '2026-01-01', deleted: false }];
    const plan = buildBackgroundPlan(ALL_TYPES, sources({ householdTasks: tasks }), TODAY);
    expect(plan.entries.filter((e) => e.type === 'HOUSEHOLD_TASK_DUE').length).toBe(FIXED_HORIZON_DAYS);
  });
});

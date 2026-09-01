import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { StoredFood } from '../../api/model/storedFood';
import {
  CalorieStreakDay,
  calorieStreakRule,
  eventOccurrenceRules,
  foodExpiringDailyRules,
  foodSpoiledOnceRules,
  householdTaskDueRule,
  stepsLowRule,
} from './notification-rules';

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

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'ev-1',
    title: 'Fogorvos',
    location: null,
    notes: null,
    allDay: false,
    date: '2026-09-05',
    startTime: '14:30',
    endTime: '15:00',
    frequency: null,
    interval: 1,
    deleted: false,
    ...overrides,
  };
}

describe('foodExpiringDailyRules', () => {
  const today = '2026-09-01';

  it('uses a 3-day lead window when the catalog shelf-life for the location is more than 5 days', () => {
    // fridge shelf-life 10 days > 5 → window opens 3 days before expiry
    const catalog = [food({ shelfFridgeAmount: 10, shelfFridgeUnit: 'nap' })];
    const nearExpiry = storedFood({ expiresOn: '2026-09-04' }); // today is exactly expiry-3
    const notYet = storedFood({ id: 'sf-2', expiresOn: '2026-09-05' }); // expiry-4, still outside

    const out = foodExpiringDailyRules([nearExpiry, notYet], catalog, today);

    expect(out.map((n) => n.key)).toEqual(['sf-1:2026-09-01']);
    expect(out[0].fireAt).toBe('2026-09-01T09:00:00');
    expect(out[0].type).toBe('FOOD_EXPIRING_DAILY');
    expect(out[0].params).toEqual({ name: 'Tej', date: '2026-09-04' });
  });

  it('uses a 2-day lead window when the catalog shelf-life for the location is 5 days or less', () => {
    const catalog = [food({ shelfFridgeAmount: 5, shelfFridgeUnit: 'nap' })];
    const atWindow = storedFood({ expiresOn: '2026-09-03' }); // expiry-2
    const outside = storedFood({ id: 'sf-2', expiresOn: '2026-09-04' }); // expiry-3

    const out = foodExpiringDailyRules([atWindow, outside], catalog, today);
    expect(out.map((n) => n.key)).toEqual(['sf-1:2026-09-01']);
  });

  it('uses a 2-day lead window when there is no catalog time for the location (or no catalog row)', () => {
    const atWindow = storedFood({ expiresOn: '2026-09-03' });
    const outside = storedFood({ id: 'sf-2', expiresOn: '2026-09-04' });

    const out = foodExpiringDailyRules([atWindow, outside], [], today);
    expect(out.map((n) => n.key)).toEqual(['sf-1:2026-09-01']);
  });

  it('keeps firing after the item has spoiled, as long as it is still in storage', () => {
    const spoiled = storedFood({ expiresOn: '2026-08-20' });
    const out = foodExpiringDailyRules([spoiled], [], today);
    expect(out.length).toBe(1);
  });

  it('skips deleted items', () => {
    const deleted = storedFood({ expiresOn: '2026-09-02', deleted: true });
    expect(foodExpiringDailyRules([deleted], [], today)).toEqual([]);
  });
});

describe('foodSpoiledOnceRules', () => {
  const today = '2026-09-10';

  it('fires once (no calendar day in the key) when the item is past its expiry date', () => {
    const out = foodSpoiledOnceRules([storedFood({ expiresOn: '2026-09-09' })], [food({})], today);
    expect(out.length).toBe(1);
    expect(out[0].key).toBe('sf-1');
    expect(out[0].fireAt).toBe('2026-09-10T09:00:00');
    expect(out[0].params).toEqual({ name: 'Tej', date: '2026-09-09' });
  });

  it('does not fire on the expiry day itself or before it', () => {
    expect(foodSpoiledOnceRules([storedFood({ expiresOn: '2026-09-10' })], [], today)).toEqual([]);
    expect(foodSpoiledOnceRules([storedFood({ expiresOn: '2026-09-11' })], [], today)).toEqual([]);
  });

  it('skips deleted items', () => {
    expect(foodSpoiledOnceRules([storedFood({ expiresOn: '2026-09-01', deleted: true })], [], today)).toEqual([]);
  });
});

describe('stepsLowRule', () => {
  it('fires at 20:00 with the day as key when today is below 2000 steps', () => {
    const out = stepsLowRule(1400, '2026-09-01');
    expect(out.length).toBe(1);
    expect(out[0].fireAt).toBe('2026-09-01T20:00:00');
    expect(out[0].key).toBe('2026-09-01');
    expect(out[0].params).toEqual({ steps: 1400 });
  });

  it('does not fire at exactly 2000 or above', () => {
    expect(stepsLowRule(2000, '2026-09-01')).toEqual([]);
    expect(stepsLowRule(9000, '2026-09-01')).toEqual([]);
  });
});

describe('calorieStreakRule', () => {
  const today = '2026-09-06';
  const over = (date: string): CalorieStreakDay => ({ date, intakeKcal: 3000, allowanceKcal: 2000 });

  it('fires when all 5 closed days exceeded allowance + 750, keyed by the window end (D-1)', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'].map(over);
    const out = calorieStreakRule(days, today);
    expect(out.length).toBe(1);
    expect(out[0].key).toBe('2026-09-05');
    expect(out[0].fireAt).toBe('2026-09-06T09:00:00');
  });

  it('does not fire when a day is only exactly at allowance + 750 (needs strict overshoot)', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map(over);
    days.push({ date: '2026-09-05', intakeKcal: 2750, allowanceKcal: 2000 });
    expect(calorieStreakRule(days, today)).toEqual([]);
  });

  it('does not fire when any day has an unknown (null) allowance', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map(over);
    days.push({ date: '2026-09-05', intakeKcal: 5000, allowanceKcal: null });
    expect(calorieStreakRule(days, today)).toEqual([]);
  });

  it('does not fire when the window is not exactly 5 days', () => {
    expect(calorieStreakRule(['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'].map(over), today)).toEqual([]);
  });
});

describe('householdTaskDueRule', () => {
  const today = '2026-09-06';
  const task = (over: Partial<{ id: string; name: string; nextDue: string; deleted: boolean }>) => ({
    id: 't1',
    name: 'Porszívózás',
    nextDue: '2026-09-06',
    deleted: false,
    ...over,
  });

  it('is empty when nothing is due', () => {
    expect(householdTaskDueRule([task({ nextDue: '2026-09-07' })], today)).toEqual([]);
  });

  it('names the single due task', () => {
    const out = householdTaskDueRule([task({}), task({ id: 't2', nextDue: '2026-09-08' })], today);
    expect(out.length).toBe(1);
    expect(out[0].bodyKey).toBe('NOTIFICATIONS.HOUSEHOLD_TASK_DUE.BODY_ONE');
    expect(out[0].params).toEqual({ name: 'Porszívózás' });
    expect(out[0].key).toBe('2026-09-06');
    expect(out[0].fireAt).toBe('2026-09-06T09:00:00');
  });

  it('counts when 2 or more are due (today + overdue both count)', () => {
    const out = householdTaskDueRule([task({}), task({ id: 't2', nextDue: '2026-09-01' })], today);
    expect(out[0].bodyKey).toBe('NOTIFICATIONS.HOUSEHOLD_TASK_DUE.BODY_MANY');
    expect(out[0].params).toEqual({ count: 2 });
  });

  it('skips deleted tasks', () => {
    expect(householdTaskDueRule([task({ deleted: true })], today)).toEqual([]);
  });
});

describe('eventOccurrenceRules', () => {
  const today = '2026-09-05';
  const now = '2026-09-05T08:00:00';

  it('schedules a timed event at its start time on the occurrence day', () => {
    const out = eventOccurrenceRules([event({ date: '2026-09-20' })], today, now, 30);
    expect(out.length).toBe(1);
    expect(out[0].fireAt).toBe('2026-09-20T14:30:00');
    expect(out[0].key).toBe('ev-1:2026-09-20');
  });

  it('schedules an all-day event at 09:00', () => {
    const out = eventOccurrenceRules([event({ date: '2026-09-20', allDay: true, startTime: null, endTime: null })], today, now, 30);
    expect(out[0].fireAt).toBe('2026-09-20T09:00:00');
  });

  it('skips an occurrence whose moment has already passed today (no late fire)', () => {
    const passed = eventOccurrenceRules([event({ date: '2026-09-05', startTime: '07:00' })], today, now, 30);
    expect(passed).toEqual([]);
    const upcoming = eventOccurrenceRules([event({ date: '2026-09-05', startTime: '09:00' })], today, now, 30);
    expect(upcoming.length).toBe(1);
  });

  it('excludes occurrences beyond the horizon', () => {
    expect(eventOccurrenceRules([event({ date: '2026-10-20' })], today, now, 30)).toEqual([]);
  });

  it('uses the location body variant when the event has a location', () => {
    const out = eventOccurrenceRules([event({ date: '2026-09-20', location: 'Rendelő' })], today, now, 30);
    expect(out[0].bodyKey).toBe('NOTIFICATIONS.EVENT_OCCURRENCE.BODY_LOCATION');
    expect(out[0].params).toEqual({ title: 'Fogorvos', location: 'Rendelő' });
  });

  it('skips deleted events', () => {
    expect(eventOccurrenceRules([event({ date: '2026-09-20', deleted: true })], today, now, 30)).toEqual([]);
  });
});

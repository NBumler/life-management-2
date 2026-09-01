import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { StoredFood } from '../../api/model/storedFood';
import { addDaysIso } from '../../shared/local-date';
import { projectEventOccurrences } from '../data/event-occurrence';
import { addDurationToDate, catalogDurationFor } from '../../pages/food/storage/shelf-life';
import { DesiredNotification } from './notification-types';

/**
 * documentation/Features/Értesítések.md "Aktív típusok (első kör)" — the pure decision layer. Each
 * function takes an already-loaded snapshot of its source data plus the client's "today" (and, where
 * the spec skips a past moment instead of firing it late, "now" as a local wall-clock string) and
 * returns the notifications that should exist. The scheduler turns these into OS notifications and
 * owns dedupe / cancel / immediate-vs-scheduled — none of that lives here.
 *
 * `fireAt` is always a local wall-clock instant `YYYY-MM-DDTHH:mm:ss`.
 */

const AT_0900 = 'T09:00:00';
const AT_2000 = 'T20:00:00';

const FOOD_ROUTE = '/tabs/food/storage';
const STEPS_ROUTE = '/tabs/menu/steps';
const MEAL_ROUTE = '/tabs/food/meal';
const HOUSEHOLD_ROUTE = '/tabs/tasks/household';

/**
 * `FOOD_EXPIRING_DAILY` lead window, in days: `long` when the catalog shelf-life for the location is
 * `> 5 days`, `short` otherwise (and when the catalog has no time for that location). Spec defaults
 * 3 / 2; the "Lead-time szerkesztő" makes them device-local overrides.
 */
export interface FoodExpiringLead {
  long: number;
  short: number;
}

const DEFAULT_FOOD_EXPIRING_LEAD: FoodExpiringLead = { long: 3, short: 2 };
const DEFAULT_STEPS_LOW_THRESHOLD = 2000;
const DEFAULT_CALORIE_STREAK_MARGIN = 750;

/**
 * documentation/Features/Értesítések.md §1 `FOOD_EXPIRING_DAILY`. Lead window starts `lead.long` days
 * before expiry when the catalog shelf-life for that storage location is **> 5 days**, otherwise
 * `lead.short` days (also `short` when the catalog has no time for that location). One per item per
 * calendar day, at 09:00, for as long as the item is still in storage (not deleted) — spoiled or not.
 */
export function foodExpiringDailyRules(
  storedFoods: readonly StoredFood[],
  foods: readonly Food[],
  todayIso: string,
  lead: FoodExpiringLead = DEFAULT_FOOD_EXPIRING_LEAD,
): DesiredNotification[] {
  const out: DesiredNotification[] = [];
  for (const item of storedFoods) {
    if (item.deleted) {
      continue;
    }
    const food = foods.find((f) => f.id === item.foodId && !f.deleted);
    const leadDaysValue = leadDays(food, item.storageLocation, todayIso, lead);
    const windowStart = addDaysIso(item.expiresOn, -leadDaysValue);
    if (todayIso < windowStart) {
      continue;
    }
    out.push({
      type: 'FOOD_EXPIRING_DAILY',
      key: `${item.id}:${todayIso}`,
      fireAt: `${todayIso}${AT_0900}`,
      titleKey: 'NOTIFICATIONS.FOOD_EXPIRING.TITLE',
      bodyKey: 'NOTIFICATIONS.FOOD_EXPIRING.BODY',
      params: { name: food?.name ?? '', date: item.expiresOn },
      route: FOOD_ROUTE,
    });
  }
  return out;
}

/**
 * documentation/Features/Értesítések.md §2 `FOOD_SPOILED_ONCE`. Once per item per lifetime, the first
 * relevant 09:00 after it goes spoiled (`expiresOn < today` — same rule as the storage list badge),
 * or immediately if that 09:00 has already passed when the app is opened (the scheduler decides).
 */
export function foodSpoiledOnceRules(storedFoods: readonly StoredFood[], foods: readonly Food[], todayIso: string): DesiredNotification[] {
  const out: DesiredNotification[] = [];
  for (const item of storedFoods) {
    if (item.deleted || !(item.expiresOn < todayIso)) {
      continue;
    }
    const food = foods.find((f) => f.id === item.foodId && !f.deleted);
    out.push({
      type: 'FOOD_SPOILED_ONCE',
      key: item.id,
      fireAt: `${todayIso}${AT_0900}`,
      titleKey: 'NOTIFICATIONS.FOOD_SPOILED.TITLE',
      bodyKey: 'NOTIFICATIONS.FOOD_SPOILED.BODY',
      params: { name: food?.name ?? '', date: item.expiresOn },
      route: FOOD_ROUTE,
    });
  }
  return out;
}

/**
 * documentation/Features/Értesítések.md §3 `STEPS_LOW`. 20:00, when today's step count is below 2000
 * (a missing day counts as 0). One per day; a later sync raising the count above 2000 does not
 * retract an already-sent banner (handled by the scheduler cancelling the still-pending 20:00 one).
 */
export function stepsLowRule(
  todaySteps: number,
  todayIso: string,
  threshold: number = DEFAULT_STEPS_LOW_THRESHOLD,
): DesiredNotification[] {
  if (todaySteps >= threshold) {
    return [];
  }
  return [
    {
      type: 'STEPS_LOW',
      key: todayIso,
      fireAt: `${todayIso}${AT_2000}`,
      titleKey: 'NOTIFICATIONS.STEPS_LOW.TITLE',
      bodyKey: 'NOTIFICATIONS.STEPS_LOW.BODY',
      params: { steps: todaySteps },
      route: STEPS_ROUTE,
    },
  ];
}

export interface CalorieStreakDay {
  date: string;
  intakeKcal: number;
  /** null when the profile is incomplete for that day → the streak cannot be evaluated. */
  allowanceKcal: number | null;
}

const CALORIE_STREAK_LENGTH = 5;

/**
 * documentation/Features/Értesítések.md §4 `CALORIE_STREAK`. Evaluated at 09:00 over the 5 whole days
 * that close yesterday (`D-5 … D-1`). Fires once when every one of those days had
 * `intake > allowance + marginKcal` (default 750; only overshoot counts). `days` must be exactly
 * those 5, ascending; the
 * key is the window end (`D-1`) so the next day re-evaluates a fresh window.
 */
export function calorieStreakRule(
  days: readonly CalorieStreakDay[],
  todayIso: string,
  marginKcal: number = DEFAULT_CALORIE_STREAK_MARGIN,
): DesiredNotification[] {
  if (days.length !== CALORIE_STREAK_LENGTH) {
    return [];
  }
  const allOver = days.every((day) => day.allowanceKcal !== null && day.intakeKcal > day.allowanceKcal + marginKcal);
  if (!allOver) {
    return [];
  }
  return [
    {
      type: 'CALORIE_STREAK',
      key: addDaysIso(todayIso, -1),
      fireAt: `${todayIso}${AT_0900}`,
      titleKey: 'NOTIFICATIONS.CALORIE_STREAK.TITLE',
      bodyKey: 'NOTIFICATIONS.CALORIE_STREAK.BODY',
      params: { days: CALORIE_STREAK_LENGTH },
      route: MEAL_ROUTE,
    },
  ];
}

export interface HouseholdTaskDue {
  id: string;
  name: string;
  nextDue: string;
  deleted: boolean;
}

/**
 * documentation/Features/Értesítések.md §5 `HOUSEHOLD_TASK_DUE`. One digest per calendar day at 09:00
 * for live tasks whose `nextDue ≤ today`. 1 match → the task name; 2+ → a count. The Naptár's
 * projected occurrences are irrelevant — only the live `nextDue` counts.
 */
export function householdTaskDueRule(tasks: readonly HouseholdTaskDue[], todayIso: string): DesiredNotification[] {
  const due = tasks.filter((task) => !task.deleted && task.nextDue <= todayIso);
  if (due.length === 0) {
    return [];
  }
  return [
    {
      type: 'HOUSEHOLD_TASK_DUE',
      key: todayIso,
      fireAt: `${todayIso}${AT_0900}`,
      titleKey: 'NOTIFICATIONS.HOUSEHOLD_TASK_DUE.TITLE',
      bodyKey: due.length === 1 ? 'NOTIFICATIONS.HOUSEHOLD_TASK_DUE.BODY_ONE' : 'NOTIFICATIONS.HOUSEHOLD_TASK_DUE.BODY_MANY',
      params: due.length === 1 ? { name: due[0].name } : { count: due.length },
      route: HOUSEHOLD_ROUTE,
    },
  ];
}

/**
 * documentation/Features/Értesítések.md §6 `EVENT_OCCURRENCE`. One per (`eventId` + occurrence date)
 * for the live series' occurrences within the horizon. Timed → the occurrence day's `startTime`
 * (client wall clock); all-day → 09:00. A moment that has **already passed** (today's occurrence when
 * the app opens after its start / 09:00) is skipped — never fired late — unlike the other types.
 */
export function eventOccurrenceRules(
  events: readonly CalendarEvent[],
  todayIso: string,
  nowWallClock: string,
  horizonDays: number,
): DesiredNotification[] {
  const windowEnd = addDaysIso(todayIso, horizonDays);
  const out: DesiredNotification[] = [];
  for (const event of events) {
    if (event.deleted) {
      continue;
    }
    for (const date of projectEventOccurrences(event, todayIso)) {
      if (date < todayIso || date > windowEnd) {
        continue;
      }
      const fireAt = event.allDay || !event.startTime ? `${date}${AT_0900}` : `${date}T${event.startTime}:00`;
      if (fireAt <= nowWallClock) {
        continue; // past start / 09:00 → no late fire
      }
      out.push({
        type: 'EVENT_OCCURRENCE',
        key: `${event.id}:${date}`,
        fireAt,
        titleKey: 'NOTIFICATIONS.EVENT_OCCURRENCE.TITLE',
        bodyKey: event.location ? 'NOTIFICATIONS.EVENT_OCCURRENCE.BODY_LOCATION' : 'NOTIFICATIONS.EVENT_OCCURRENCE.BODY',
        params: { title: event.title, location: event.location ?? '' },
        route: `/tabs/tasks/events/${event.id}`,
      });
    }
  }
  return out;
}

/** documentation/Features/Értesítések.md §1 lead-time table (the `> 5 nap` split is structural; the
 *  two day counts are the "Lead-time szerkesztő" overrides). */
function leadDays(
  food: Food | undefined,
  location: StoredFood.StorageLocationEnum,
  todayIso: string,
  lead: FoodExpiringLead,
): number {
  if (!food) {
    return lead.short;
  }
  const duration = catalogDurationFor(food, location);
  if (duration.amount === null || duration.unit === null) {
    return lead.short;
  }
  const shelfEnd = addDurationToDate(todayIso, duration.amount, duration.unit);
  return shelfEnd > addDaysIso(todayIso, 5) ? lead.long : lead.short;
}

import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { StoredFood } from '../../api/model/storedFood';
import { addDaysIso } from '../../shared/local-date';
import {
  CalorieStreakDay,
  FoodExpiringLead,
  HouseholdTaskDue,
  calorieStreakRule,
  foodExpiringDailyRules,
  foodSpoiledOnceRules,
  householdTaskDueRule,
} from './notification-rules';
import { DEFAULT_TUNING, NotificationTuning } from './notification-tuning.service';
import { DesiredNotification, NotificationType } from './notification-types';

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — the pure builder for
 * the plan the native `ReminderWorker` fires from on days the app is never opened.
 *
 * It reuses the exact same rule functions as the live scheduler ({@link notification-rules}); no rule
 * logic is duplicated. Scope decisions:
 *
 * - **09:00 daily types** (`FOOD_EXPIRING_DAILY`, `FOOD_SPOILED_ONCE`, `HOUSEHOLD_TASK_DUE`) are
 *   projected {@link FIXED_HORIZON_DAYS} days ahead so a day with no app open is still covered.
 * - **`CALORIE_STREAK`** only contributes its *today* entry — a future day's 5-day window closes on a
 *   day whose intake isn't known yet, so it can't be evaluated ahead.
 * - **`EVENT_OCCURRENCE`** is deliberately excluded: the live scheduler already OS-schedules the next
 *   30 days of occurrences (`schedule({at})`, which fires while the app is closed), and the spec
 *   forbids firing an occurrence late — which a 09:00/20:00 worker run would do for a timed event.
 * - **`STEPS_LOW`** is returned as a *template* only; the worker reads the live step count at 20:00
 *   and decides (a future day's count is unknowable).
 *
 * Future-day `HOUSEHOLD_TASK_DUE` / `FOOD_*` entries can go stale if a task is completed or an item
 * removed while the app stays closed. Accepted: the next app open rewrites the plan, and the worker's
 * own staleness guard keeps a very old entry from firing (see ReminderWorker).
 */

export interface BackgroundPlan {
  /** Fixed-time (09:00) notifications wanted over the horizon, one per (type,key) at its earliest `fireAt`. */
  entries: DesiredNotification[];
  /** Tonight's STEPS_LOW template, or null when the type is inactive. The worker fills in the count. */
  stepsLow: StepsLowTemplate | null;
}

export interface StepsLowTemplate {
  /** Dedupe key — today's ISO date (matches `stepsLowRule`). */
  key: string;
  /** `${today}T20:00:00` local wall clock. */
  fireAt: string;
  /** Below this many steps → fire (spec §3 default 2000; overridable via the Lead-time szerkesztő). */
  threshold: number;
  titleKey: string;
  bodyKey: string;
  route: string;
}

export interface BackgroundPlanSources {
  storedFoods: readonly StoredFood[];
  foods: readonly Food[];
  householdTasks: readonly HouseholdTaskDue[];
  /** The `D-5 … D-1` window for *today* only (from `NotificationSchedulerService.calorieStreakDays`). */
  calorieStreakToday: readonly CalorieStreakDay[];
  /** Unused for now — kept so the signature is stable if events are ever added back. */
  events?: readonly CalendarEvent[];
}

/** How many days of 09:00 daily notifications to pre-compute. */
export const FIXED_HORIZON_DAYS = 3;
const STEPS_ROUTE = '/tabs/menu/steps';

export function buildBackgroundPlan(
  activeTypes: ReadonlySet<NotificationType>,
  sources: BackgroundPlanSources,
  todayIso: string,
  tuning: NotificationTuning = DEFAULT_TUNING,
): BackgroundPlan {
  const collected: DesiredNotification[] = [];
  const lead: FoodExpiringLead = { long: tuning.foodExpiringLeadDaysLong, short: tuning.foodExpiringLeadDaysShort };

  for (let offset = 0; offset < FIXED_HORIZON_DAYS; offset += 1) {
    const date = addDaysIso(todayIso, offset);
    if (activeTypes.has('FOOD_EXPIRING_DAILY')) {
      collected.push(...foodExpiringDailyRules(sources.storedFoods, sources.foods, date, lead));
    }
    if (activeTypes.has('FOOD_SPOILED_ONCE')) {
      collected.push(...foodSpoiledOnceRules(sources.storedFoods, sources.foods, date));
    }
    if (activeTypes.has('HOUSEHOLD_TASK_DUE')) {
      collected.push(...householdTaskDueRule(sources.householdTasks, date));
    }
  }

  if (activeTypes.has('CALORIE_STREAK')) {
    collected.push(...calorieStreakRule(sources.calorieStreakToday, todayIso, tuning.calorieStreakMarginKcal));
  }

  const stepsLow: StepsLowTemplate | null = activeTypes.has('STEPS_LOW')
    ? {
        key: todayIso,
        fireAt: `${todayIso}T20:00:00`,
        threshold: tuning.stepsLowThreshold,
        titleKey: 'NOTIFICATIONS.STEPS_LOW.TITLE',
        bodyKey: 'NOTIFICATIONS.STEPS_LOW.BODY',
        route: STEPS_ROUTE,
      }
    : null;

  return { entries: dedupeByKeyEarliest(collected), stepsLow };
}

/** One notification per (type,key) — the earliest-firing one (matters for the lifetime-keyed `FOOD_SPOILED_ONCE`). */
function dedupeByKeyEarliest(items: readonly DesiredNotification[]): DesiredNotification[] {
  const byKey = new Map<string, DesiredNotification>();
  for (const item of items) {
    const k = `${item.type}|${item.key}`;
    const existing = byKey.get(k);
    if (existing === undefined || item.fireAt < existing.fireAt) {
      byKey.set(k, item);
    }
  }
  return [...byKey.values()].sort((a, b) => a.fireAt.localeCompare(b.fireAt));
}

/**
 * documentation/Subfeatures/Heti terv.md "Rotációs előrejelzés" (backlog/144) — pure, Angular-free.
 * One forecast drives both the Heti terv day rows and the Edzésnapló quick start: the past is what was
 * actually logged; today (until something is logged) and every future day is decided day by day:
 *
 *   1. a manual override (a WeeklyPlan slot: a template, or a forced rest day) wins;
 *   2. a planned climb (backlog/143 `CLIMBING` event) makes a climbing day — a load day, no workout;
 *   3. once the current run of load days reaches the block limit, the day is a rest day — the limit
 *      alternates 2 / 3 (the previous block was ≥ 3 long → now 2, otherwise 3);
 *   4. otherwise a workout: the rotation's next template (least recently done / forecast, never-done
 *      first, ties in template order); the day before a planned climb, finger-free if there is one.
 *
 * A forecast or overridden workout advances the rotation like a logged one, so the rotation continues
 * from an override. A suggested but unlogged past day is simply a rest day (the block restarts).
 */
import { CalendarEvent } from '../../api/model/calendarEvent';
import { ClimbingSession } from '../../api/model/climbingSession';
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../api/model/weeklyPlanSlot';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { planHasFingerLoad, rotationOrder } from './rotation-suggestion';
import { plannedClimbDates } from './training-load';
import { WEEK_DAYS, addLocalDays } from './weekly-plan/weekly-plan-adherence';

/** The block limit after a short (≤ 2 day) block, and after a long (≥ 3 day) one. */
export const LONG_BLOCK_DAYS = 3;
export const SHORT_BLOCK_DAYS = 2;
/** How far back the logged history is scanned for the current block and the previous block's length. */
const HISTORY_DAYS = 60;

/** A one-day manual override (WeeklyPlan slot, backlog/144): a template, or a forced rest day. */
export interface DayOverride {
  kind: WeeklyPlanSlot.KindEnum;
  planId: string | null;
}

export type ForecastKind = 'CLIMB' | 'WORKOUT' | 'REST';

export type ForecastReason =
  /** Today, already logged — the day is what happened. */
  | 'LOGGED'
  | 'OVERRIDE'
  | 'PLANNED_CLIMB'
  /** The load block reached its limit. */
  | 'BLOCK_LIMIT'
  | 'ROTATION'
  /** No active template to suggest. */
  | 'NO_PLANS';

export interface ForecastDay {
  date: string;
  kind: ForecastKind;
  reason: ForecastReason;
  /** WORKOUT: the suggested / overridden / logged template (null for a logged ad-hoc workout). */
  plan: WorkoutPlan | null;
  /** The day before a planned climb, but every candidate template has finger work. */
  fingerFallback: boolean;
  /** BLOCK_LIMIT: the length of the load block that ended the day before. */
  blockLength: number;
}

export interface ForecastInputs {
  today: string;
  plans: readonly WorkoutPlan[];
  workoutSessions: readonly WorkoutSession[];
  climbingSessions: readonly ClimbingSession[];
  /** backlog/143 planned climbing days (`plannedClimbDates`). */
  plannedClimbs: ReadonlySet<string>;
  /** backlog/144 manual overrides by date (`overridesByDate`). */
  overrides: ReadonlyMap<string, DayOverride>;
}

/** The raw local stores the forecast reads (each list may be empty). */
export interface ForecastSources {
  climbingSessions: readonly ClimbingSession[];
  workoutSessions: readonly WorkoutSession[];
  events?: readonly CalendarEvent[];
  weeklyPlans?: readonly WeeklyPlan[];
  workoutPlans?: readonly WorkoutPlan[];
}

export function forecastInputsFrom(today: string, sources: ForecastSources): ForecastInputs {
  return {
    today,
    plans: sources.workoutPlans ?? [],
    workoutSessions: sources.workoutSessions,
    climbingSessions: sources.climbingSessions,
    plannedClimbs: plannedClimbDates(sources.events ?? [], today),
    overrides: overridesByDate(sources.weeklyPlans ?? []),
  };
}

/** Every live slot of every live week as a dated override — no inheritance (backlog/144). */
export function overridesByDate(weeks: readonly WeeklyPlan[]): Map<string, DayOverride> {
  const overrides = new Map<string, DayOverride>();
  for (const week of weeks) {
    if (week.deleted) {
      continue;
    }
    for (const slot of week.slots) {
      if (slot.deleted) {
        continue;
      }
      const date = addLocalDays(week.weekStartDate, WEEK_DAYS.indexOf(slot.dayOfWeek));
      overrides.set(date, { kind: slot.kind ?? WeeklyPlanSlot.KindEnum.Plan, planId: slot.planId ?? null });
    }
  }
  return overrides;
}

/** The next block limit after a finished block of `previousBlock` load days (0 = none on record). */
export function nextBlockLimit(previousBlock: number): number {
  return previousBlock === 0 || previousBlock >= LONG_BLOCK_DAYS ? SHORT_BLOCK_DAYS : LONG_BLOCK_DAYS;
}

interface BlockState {
  /** Consecutive load days ending the day before the next simulated day. */
  streak: number;
  limit: number;
}

/** Scans the logged past (before `today`) for the current load block and the limit that applies to it. */
function blockStateBefore(today: string, isLoadDay: (date: string) => boolean): BlockState {
  let streak = 0;
  let date = addLocalDays(today, -1);
  const oldest = addLocalDays(today, -HISTORY_DAYS);
  while (date >= oldest && isLoadDay(date)) {
    streak++;
    date = addLocalDays(date, -1);
  }
  // skip the rest run before the current block, then measure the block before it
  while (date >= oldest && !isLoadDay(date)) {
    date = addLocalDays(date, -1);
  }
  let previous = 0;
  while (date >= oldest && isLoadDay(date)) {
    previous++;
    date = addLocalDays(date, -1);
  }
  return { streak, limit: nextBlockLimit(previous) };
}

/**
 * The forecast for `today` … `until` (inclusive). Empty when `until` is before `today` — past days are
 * read from the logs directly (`dailyTrainingLoad`).
 */
export function trainingForecast(inputs: ForecastInputs, until: string): ForecastDay[] {
  const { today } = inputs;
  const climbDays = new Set(inputs.climbingSessions.filter((session) => !session.deleted).map((session) => session.date));
  const workoutsByDate = new Map<string, WorkoutSession[]>();
  for (const session of inputs.workoutSessions) {
    if (!session.deleted) {
      workoutsByDate.set(session.date, [...(workoutsByDate.get(session.date) ?? []), session]);
    }
  }
  const isLoggedLoad = (date: string) => climbDays.has(date) || workoutsByDate.has(date);

  const state = blockStateBefore(today, isLoggedLoad);
  // the rotation's "last done" per template: logged sessions, then every forecast workout
  const lastDone = new Map<string, string>(
    rotationOrder(inputs.plans, inputs.workoutSessions)
      .filter((candidate) => candidate.lastDate !== null)
      .map((candidate) => [candidate.plan.id, candidate.lastDate as string]),
  );
  const livePlan = (id: string | null) => (id === null ? undefined : inputs.plans.find((plan) => plan.id === id && !plan.deleted));

  const days: ForecastDay[] = [];
  for (let date = today; date <= until; date = addLocalDays(date, 1)) {
    const day = decideDay(date);
    days.push(day);
    if (day.kind === 'WORKOUT' && day.plan !== null && (lastDone.get(day.plan.id) ?? '') < date) {
      lastDone.set(day.plan.id, date);
    }
    if (day.kind === 'REST') {
      if (state.streak > 0) {
        state.limit = nextBlockLimit(state.streak);
      }
      state.streak = 0;
    } else {
      state.streak++;
    }
  }
  return days;

  function decideDay(date: string): ForecastDay {
    const base = { date, plan: null, fingerFallback: false, blockLength: 0 };
    if (date === today && isLoggedLoad(date)) {
      if (climbDays.has(date)) {
        return { ...base, kind: 'CLIMB', reason: 'LOGGED' };
      }
      const planId = workoutsByDate.get(date)?.find((session) => session.planId)?.planId ?? null;
      return { ...base, kind: 'WORKOUT', reason: 'LOGGED', plan: livePlan(planId) ?? null };
    }
    const override = inputs.overrides.get(date);
    if (override?.kind === WeeklyPlanSlot.KindEnum.Rest) {
      return { ...base, kind: 'REST', reason: 'OVERRIDE' };
    }
    const overridePlan = override?.kind === WeeklyPlanSlot.KindEnum.Plan ? livePlan(override.planId) : undefined;
    if (overridePlan !== undefined) {
      return { ...base, kind: 'WORKOUT', reason: 'OVERRIDE', plan: overridePlan };
    }
    if (inputs.plannedClimbs.has(date)) {
      return { ...base, kind: 'CLIMB', reason: 'PLANNED_CLIMB' };
    }
    if (state.streak >= state.limit) {
      return { ...base, kind: 'REST', reason: 'BLOCK_LIMIT', blockLength: state.streak };
    }
    const candidates = rotationOrder(inputs.plans, []).sort((a, b) => {
      const left = lastDone.get(a.plan.id) ?? null;
      const right = lastDone.get(b.plan.id) ?? null;
      if (left === right) {
        return 0;
      }
      return left === null ? -1 : right === null ? 1 : left.localeCompare(right);
    });
    if (candidates.length === 0) {
      return { ...base, kind: 'REST', reason: 'NO_PLANS' };
    }
    const climbTomorrow = inputs.plannedClimbs.has(addLocalDays(date, 1));
    const fingerFree = climbTomorrow ? candidates.find((candidate) => !planHasFingerLoad(candidate.plan)) : candidates[0];
    return {
      ...base,
      kind: 'WORKOUT',
      reason: 'ROTATION',
      plan: (fingerFree ?? candidates[0]).plan,
      fingerFallback: climbTomorrow && fingerFree === undefined,
    };
  }
}

/** The first forecast workout after `today` (the quick start's "Következő"). */
export function nextForecastWorkout(days: readonly ForecastDay[], today: string): ForecastDay | null {
  return days.find((day) => day.date > today && day.kind === 'WORKOUT' && day.plan !== null) ?? null;
}

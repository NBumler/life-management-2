/**
 * documentation/Subfeatures/Heti terv.md "Terhelés-figyelmeztetések" (backlog/138) — a pure rule engine
 * over the per-day training load (`training-load.ts`, backlog/137). Advisory only ("javasolt", never
 * "tilos"): the warnings render as a non-blocking banner, nothing is ever prevented.
 * backlog/143: planned climbs (today / future) feed the forward-looking rules; backlog/144: the
 * look-ahead rest rule reads the rotation forecast (`training-forecast.ts`).
 */
import { CalendarEvent } from '../../api/model/calendarEvent';
import { ClimbingSession } from '../../api/model/climbingSession';
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { ForecastDay, forecastInputsFrom, trainingForecast } from './training-forecast';
import { DayLoad, climbsOn, dailyTrainingLoad, plannedClimbDates } from './training-load';
import { addLocalDays, mondayOf } from './weekly-plan/weekly-plan-adherence';

/** Rolling window (days before today) that must contain at least one rest day. */
export const REST_WINDOW_DAYS = 7;
/** Calendar-week climbing days (logged + planned) from which home pull / finger work is suggested to be skipped. */
export const MANY_CLIMBS_PER_WEEK = 4;
/** Rolling 7 days (today included) — this many finger-loading days is a connective-tissue warning. */
export const FINGER_LOAD_DAYS_LIMIT = 5;
/** backlog/143 / backlog/144 — look-ahead window (today included) whose forecast should keep a rest day. */
export const REST_AHEAD_DAYS = 7;

export type LoadWarningCode =
  | 'NO_REST_DAY'
  | 'FINGER_LOAD'
  | 'NO_REST_AHEAD'
  | 'CLIMBED_TODAY'
  | 'CLIMB_PLANNED_TODAY'
  | 'CLIMB_TOMORROW'
  | 'MANY_CLIMBS';

export interface LoadWarning {
  code: LoadWarningCode;
  severity: 'warning' | 'info';
}

/** The rule inputs from the raw local stores (each list may be empty). */
export interface LoadWarningSources {
  climbingSessions: readonly ClimbingSession[];
  workoutSessions: readonly WorkoutSession[];
  /** backlog/143 — `CLIMBING`-typed events are the planned climbs. */
  events?: readonly CalendarEvent[];
  /** backlog/144 — the manual day overrides (WeeklyPlan slots) and the templates, for the forecast. */
  weeklyPlans?: readonly WeeklyPlan[];
  workoutPlans?: readonly WorkoutPlan[];
}

/**
 * The days the rules look at: from the earlier of (today − 7) and this week's Monday, to the later of
 * (today + 6) and this week's Sunday.
 */
export function loadWarningDates(today: string): string[] {
  const restStart = addLocalDays(today, -REST_WINDOW_DAYS);
  const monday = mondayOf(today);
  const start = monday < restStart ? monday : restStart;
  const aheadEnd = addLocalDays(today, REST_AHEAD_DAYS - 1);
  const sunday = addLocalDays(monday, 6);
  const end = sunday > aheadEnd ? sunday : aheadEnd;
  const dates: string[] = [];
  for (let date = start; date <= end; date = addLocalDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

/**
 * `days` must cover `loadWarningDates(today)` (extra days are ignored). `ahead` = the rotation forecast
 * from today (backlog/144); `NO_REST_AHEAD` needs all `REST_AHEAD_DAYS` of it. Ordered: warnings first,
 * then infos.
 */
export function loadWarnings(days: readonly DayLoad[], today: string, ahead: readonly ForecastDay[] = []): LoadWarning[] {
  const between = (from: string, to: string) => days.filter((day) => day.date >= from && day.date <= to);
  const todayLoad = days.find((day) => day.date === today);
  const tomorrowLoad = days.find((day) => day.date === addLocalDays(today, 1));
  const warnings: LoadWarning[] = [];

  const restWindow = between(addLocalDays(today, -REST_WINDOW_DAYS), addLocalDays(today, -1));
  if (restWindow.length === REST_WINDOW_DAYS && !restWindow.some((day) => day.rest)) {
    warnings.push({ code: 'NO_REST_DAY', severity: 'warning' });
  }
  if (between(addLocalDays(today, -6), today).filter((day) => day.fingerLoad).length >= FINGER_LOAD_DAYS_LIMIT) {
    warnings.push({ code: 'FINGER_LOAD', severity: 'warning' });
  }
  // backlog/144: the automatic forecast always leaves a rest day within 3 load days — only planned
  // climbs or manual overrides can fill a whole week
  const aheadWindow = ahead.filter((day) => day.date >= today && day.date <= addLocalDays(today, REST_AHEAD_DAYS - 1));
  if (aheadWindow.length === REST_AHEAD_DAYS && aheadWindow.every((day) => day.kind !== 'REST')) {
    warnings.push({ code: 'NO_REST_AHEAD', severity: 'warning' });
  }
  if ((todayLoad?.climbing ?? 0) > 0) {
    warnings.push({ code: 'CLIMBED_TODAY', severity: 'info' });
  } else if (todayLoad?.plannedClimb) {
    warnings.push({ code: 'CLIMB_PLANNED_TODAY', severity: 'info' });
  }
  if (tomorrowLoad?.plannedClimb) {
    warnings.push({ code: 'CLIMB_TOMORROW', severity: 'info' });
  }
  const monday = mondayOf(today);
  if (between(monday, addLocalDays(monday, 6)).filter(climbsOn).length >= MANY_CLIMBS_PER_WEEK) {
    warnings.push({ code: 'MANY_CLIMBS', severity: 'info' });
  }
  return warnings;
}

/** Convenience: build the load from the raw stores and evaluate the rules for `today`. */
export function loadWarningsFor(today: string, sources: LoadWarningSources): LoadWarning[] {
  const dates = loadWarningDates(today);
  const days = dailyTrainingLoad(dates, sources.climbingSessions, sources.workoutSessions, {
    dates: plannedClimbDates(sources.events ?? [], today),
    today,
  });
  const ahead = trainingForecast(forecastInputsFrom(today, sources), addLocalDays(today, REST_AHEAD_DAYS - 1));
  return loadWarnings(days, today, ahead);
}

/**
 * documentation/Subfeatures/Heti terv.md "Terhelés-figyelmeztetések" (backlog/138) — a pure rule engine
 * over the per-day training load (`training-load.ts`, backlog/137). Advisory only ("javasolt", never
 * "tilos"): the warnings render as a non-blocking banner, nothing is ever prevented.
 */
import { ClimbingSession } from '../../api/model/climbingSession';
import { WorkoutSession } from '../../api/model/workoutSession';
import { addLocalDays, mondayOf } from './weekly-plan/weekly-plan-adherence';
import { DayLoad, dailyTrainingLoad } from './training-load';

/** Rolling window (days before today) that must contain at least one rest day. */
export const REST_WINDOW_DAYS = 7;
/** Calendar-week climbing days from which home pull / finger work is suggested to be skipped. */
export const MANY_CLIMBS_PER_WEEK = 4;
/** Rolling 7 days (today included) — this many finger-loading days is a connective-tissue warning. */
export const FINGER_LOAD_DAYS_LIMIT = 5;

export type LoadWarningCode = 'NO_REST_DAY' | 'CLIMBED_TODAY' | 'MANY_CLIMBS' | 'FINGER_LOAD';

export interface LoadWarning {
  code: LoadWarningCode;
  severity: 'warning' | 'info';
}

/** The days the rules look at: from the earlier of (today − 7) and this week's Monday, up to today. */
export function loadWarningDates(today: string): string[] {
  const restStart = addLocalDays(today, -REST_WINDOW_DAYS);
  const monday = mondayOf(today);
  const start = monday < restStart ? monday : restStart;
  const dates: string[] = [];
  for (let date = start; date <= today; date = addLocalDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

/** `days` must cover `loadWarningDates(today)` (extra days are ignored). Ordered: warnings first. */
export function loadWarnings(days: readonly DayLoad[], today: string): LoadWarning[] {
  const between = (from: string, to: string) => days.filter((day) => day.date >= from && day.date <= to);
  const todayLoad = days.find((day) => day.date === today);
  const warnings: LoadWarning[] = [];

  const restWindow = between(addLocalDays(today, -REST_WINDOW_DAYS), addLocalDays(today, -1));
  if (restWindow.length === REST_WINDOW_DAYS && !restWindow.some((day) => day.rest)) {
    warnings.push({ code: 'NO_REST_DAY', severity: 'warning' });
  }
  if (between(addLocalDays(today, -6), today).filter((day) => day.fingerLoad).length >= FINGER_LOAD_DAYS_LIMIT) {
    warnings.push({ code: 'FINGER_LOAD', severity: 'warning' });
  }
  if ((todayLoad?.climbing ?? 0) > 0) {
    warnings.push({ code: 'CLIMBED_TODAY', severity: 'info' });
  }
  if (between(mondayOf(today), today).filter((day) => day.climbing > 0).length >= MANY_CLIMBS_PER_WEEK) {
    warnings.push({ code: 'MANY_CLIMBS', severity: 'info' });
  }
  return warnings;
}

/** Convenience: build the load from the raw logs and evaluate the rules for `today`. */
export function loadWarningsFor(
  today: string,
  climbingSessions: readonly ClimbingSession[],
  workoutSessions: readonly WorkoutSession[],
): LoadWarning[] {
  return loadWarnings(dailyTrainingLoad(loadWarningDates(today), climbingSessions, workoutSessions), today);
}

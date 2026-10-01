/**
 * documentation/Subfeatures/Heti terv.md "Heti terhelés" (backlog/137) — pure, Angular-free per-day
 * training load from the local climbing log + workout log. The weekly dashboard renders it today; the
 * load warnings (backlog/138) and the rotation suggestion (backlog/139) build on the same numbers.
 * backlog/143: planned climbs (`CLIMBING`-typed calendar events) count for today and the future; the
 * past is always what was actually logged (a planned-but-unlogged past day is a "missed" climb).
 */
import { CalendarEvent } from '../../api/model/calendarEvent';
import { ClimbingSession } from '../../api/model/climbingSession';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../api/model/workoutSession';
import { projectEventOccurrences } from '../../core/data/event-occurrence';

export interface DayLoad {
  date: string;
  /** Live climbing sessions logged that day. */
  climbing: number;
  /** Live workout-log sessions that day (swim / bike / steps are light activity and not counted). */
  workouts: number;
  /** Climbing, or a logged FOREARM_FINGERS-category / HANGBOARD_PINCH-kind exercise — a finger-loading day. */
  fingerLoad: boolean;
  /** No climbing (logged or still planned) and no workout session — a full rest day. */
  rest: boolean;
  /** backlog/143 — a climb is planned for today / a future day and not logged yet. */
  plannedClimb: boolean;
  /** backlog/143 — a past day had a planned climb but no climbing session was logged. */
  missedClimb: boolean;
}

export interface WeekLoadSummary {
  climbingDays: number;
  /** backlog/143 — still-upcoming planned climbing days (today included, until logged). */
  plannedClimbDays: number;
  workoutDays: number;
  fingerLoadDays: number;
  /** Rest days counted only up to `today` — a future day is not "rested" yet. */
  restDays: number;
}

/** backlog/143 — the planned-climb calendar plus the day that splits "planned" from "missed". */
export interface PlannedClimbs {
  dates: ReadonlySet<string>;
  today: string;
}

/** A logged exercise that loads the fingers / forearms the way climbing does. */
export function isFingerLoadExercise(exercise: Pick<WorkoutExerciseEntry, 'exerciseCategory' | 'exerciseKind'>): boolean {
  return (
    exercise.exerciseCategory === WorkoutExerciseEntry.ExerciseCategoryEnum.ForearmFingers ||
    exercise.exerciseKind === WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch
  );
}

/**
 * backlog/143 — every occurrence day (one-off or recurring, within the event list's ±1 year projection
 * window) of the live `CLIMBING`-typed calendar events.
 */
export function plannedClimbDates(events: readonly CalendarEvent[], today: string): Set<string> {
  const dates = new Set<string>();
  for (const event of events) {
    if (event.deleted || event.activityType !== CalendarEvent.ActivityTypeEnum.Climbing) {
      continue;
    }
    for (const date of projectEventOccurrences(event, today)) {
      dates.add(date);
    }
  }
  return dates;
}

/** A day the user climbs on — logged, or still planned. */
export function climbsOn(day: DayLoad): boolean {
  return day.climbing > 0 || day.plannedClimb;
}

export function dailyTrainingLoad(
  dates: readonly string[],
  climbingSessions: readonly ClimbingSession[],
  workoutSessions: readonly WorkoutSession[],
  planned?: PlannedClimbs,
): DayLoad[] {
  return dates.map((date) => {
    const climbing = climbingSessions.filter((session) => !session.deleted && session.date === date).length;
    const workouts = workoutSessions.filter((session) => !session.deleted && session.date === date);
    const fingerWorkout = workouts.some((session) =>
      session.exercises.some((exercise) => !exercise.deleted && isFingerLoadExercise(exercise)),
    );
    const isPlanned = planned !== undefined && climbing === 0 && planned.dates.has(date);
    const plannedClimb = isPlanned && date >= planned.today;
    return {
      date,
      climbing,
      workouts: workouts.length,
      fingerLoad: climbing > 0 || fingerWorkout,
      rest: climbing === 0 && workouts.length === 0 && !plannedClimb,
      plannedClimb,
      missedClimb: isPlanned && date < planned.today,
    };
  });
}

export function weekLoadSummary(days: readonly DayLoad[], today: string): WeekLoadSummary {
  return {
    climbingDays: days.filter((day) => day.climbing > 0).length,
    plannedClimbDays: days.filter((day) => day.plannedClimb).length,
    workoutDays: days.filter((day) => day.workouts > 0).length,
    fingerLoadDays: days.filter((day) => day.fingerLoad).length,
    restDays: days.filter((day) => day.rest && day.date <= today).length,
  };
}

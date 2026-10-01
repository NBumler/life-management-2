/**
 * documentation/Subfeatures/Heti terv.md "Heti terhelés" (backlog/137) — pure, Angular-free per-day
 * training load from the local climbing log + workout log. The weekly dashboard renders it today; the
 * load warnings (backlog/138) and the rotation suggestion (backlog/139) build on the same numbers.
 */
import { ClimbingSession } from '../../api/model/climbingSession';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../api/model/workoutSession';

export interface DayLoad {
  date: string;
  /** Live climbing sessions logged that day. */
  climbing: number;
  /** Live workout-log sessions that day (swim / bike / steps are light activity and not counted). */
  workouts: number;
  /** Climbing, or a logged FOREARM_FINGERS-category / HANGBOARD_PINCH-kind exercise — a finger-loading day. */
  fingerLoad: boolean;
  /** Neither climbing nor a workout session — a full rest day. */
  rest: boolean;
}

export interface WeekLoadSummary {
  climbingDays: number;
  workoutDays: number;
  fingerLoadDays: number;
  /** Rest days counted only up to `today` — a future day is not "rested" yet. */
  restDays: number;
}

/** A logged exercise that loads the fingers / forearms the way climbing does. */
export function isFingerLoadExercise(exercise: WorkoutExerciseEntry): boolean {
  return (
    exercise.exerciseCategory === WorkoutExerciseEntry.ExerciseCategoryEnum.ForearmFingers ||
    exercise.exerciseKind === WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch
  );
}

export function dailyTrainingLoad(
  dates: readonly string[],
  climbingSessions: readonly ClimbingSession[],
  workoutSessions: readonly WorkoutSession[],
): DayLoad[] {
  return dates.map((date) => {
    const climbing = climbingSessions.filter((session) => !session.deleted && session.date === date).length;
    const workouts = workoutSessions.filter((session) => !session.deleted && session.date === date);
    const fingerWorkout = workouts.some((session) =>
      session.exercises.some((exercise) => !exercise.deleted && isFingerLoadExercise(exercise)),
    );
    return {
      date,
      climbing,
      workouts: workouts.length,
      fingerLoad: climbing > 0 || fingerWorkout,
      rest: climbing === 0 && workouts.length === 0,
    };
  });
}

export function weekLoadSummary(days: readonly DayLoad[], today: string): WeekLoadSummary {
  return {
    climbingDays: days.filter((day) => day.climbing > 0).length,
    workoutDays: days.filter((day) => day.workouts > 0).length,
    fingerLoadDays: days.filter((day) => day.fingerLoad).length,
    restDays: days.filter((day) => day.rest && day.date <= today).length,
  };
}

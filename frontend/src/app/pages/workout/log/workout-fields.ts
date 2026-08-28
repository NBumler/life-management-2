/**
 * documentation/Subfeatures/Edzésnapló.md "Mezőválasztás `exerciseKind` szerint" — which set-entry
 * inputs each `exerciseKind` exposes, plus the enum value lists the session forms iterate. Pure, no
 * Angular: shared by the post-hoc editor (`workout-session-edit.page.ts`) and the live Active Workout
 * View (`active-workout.page.ts`) so the two screens never drift on the field table.
 */
import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';

export const SET_TYPES = Object.values(WorkoutSetEntry.SetTypeEnum);
export const WORKOUT_TYPES = Object.values(WorkoutSession.WorkoutTypeEnum);
export const LOCATIONS = Object.values(WorkoutSession.LocationEnum);

export interface VisibleSetFields {
  reps: boolean;
  weightKg: boolean;
  holdTimeSeconds: boolean;
  edgeSizeMm: boolean;
  distanceMeters: boolean;
}

/** Which set-entry fields the spec's `exerciseKind` table exposes (weightKg wherever it applies, required or optional). */
export function visibleFields(kind: WorkoutExerciseEntry.ExerciseKindEnum): VisibleSetFields {
  switch (kind) {
    case WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps:
      return { reps: true, weightKg: true, holdTimeSeconds: false, edgeSizeMm: false, distanceMeters: false };
    case WorkoutExerciseEntry.ExerciseKindEnum.BodyweightReps:
      return { reps: true, weightKg: true, holdTimeSeconds: false, edgeSizeMm: false, distanceMeters: false };
    case WorkoutExerciseEntry.ExerciseKindEnum.IsometricTime:
      return { reps: false, weightKg: true, holdTimeSeconds: true, edgeSizeMm: false, distanceMeters: false };
    case WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch:
      return { reps: false, weightKg: true, holdTimeSeconds: true, edgeSizeMm: true, distanceMeters: false };
    case WorkoutExerciseEntry.ExerciseKindEnum.CardioTimeDist:
      return { reps: false, weightKg: false, holdTimeSeconds: true, edgeSizeMm: false, distanceMeters: true };
  }
}

/**
 * One rest-timer tick: decrement by a second, and report expiry when it hits zero so the caller can
 * fire the haptic/beep. `null` in → `null` out (no timer running). Pure so the countdown rule is
 * unit-testable without fake timers.
 */
export function nextRestValue(remaining: number | null): { value: number | null; expired: boolean } {
  if (remaining === null) {
    return { value: null, expired: false };
  }
  const next = remaining - 1;
  return next <= 0 ? { value: null, expired: true } : { value: next, expired: false };
}

/** Stopwatch label: `MM:SS`, or `H:MM:SS` once past an hour. */
export function formatStopwatch(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

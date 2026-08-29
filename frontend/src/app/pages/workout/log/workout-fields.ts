/**
 * documentation/Subfeatures/Edzésnapló.md "Mezőválasztás `exerciseKind` szerint" — which set-entry
 * inputs each `exerciseKind` exposes, plus the enum value lists the session forms iterate. Pure, no
 * Angular: shared by the post-hoc editor (`workout-session-edit.page.ts`) and the live Active Workout
 * View (`active-workout.page.ts`) so the two screens never drift on the field table.
 */
import { WorkoutExerciseEntry } from '../../../api/model/workoutExerciseEntry';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutPlanExercise } from '../../../api/model/workoutPlanExercise';
import { WorkoutPlanSet } from '../../../api/model/workoutPlanSet';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../../api/model/workoutSetEntry';

export const SET_TYPES = Object.values(WorkoutSetEntry.SetTypeEnum);
export const WORKOUT_TYPES = Object.values(WorkoutSession.WorkoutTypeEnum);
export const LOCATIONS = Object.values(WorkoutSession.LocationEnum);

/**
 * The generated client emits a separate enum type per DTO even when the string values are identical
 * (a Heti terv template vs. an Edzésnapló session/entry). These maps are the single typed bridge used
 * when "Edzés indítása a tervből" copies a `WorkoutPlan` into a live/post-hoc session — a divergence
 * in either enum becomes a compile error here instead of an `as unknown as` silently passing.
 */
export const PLAN_TO_ENTRY_CATEGORY: Record<WorkoutPlanExercise.ExerciseCategoryEnum, WorkoutExerciseEntry.ExerciseCategoryEnum> = {
  [WorkoutPlanExercise.ExerciseCategoryEnum.Chest]: WorkoutExerciseEntry.ExerciseCategoryEnum.Chest,
  [WorkoutPlanExercise.ExerciseCategoryEnum.Back]: WorkoutExerciseEntry.ExerciseCategoryEnum.Back,
  [WorkoutPlanExercise.ExerciseCategoryEnum.Legs]: WorkoutExerciseEntry.ExerciseCategoryEnum.Legs,
  [WorkoutPlanExercise.ExerciseCategoryEnum.Shoulders]: WorkoutExerciseEntry.ExerciseCategoryEnum.Shoulders,
  [WorkoutPlanExercise.ExerciseCategoryEnum.Arms]: WorkoutExerciseEntry.ExerciseCategoryEnum.Arms,
  [WorkoutPlanExercise.ExerciseCategoryEnum.Core]: WorkoutExerciseEntry.ExerciseCategoryEnum.Core,
  [WorkoutPlanExercise.ExerciseCategoryEnum.ForearmFingers]: WorkoutExerciseEntry.ExerciseCategoryEnum.ForearmFingers,
  [WorkoutPlanExercise.ExerciseCategoryEnum.FullBody]: WorkoutExerciseEntry.ExerciseCategoryEnum.FullBody,
};

export const PLAN_TO_ENTRY_KIND: Record<WorkoutPlanExercise.ExerciseKindEnum, WorkoutExerciseEntry.ExerciseKindEnum> = {
  [WorkoutPlanExercise.ExerciseKindEnum.WeightedReps]: WorkoutExerciseEntry.ExerciseKindEnum.WeightedReps,
  [WorkoutPlanExercise.ExerciseKindEnum.BodyweightReps]: WorkoutExerciseEntry.ExerciseKindEnum.BodyweightReps,
  [WorkoutPlanExercise.ExerciseKindEnum.IsometricTime]: WorkoutExerciseEntry.ExerciseKindEnum.IsometricTime,
  [WorkoutPlanExercise.ExerciseKindEnum.HangboardPinch]: WorkoutExerciseEntry.ExerciseKindEnum.HangboardPinch,
  [WorkoutPlanExercise.ExerciseKindEnum.CardioTimeDist]: WorkoutExerciseEntry.ExerciseKindEnum.CardioTimeDist,
};

export const PLAN_TO_SESSION_TYPE: Record<WorkoutPlan.DefaultWorkoutTypeEnum, WorkoutSession.WorkoutTypeEnum> = {
  [WorkoutPlan.DefaultWorkoutTypeEnum.GeneralWeights]: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
  [WorkoutPlan.DefaultWorkoutTypeEnum.HiitCircuit]: WorkoutSession.WorkoutTypeEnum.HiitCircuit,
};

export const PLAN_TO_ENTRY_SET_TYPE: Record<WorkoutPlanSet.SetTypeEnum, WorkoutSetEntry.SetTypeEnum> = {
  [WorkoutPlanSet.SetTypeEnum.Warmup]: WorkoutSetEntry.SetTypeEnum.Warmup,
  [WorkoutPlanSet.SetTypeEnum.Working]: WorkoutSetEntry.SetTypeEnum.Working,
  [WorkoutPlanSet.SetTypeEnum.Dropset]: WorkoutSetEntry.SetTypeEnum.Dropset,
  [WorkoutPlanSet.SetTypeEnum.RestPause]: WorkoutSetEntry.SetTypeEnum.RestPause,
  [WorkoutPlanSet.SetTypeEnum.Failure]: WorkoutSetEntry.SetTypeEnum.Failure,
};

/**
 * documentation/…/WorkoutSession.yaml + the V18 `CHECK (end_time > start_time)`: `endTime` must be
 * strictly after `startTime` (lexical `HH:mm`) when both are present. A live session crossing
 * midnight (start `23:30`, finish `00:15`) would otherwise build a payload the backend rejects on
 * drain. Drop `endTime` in that case — the elapsed-derived `durationMinutes` already carries the
 * real length. A same-minute finish (`start === end`) is dropped too for the same reason.
 */
export function sanitizeSessionTimes(
  startTime: string | null,
  endTime: string | null,
): { startTime: string | null; endTime: string | null } {
  if (startTime !== null && endTime !== null && endTime <= startTime) {
    return { startTime, endTime: null };
  }
  return { startTime, endTime };
}

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

/**
 * Move the `{ id }` item `delta` positions within `items` (clamped to the ends); returns a new array,
 * or the same reference when the move is a no-op. Shared by the workout editors' exercise-row reorder
 * (documentation/Subfeatures/Edzésnapló.md `orderIndex` "drag & drop sorrend").
 */
export function moveById<T extends { id: string }>(items: T[], id: string, delta: number): T[] {
  const index = items.findIndex((item) => item.id === id);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= items.length) {
    return items;
  }
  const next = items.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
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

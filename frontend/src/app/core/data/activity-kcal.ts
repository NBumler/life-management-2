/**
 * documentation/Features/Tápérték kalkulátor.md "Edzéskalória — univerzális MET":
 * `activityExtraKcal` = lépéskalória + Σ edzéskalóriák az napra. This module produces both halves for
 * a single client-local calendar day: the Σ of `sessionKcal()` / `swimKcal()` / `bikeKcal()` /
 * `volleyballKcal()` / `climbingKcal()` over the day's workout logs ({@link workoutKcalForDay} etc.),
 * and the step-calorie term ({@link stepKcalForDay}, [[Lépésszám követés]]).
 *
 * Pure TS, no Angular — the same "kliens gördíti tovább" shape as `pages/food/storage/shelf-life.ts`
 * consumed from `meal.repository.ts`. Every term uses the CURRENT body weight, never a value frozen
 * into the log, so `bodyWeightKg` is passed through from the live profile.
 */
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { ClimbingSession } from '../../api/model/climbingSession';
import { DailyStepLog } from '../../api/model/dailyStepLog';
import { SwimLog } from '../../api/model/swimLog';
import { StretchSession } from '../../api/model/stretchSession';
import { VolleyballLog } from '../../api/model/volleyballLog';
import { WorkoutSession } from '../../api/model/workoutSession';
import { bikeKcal } from '../../shared/workout/bike-metrics';
import { climbingSessionKcalInput } from '../../shared/climbing/climbing-attempt-input';
import { climbingKcal } from '../../shared/climbing/climbing-metrics';
import { sessionKcal } from '../../shared/workout/workout-metrics';
import { swimKcal } from '../../shared/workout/swim-metrics';
import { stretchKcal } from '../../shared/workout/stretch-metrics';
import { volleyballKcal } from '../../shared/workout/volleyball-metrics';

/**
 * Σ MET-kcal over every live `WorkoutSession` whose `date` is `day` (a `YYYY-MM-DD` client-local
 * calendar date — the same bucket `WorkoutSession.date` is stored in). 0 when there are no sessions
 * that day or `bodyWeightKg` is missing / non-positive.
 */
export function workoutKcalForDay(
  sessions: readonly WorkoutSession[],
  day: string,
  bodyWeightKg: number | null,
): number {
  return sessions
    .filter((session) => !session.deleted && session.date === day)
    .reduce((sum, session) => sum + sessionKcal(session, bodyWeightKg), 0);
}

/**
 * documentation/Features/Úszás napló.md: same shape as {@link workoutKcalForDay} — Σ `swimKcal()`
 * over every live `SwimLog` whose `date` is `day`. The Étkezés dashboard adds this to the workout
 * total for `activityExtraKcal`.
 */
export function swimKcalForDay(
  logs: readonly SwimLog[],
  day: string,
  bodyWeightKg: number | null,
): number {
  return logs
    .filter((log) => !log.deleted && log.date === day)
    .reduce((sum, log) => sum + swimKcal(log, bodyWeightKg), 0);
}

/**
 * documentation/Features/Biciklizés napló.md: same shape as {@link swimKcalForDay} — Σ `bikeKcal()`
 * over every live `BikeRideLog` whose `date` is `day`. The Étkezés dashboard adds this to the
 * workout + swim totals for `activityExtraKcal`.
 */
export function bikeKcalForDay(
  logs: readonly BikeRideLog[],
  day: string,
  bodyWeightKg: number | null,
): number {
  return logs
    .filter((log) => !log.deleted && log.date === day)
    .reduce((sum, log) => sum + bikeKcal(log, bodyWeightKg), 0);
}

/**
 * documentation/Features/Röplabda napló.md: same shape as {@link bikeKcalForDay} — Σ `volleyballKcal()`
 * over every live `VolleyballLog` whose `date` is `day` (one fixed, conservative net MET; the log's
 * optional `intensity` never enters it).
 */
export function volleyballKcalForDay(
  logs: readonly VolleyballLog[],
  day: string,
  bodyWeightKg: number | null,
): number {
  return logs
    .filter((log) => !log.deleted && log.date === day)
    .reduce((sum, log) => sum + volleyballKcal(log, bodyWeightKg), 0);
}

/**
 * documentation/Subfeatures/Nyújtás.md "Kalória" (backlog/169): same shape as {@link volleyballKcalForDay} —
 * Σ `stretchKcal()` (one fixed net MET 1.3) over every live `StretchSession` whose `date` is `day`.
 */
export function stretchKcalForDay(
  sessions: readonly StretchSession[],
  day: string,
  bodyWeightKg: number | null,
): number {
  return sessions
    .filter((session) => !session.deleted && session.date === day)
    .reduce((sum, session) => sum + stretchKcal(session, bodyWeightKg), 0);
}

/**
 * documentation/Features/Mászónapló.md "Kalória (kanonikus)": same shape as {@link bikeKcalForDay} —
 * Σ `climbingKcal()` over every live `ClimbingSession` whose `date` is `day`, using the session's own
 * `discipline` (the active/passive MET model, not `duration × MET`). The Étkezés dashboard adds this
 * to the workout + swim + bike totals for `activityExtraKcal`.
 */
/**
 * documentation/Features/Lépésszám követés.md "Kapcsolat a Tápérték kalkulátorral (SSOT)": the
 * step-calorie term of `activityExtraKcal`.
 *
 *   max(0, stepCount - STEP_BASELINE) * bodyWeightKg * STEP_KCAL_PER_STEP
 *
 * `STEP_BASELINE = 3000` is fixed — the first 3000 steps are already covered by the fixed PAL 1.2 in
 * `computeTdee`. A missing day counts as 0 steps → 0 kcal. 0 when `bodyWeightKg` is missing /
 * non-positive.
 */
export const STEP_BASELINE = 3000;
export const STEP_KCAL_PER_STEP = 0.00045;

export function stepKcalForDay(
  logs: readonly DailyStepLog[],
  day: string,
  bodyWeightKg: number | null,
): number {
  if (bodyWeightKg === null || bodyWeightKg <= 0) {
    return 0;
  }
  const stepCount = logs.find((log) => !log.deleted && log.date === day)?.stepCount ?? 0;
  return Math.max(0, stepCount - STEP_BASELINE) * bodyWeightKg * STEP_KCAL_PER_STEP;
}

export function climbingKcalForDay(
  sessions: readonly ClimbingSession[],
  day: string,
  bodyWeightKg: number | null,
): number {
  return sessions
    .filter((session) => !session.deleted && session.date === day)
    .reduce(
      (sum, session) =>
        sum +
        climbingKcal(climbingSessionKcalInput(session, sessions), bodyWeightKg),
      0,
    );
}

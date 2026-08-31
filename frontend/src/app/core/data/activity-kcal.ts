/**
 * documentation/Features/Tápérték kalkulátor.md "Edzéskalória — univerzális MET":
 * `activityExtraKcal` = lépéskalória + Σ edzéskalóriák az napra. This module produces the workout
 * half — the Σ of `sessionKcal()` over a single client-local calendar day. The step-calorie half
 * belongs to [[Lépésszám követés]], which does not exist yet; until it lands the caller adds only
 * this.
 *
 * Pure TS, no Angular — the same "kliens gördíti tovább" shape as `pages/food/storage/shelf-life.ts`
 * consumed from `meal.repository.ts`. `sessionKcal` uses the CURRENT body weight, never a value
 * frozen into the session, so `bodyWeightKg` is passed through from the live profile.
 */
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { ClimbingSession } from '../../api/model/climbingSession';
import { SwimLog } from '../../api/model/swimLog';
import { WorkoutSession } from '../../api/model/workoutSession';
import { bikeKcal } from '../../pages/workout/cycling/bike-metrics';
import { climbingAttemptInput } from '../../pages/workout/climbing/climbing-attempt-input';
import { climbingKcal } from '../../pages/workout/climbing/climbing-metrics';
import { sessionKcal } from '../../pages/workout/log/workout-metrics';
import { swimKcal } from '../../pages/workout/swimming/swim-metrics';

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
 * documentation/Features/Mászónapló.md "Kalória (kanonikus)": same shape as {@link bikeKcalForDay} —
 * Σ `climbingKcal()` over every live `ClimbingSession` whose `date` is `day`, using the session's own
 * `discipline` (the active/passive MET model, not `duration × MET`). The Étkezés dashboard adds this
 * to the workout + swim + bike totals for `activityExtraKcal`.
 */
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
        climbingKcal(
          {
            discipline: session.discipline,
            totalSessionDurationMinutes: session.totalSessionDurationMinutes ?? null,
            pumpRating: session.pumpRating ?? null,
            attempts: session.attempts.filter((attempt) => !attempt.deleted).map(climbingAttemptInput),
          },
          bodyWeightKg,
        ),
      0,
    );
}

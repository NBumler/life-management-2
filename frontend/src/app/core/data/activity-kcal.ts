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
import { WorkoutSession } from '../../api/model/workoutSession';
import { sessionKcal } from '../../pages/workout/log/workout-metrics';

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

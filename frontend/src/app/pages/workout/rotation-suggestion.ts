/**
 * documentation/Subfeatures/Heti terv.md "Rotációs előrejelzés" (backlog/139, backlog/144) — pure,
 * Angular-free. An A/B(/C…) rotation that advances on whichever days the user actually trains, instead
 * of fixed weekdays: the next template is the active one completed least recently. The day-by-day
 * forecast built on it lives in `training-forecast.ts`.
 */
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { isFingerLoadExercise } from './training-load';

export interface RotationCandidate {
  plan: WorkoutPlan;
  /** `YYYY-MM-DD` of the latest live session started from this plan; null = never done. */
  lastDate: string | null;
}

/** Live (`!deleted`) sessions' latest date per `planId`. */
function lastDateByPlan(sessions: readonly WorkoutSession[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const session of sessions) {
    if (session.deleted || !session.planId) {
      continue;
    }
    const current = latest.get(session.planId);
    if (current === undefined || session.date > current) {
      latest.set(session.planId, session.date);
    }
  }
  return latest;
}

/**
 * Active, live templates ordered by "due-ness": never-done first, then the oldest last session. Ties
 * keep the input order (the repository's creation order), so a fresh A/B pair starts with A.
 */
export function rotationOrder(plans: readonly WorkoutPlan[], sessions: readonly WorkoutSession[]): RotationCandidate[] {
  const latest = lastDateByPlan(sessions);
  return plans
    .filter((plan) => !plan.deleted && plan.active)
    .map((plan, index) => ({ plan, lastDate: latest.get(plan.id) ?? null, index }))
    .sort((a, b) => {
      if (a.lastDate !== b.lastDate) {
        if (a.lastDate === null) {
          return -1;
        }
        if (b.lastDate === null) {
          return 1;
        }
        return a.lastDate.localeCompare(b.lastDate);
      }
      return a.index - b.index;
    })
    .map(({ plan, lastDate }) => ({ plan, lastDate }));
}

/** backlog/143 — the template has a live FOREARM_FINGERS / HANGBOARD_PINCH exercise (a finger day). */
export function planHasFingerLoad(plan: WorkoutPlan): boolean {
  return plan.exercises.some((exercise) => !exercise.deleted && isFingerLoadExercise(exercise));
}

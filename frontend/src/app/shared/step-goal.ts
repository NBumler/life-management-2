/**
 * documentation/Features/Lépésszám követés.md "Napi lépéscél" (backlog/136) — pure helpers shared by the
 * step-tracker screen and the Android widget snapshot. The goal lives on `UserProfile.dailyStepGoal`;
 * the `STEPS_LOW` notification threshold is a separate, unrelated setting (only the widget falls back
 * to it when no goal is set, to keep its pre-goal behaviour).
 */

/** Profile validation bounds — mirror the `V50` CHECK / OpenAPI `minimum` / `maximum`. */
export const DAILY_STEP_GOAL_MIN = 1000;
export const DAILY_STEP_GOAL_MAX = 100_000;

/** `null` when no goal is set (or a non-positive value slipped through) — callers then hide progress UI. */
export function stepGoalOrNull(goal: number | null | undefined): number | null {
  return goal !== null && goal !== undefined && goal > 0 ? goal : null;
}

/** 0‥1 progress toward the goal, capped at 1 (a 15 000-step day against 13 000 is simply "done"). */
export function stepGoalProgress(count: number, goal: number): number {
  return Math.min(1, Math.max(0, count) / goal);
}

export function stepGoalReached(count: number, goal: number | null): boolean {
  return goal !== null && count >= goal;
}

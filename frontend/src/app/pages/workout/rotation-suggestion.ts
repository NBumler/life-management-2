/**
 * documentation/Subfeatures/Heti terv.md "Rotációs javaslat" (backlog/139) — pure, Angular-free.
 * An A/B(/C…) rotation that advances on whichever days the user actually trains, instead of fixed
 * weekdays: the next suggested template is the active one completed least recently.
 */
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { isFingerLoadExercise } from './training-load';
import { WEEK_DAYS, mondayOf, resolveEffectiveWeek, weekDates } from './weekly-plan/weekly-plan-adherence';

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

/** The plan the effective weekly schedule assigns to `today` (backlog/127 inheritance included), if live. */
export function todaySlotPlan(weeks: readonly WeeklyPlan[], plans: readonly WorkoutPlan[], today: string): WorkoutPlan | null {
  const weekStart = mondayOf(today);
  const dayOfWeek = WEEK_DAYS[weekDates(weekStart).indexOf(today)];
  const slot = resolveEffectiveWeek(weeks, weekStart).slots.find((entry) => entry.dayOfWeek === dayOfWeek);
  const plan = slot ? plans.find((entry) => entry.id === slot.planId && !entry.deleted) : undefined;
  return plan ?? null;
}

/** A session from `planId` is already logged today — the slot / suggestion is done for the day. */
export function doneToday(sessions: readonly WorkoutSession[], planId: string, today: string): boolean {
  return sessions.some((session) => !session.deleted && session.planId === planId && session.date === today);
}

/** backlog/143 — the template has a live FOREARM_FINGERS / HANGBOARD_PINCH exercise (a finger day). */
export function planHasFingerLoad(plan: WorkoutPlan): boolean {
  return plan.exercises.some((exercise) => !exercise.deleted && isFingerLoadExercise(exercise));
}

export interface RotationSuggestion {
  candidate: RotationCandidate;
  /** backlog/143 — finger work was to be avoided, but every remaining template has it. */
  fingerFallback: boolean;
}

/**
 * The rotation's next template, skipping `excludeId` (today's slot) and templates already done today.
 * backlog/143 `avoidFingers` (a climb today or tomorrow): finger-loading templates are skipped, unless
 * no other is left — then the first one is still offered, flagged as a fallback.
 */
export function suggestNextPlan(
  plans: readonly WorkoutPlan[],
  sessions: readonly WorkoutSession[],
  today: string,
  options: { excludeId?: string | null; avoidFingers?: boolean } = {},
): RotationSuggestion | null {
  const candidates = rotationOrder(plans, sessions).filter(
    (candidate) => candidate.plan.id !== options.excludeId && !doneToday(sessions, candidate.plan.id, today),
  );
  if (candidates.length === 0) {
    return null;
  }
  if (!options.avoidFingers) {
    return { candidate: candidates[0], fingerFallback: false };
  }
  const fingerFree = candidates.find((candidate) => !planHasFingerLoad(candidate.plan));
  return fingerFree !== undefined ? { candidate: fingerFree, fingerFallback: false } : { candidate: candidates[0], fingerFallback: true };
}

/**
 * documentation/Subfeatures/Heti terv.md "Csatolt nyújtás" (backlog/170) — pure TS, no Angular.
 * A strength template may reference one stretching template (`WorkoutPlan.stretchPlanId`); after a
 * workout of that template the stretch is offered, and until it is done (or dismissed) today's log list
 * keeps a "Nyújtás indítása" card. The reference is live: a deleted stretching template is simply
 * ignored, an inactive one still works (the `active` flag only drives the pickers).
 */
import { StretchPlan } from '../../../api/model/stretchPlan';
import { StretchSession } from '../../../api/model/stretchSession';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutSession } from '../../../api/model/workoutSession';

/** The live stretching template attached to `plan`, or null (none / deleted / unknown). */
export function linkedStretchPlan(
  plan: Pick<WorkoutPlan, 'stretchPlanId'> | null | undefined,
  stretchPlans: readonly StretchPlan[],
): StretchPlan | null {
  const id = plan?.stretchPlanId ?? null;
  if (id === null) {
    return null;
  }
  return stretchPlans.find((stretchPlan) => stretchPlan.id === id && !stretchPlan.deleted) ?? null;
}

export interface PendingLinkedStretch {
  workoutSession: WorkoutSession;
  stretchPlan: StretchPlan;
}

/**
 * Today's template workouts whose template has a live attached stretch, with no live stretching session
 * recorded for them yet (`StretchSession.workoutSessionId`) and not dismissed on this device.
 */
export function pendingLinkedStretches(
  today: string,
  workoutSessions: readonly WorkoutSession[],
  plans: readonly WorkoutPlan[],
  stretchPlans: readonly StretchPlan[],
  stretchSessions: readonly StretchSession[],
  dismissed: ReadonlySet<string>,
): PendingLinkedStretch[] {
  const done = new Set(
    stretchSessions.filter((session) => !session.deleted && session.workoutSessionId).map((session) => session.workoutSessionId as string),
  );
  const pending: PendingLinkedStretch[] = [];
  for (const workoutSession of workoutSessions) {
    if (workoutSession.deleted || workoutSession.date !== today || !workoutSession.planId) {
      continue;
    }
    if (done.has(workoutSession.id) || dismissed.has(workoutSession.id)) {
      continue;
    }
    const stretchPlan = linkedStretchPlan(
      plans.find((plan) => plan.id === workoutSession.planId),
      stretchPlans,
    );
    if (stretchPlan !== null) {
      pending.push({ workoutSession, stretchPlan });
    }
  }
  return pending;
}

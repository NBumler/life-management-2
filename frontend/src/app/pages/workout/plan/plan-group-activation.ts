import { WorkoutPlan } from '../../../api/model/workoutPlan';

/**
 * documentation/Subfeatures/Heti terv.md "Sablon-csoport kapcsoló" (backlog/140) — the `goalLabel`
 * group header's one-tap focus switch. `ACTIVATE` / `DEACTIVATE` touch only the group's own templates;
 * `ONLY` activates the group and deactivates every other live template (other groups and ungrouped).
 */
export type GroupActivationMode = 'ACTIVATE' | 'DEACTIVATE' | 'ONLY';

export interface PlanActivationChange {
  plan: WorkoutPlan;
  active: boolean;
}

/** The trimmed `goalLabel`, or null — the same grouping key as the template list's headers. */
export function planGroupKey(plan: WorkoutPlan): string | null {
  return plan.goalLabel?.trim() ? plan.goalLabel.trim() : null;
}

/**
 * Only the templates whose `active` actually changes — each one is a separate nested PUT, so a
 * no-op row is never re-saved. Works on every live template, independent of the list filter.
 */
export function planGroupActivationChanges(plans: readonly WorkoutPlan[], label: string, mode: GroupActivationMode): PlanActivationChange[] {
  const changes: PlanActivationChange[] = [];
  for (const plan of plans) {
    if (plan.deleted) {
      continue;
    }
    const inGroup = planGroupKey(plan) === label;
    const target = inGroup ? mode !== 'DEACTIVATE' : mode === 'ONLY' ? false : plan.active;
    if (plan.active !== target) {
      changes.push({ plan, active: target });
    }
  }
  return changes;
}

import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { planGroupActivationChanges } from './plan-group-activation';

function plan(id: string, goalLabel: string | null, active: boolean, deleted = false): WorkoutPlan {
  return { id, name: id, goalLabel, active, deleted, exercises: [] } as unknown as WorkoutPlan;
}

describe('planGroupActivationChanges (backlog/140)', () => {
  const plans = [
    plan('a1', 'Alap', true),
    plan('a2', 'Alap', true),
    plan('o1', 'OAPU', false),
    plan('o2', ' OAPU ', true),
    plan('x', null, true),
    plan('gone', 'OAPU', false, true),
  ];
  const summary = (mode: 'ACTIVATE' | 'DEACTIVATE' | 'ONLY') =>
    planGroupActivationChanges(plans, 'OAPU', mode).map((change) => `${change.plan.id}:${change.active}`);

  it('ACTIVATE switches on only the inactive templates of the group (trimmed label match)', () => {
    expect(summary('ACTIVATE')).toEqual(['o1:true']);
  });

  it('DEACTIVATE switches off only the active templates of the group', () => {
    expect(summary('DEACTIVATE')).toEqual(['o2:false']);
  });

  it('ONLY activates the group and deactivates every other live template, ungrouped included', () => {
    expect(summary('ONLY')).toEqual(['a1:false', 'a2:false', 'o1:true', 'x:false']);
  });
});

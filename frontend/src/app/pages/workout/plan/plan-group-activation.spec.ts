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

  it('backlog/168 — is generic: stretching templates of the same label switch the same way', () => {
    const stretch = [
      { id: 's1', goalLabel: 'OAPU', active: false, deleted: false },
      { id: 's2', goalLabel: null, active: true, deleted: false },
    ];
    expect(planGroupActivationChanges(stretch, 'OAPU', 'ONLY').map((change) => `${change.plan.id}:${change.active}`)).toEqual([
      's1:true',
      's2:false',
    ]);
  });
});

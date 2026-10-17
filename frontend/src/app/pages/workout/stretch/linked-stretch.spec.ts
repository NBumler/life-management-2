import { StretchPlan } from '../../../api/model/stretchPlan';
import { StretchSession } from '../../../api/model/stretchSession';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { linkedStretchPlan, pendingLinkedStretches } from './linked-stretch';

const TODAY = '2026-10-17';
const stretch = (id: string, overrides: Partial<StretchPlan> = {}): StretchPlan => ({ id, name: id, active: true, deleted: false, items: [], ...overrides });
const plan = (id: string, stretchPlanId: string | null) => ({ id, stretchPlanId }) as unknown as WorkoutPlan;
const workout = (id: string, planId: string | null, date = TODAY, deleted = false) =>
  ({ id, planId, date, deleted, exercises: [] }) as unknown as WorkoutSession;
const stretchSession = (workoutSessionId: string, deleted = false) =>
  ({ id: `s-${workoutSessionId}`, date: TODAY, durationMinutes: 5, workoutSessionId, deleted, items: [] }) as StretchSession;

describe('linked-stretch (backlog/170)', () => {
  it('linkedStretchPlan(): the live attached template — an inactive one counts, a deleted / missing one does not', () => {
    expect(linkedStretchPlan(plan('A', 'S'), [stretch('S', { active: false })])?.id).toBe('S');
    expect(linkedStretchPlan(plan('A', 'S'), [stretch('S', { deleted: true })])).toBeNull();
    expect(linkedStretchPlan(plan('A', 'X'), [stretch('S')])).toBeNull();
    expect(linkedStretchPlan(plan('A', null), [stretch('S')])).toBeNull();
    expect(linkedStretchPlan(undefined, [stretch('S')])).toBeNull();
  });

  it('pendingLinkedStretches(): today\'s template workouts with an attached stretch not yet done or dismissed', () => {
    const plans = [plan('A', 'S'), plan('B', null)];
    const sessions = [
      workout('w1', 'A'),
      workout('w2', 'B'),
      workout('w3', null),
      workout('w4', 'A', '2026-10-16'),
      workout('w5', 'A'),
      workout('w6', 'A'),
      workout('w7', 'A', TODAY, true),
    ];
    const result = pendingLinkedStretches(
      TODAY,
      sessions,
      plans,
      [stretch('S')],
      [stretchSession('w5'), stretchSession('w1', true)],
      new Set(['w6']),
    );

    expect(result.map((entry) => `${entry.workoutSession.id}:${entry.stretchPlan.id}`)).toEqual(['w1:S']);
  });
});

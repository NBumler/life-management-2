import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { planHasFingerLoad, rotationOrder } from './rotation-suggestion';

function plan(id: string, active = true, deleted = false): WorkoutPlan {
  return { id, name: id, active, deleted, exercises: [] } as unknown as WorkoutPlan;
}

function session(planId: string | null, date: string, deleted = false): WorkoutSession {
  return { id: `${planId}-${date}`, planId, date, deleted, exercises: [] } as unknown as WorkoutSession;
}

describe('rotation-suggestion (backlog/139)', () => {
  const A = plan('A');
  const B = plan('B');
  const C = plan('C');

  it('never-done templates come first, in input order', () => {
    expect(rotationOrder([A, B, C], [session('A', '2026-09-30')]).map((entry) => entry.plan.id)).toEqual(['B', 'C', 'A']);
  });

  it('otherwise the least recently completed template is next (deleted sessions ignored)', () => {
    const sessions = [
      session('A', '2026-09-29'),
      session('B', '2026-09-27'),
      session('B', '2026-09-30', true),
      session('A', '2026-09-25'),
      session(null, '2026-09-20'),
    ];
    const order = rotationOrder([A, B], sessions);
    expect(order.map((entry) => [entry.plan.id, entry.lastDate])).toEqual([
      ['B', '2026-09-27'],
      ['A', '2026-09-29'],
    ]);
  });

  it('skips inactive and deleted templates', () => {
    expect(rotationOrder([plan('X', false), plan('Y', true, true), A], []).map((entry) => entry.plan.id)).toEqual(['A']);
  });

  describe('finger-aware suggestion (backlog/143)', () => {
    function withExercises(id: string, category: string): WorkoutPlan {
      return { ...plan(id), exercises: [{ id: `${id}-x`, deleted: false, exerciseCategory: category, exerciseKind: 'WEIGHTED_REPS' }] } as unknown as WorkoutPlan;
    }
    const fingers = withExercises('F', 'FOREARM_FINGERS');
    const pull = withExercises('P', 'BACK');

    it('planHasFingerLoad() detects a live FOREARM_FINGERS exercise', () => {
      expect(planHasFingerLoad(fingers)).toBeTrue();
      expect(planHasFingerLoad(pull)).toBeFalse();
    });
  });
});

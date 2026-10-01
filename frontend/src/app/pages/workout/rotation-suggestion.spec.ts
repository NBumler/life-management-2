import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../api/model/weeklyPlanSlot';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { doneToday, planHasFingerLoad, rotationOrder, suggestNextPlan, todaySlotPlan } from './rotation-suggestion';

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

  it('todaySlotPlan() resolves the (inherited) weekly slot of today', () => {
    const weeks = [
      {
        id: 'w',
        weekStartDate: '2026-09-21',
        deleted: false,
        slots: [{ id: 's', weeklyPlanId: 'w', dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum.Thursday, planId: 'B', deleted: false }],
      },
    ] as unknown as WeeklyPlan[];
    // 2026-10-01 is a Thursday of the following week — inherits 09-21's schedule
    expect(todaySlotPlan(weeks, [A, B], '2026-10-01')?.id).toBe('B');
    expect(todaySlotPlan(weeks, [A, B], '2026-09-30')).toBeNull();
  });

  it('doneToday() is true only for a live session of that plan today', () => {
    expect(doneToday([session('A', '2026-10-01')], 'A', '2026-10-01')).toBeTrue();
    expect(doneToday([session('A', '2026-10-01', true)], 'A', '2026-10-01')).toBeFalse();
    expect(doneToday([session('A', '2026-09-30')], 'A', '2026-10-01')).toBeFalse();
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

    it('avoidFingers skips the due finger template for the next finger-free one', () => {
      const result = suggestNextPlan([fingers, pull], [], '2026-10-01', { avoidFingers: true });
      expect([result?.candidate.plan.id, result?.fingerFallback]).toEqual(['P', false]);
      expect(suggestNextPlan([fingers, pull], [], '2026-10-01')?.candidate.plan.id).toBe('F');
    });

    it('falls back to the due template (flagged) when every template has finger work', () => {
      const result = suggestNextPlan([fingers], [], '2026-10-01', { avoidFingers: true });
      expect([result?.candidate.plan.id, result?.fingerFallback]).toEqual(['F', true]);
    });

    it('excludes today\'s slot and templates already done today', () => {
      const result = suggestNextPlan([A, B, C], [session('B', '2026-10-01')], '2026-10-01', { excludeId: 'A' });
      expect(result?.candidate.plan.id).toBe('C');
    });
  });
});

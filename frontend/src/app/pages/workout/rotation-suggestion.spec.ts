import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../api/model/weeklyPlanSlot';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { doneToday, rotationOrder, todaySlotPlan } from './rotation-suggestion';

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
});

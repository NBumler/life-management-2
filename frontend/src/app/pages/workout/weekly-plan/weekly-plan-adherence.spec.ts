import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { WEEK_DAYS, addLocalDays, isSlotCompleted, mondayOf, resolveEffectiveWeek, weekDates } from './weekly-plan-adherence';

function session(partial: Partial<WorkoutSession>): WorkoutSession {
  return {
    id: partial.id ?? 's1',
    date: partial.date ?? '2026-08-24',
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    deleted: partial.deleted ?? false,
    planId: partial.planId ?? null,
    exercises: [],
  };
}

describe('weekly-plan-adherence', () => {
  it('WEEK_DAYS is Monday..Sunday', () => {
    expect(WEEK_DAYS[0]).toBe(WeeklyPlanSlot.DayOfWeekEnum.Monday);
    expect(WEEK_DAYS[6]).toBe(WeeklyPlanSlot.DayOfWeekEnum.Sunday);
    expect(WEEK_DAYS.length).toBe(7);
  });

  it('addLocalDays crosses month boundaries', () => {
    expect(addLocalDays('2026-08-30', 3)).toBe('2026-09-02');
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('mondayOf snaps any weekday back to its Monday', () => {
    expect(mondayOf('2026-08-24')).toBe('2026-08-24'); // a Monday
    expect(mondayOf('2026-08-27')).toBe('2026-08-24'); // Thursday
    expect(mondayOf('2026-08-30')).toBe('2026-08-24'); // Sunday
  });

  it('weekDates yields the seven days from the Monday', () => {
    expect(weekDates('2026-08-24')).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);
  });

  it('isSlotCompleted needs a live session for that plan inside the week', () => {
    const sessions = [
      session({ id: 'a', planId: 'plan-1', date: '2026-08-26' }),
      session({ id: 'b', planId: 'plan-2', date: '2026-08-26' }),
      session({ id: 'c', planId: 'plan-1', date: '2026-08-26', deleted: true }),
      session({ id: 'd', planId: 'plan-1', date: '2026-08-31' }), // next week
    ];
    expect(isSlotCompleted(sessions, '2026-08-24', 'plan-1')).toBe(true);
    expect(isSlotCompleted(sessions, '2026-08-24', 'plan-3')).toBe(false);
    expect(isSlotCompleted([sessions[2], sessions[3]], '2026-08-24', 'plan-1')).toBe(false);
  });
});

describe('resolveEffectiveWeek (backlog/127)', () => {
  function slot(id: string, dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum, planId: string, deleted = false): WeeklyPlanSlot {
    return { id, weeklyPlanId: 'w', dayOfWeek, planId, deleted } as WeeklyPlanSlot;
  }
  const mon = WeeklyPlanSlot.DayOfWeekEnum.Monday;
  const weeks = [
    { weekStartDate: '2026-09-07', deleted: false, slots: [slot('a', mon, 'pA')] },
    { weekStartDate: '2026-09-21', deleted: false, slots: [slot('b', mon, 'pB'), slot('x', mon, 'gone', true)] },
    { weekStartDate: '2026-10-05', deleted: true, slots: [slot('c', mon, 'pC')] },
  ];

  it("uses the week's own row", () => {
    const week = resolveEffectiveWeek(weeks, '2026-09-21');
    expect(week.inherited).toBeFalse();
    expect(week.slots.map((s) => s.planId)).toEqual(['pB']);
  });

  it('inherits the most recent earlier schedule, forwards only', () => {
    const inherited = resolveEffectiveWeek(weeks, '2026-09-14');
    expect(inherited).toEqual(jasmine.objectContaining({ inherited: true, sourceWeekStart: '2026-09-07' }));
    expect(inherited.slots.map((s) => s.planId)).toEqual(['pA']);
    // a deleted row is ignored → still inherits 09-21
    expect(resolveEffectiveWeek(weeks, '2026-10-12').sourceWeekStart).toBe('2026-09-21');
  });

  it('is empty before the first schedule ever set', () => {
    expect(resolveEffectiveWeek(weeks, '2026-08-31')).toEqual({ slots: [], sourceWeekStart: null, inherited: false });
  });

  it('an own row with no slots is an explicit empty week (not inherited)', () => {
    const withEmpty = [...weeks, { weekStartDate: '2026-09-28', deleted: false, slots: [] }];
    expect(resolveEffectiveWeek(withEmpty, '2026-09-28')).toEqual({ slots: [], sourceWeekStart: '2026-09-28', inherited: false });
    expect(resolveEffectiveWeek(withEmpty, '2026-10-05').slots).toEqual([]);
  });
});

import { LifePlan } from '../../../api/model/lifePlan';
import { groupLifePlans, isLifePlanOverdue, lifePlanLagDays } from './life-plan-sections';

function plan(overrides: Partial<LifePlan> = {}): LifePlan {
  return {
    id: 'p1',
    title: 'Terv',
    notes: null,
    status: LifePlan.StatusEnum.Planned,
    targetDate: null,
    completedAt: null,
    deleted: false,
    ...overrides,
  };
}

describe('isLifePlanOverdue', () => {
  it('is true for a live, non-DONE plan with a past targetDate', () => {
    expect(isLifePlanOverdue(plan({ status: LifePlan.StatusEnum.Planned, targetDate: '2020-01-01' }), '2020-06-01')).toBe(true);
  });

  it('is false without a targetDate', () => {
    expect(isLifePlanOverdue(plan({ targetDate: null }), '2020-06-01')).toBe(false);
  });

  it('is false for a future targetDate', () => {
    expect(isLifePlanOverdue(plan({ targetDate: '2020-12-31' }), '2020-06-01')).toBe(false);
  });

  it('is never true for DONE, even with a past targetDate', () => {
    expect(isLifePlanOverdue(plan({ status: LifePlan.StatusEnum.Done, targetDate: '2020-01-01' }), '2020-06-01')).toBe(false);
  });
});

describe('lifePlanLagDays', () => {
  it('counts whole days between targetDate and today', () => {
    expect(lifePlanLagDays('2020-01-01', '2020-01-05')).toBe(4);
  });
});

describe('groupLifePlans', () => {
  const today = '2020-06-01';

  it('splits by status into three sections', () => {
    const plans = [
      plan({ id: 'a', status: LifePlan.StatusEnum.Planned }),
      plan({ id: 'b', status: LifePlan.StatusEnum.InProgress }),
      plan({ id: 'c', status: LifePlan.StatusEnum.Done, completedAt: '2020-05-01T00:00:00Z' }),
    ];

    const sections = groupLifePlans(plans, today);

    expect(sections.planned.map((p) => p.id)).toEqual(['a']);
    expect(sections.inProgress.map((p) => p.id)).toEqual(['b']);
    expect(sections.done.map((p) => p.id)).toEqual(['c']);
  });

  it('orders active sections: overdue first, then targetDate ascending, then undated, then title', () => {
    const plans = [
      plan({ id: 'undated', title: 'Zulu', targetDate: null }),
      plan({ id: 'future', title: 'Bravo', targetDate: '2020-07-01' }),
      plan({ id: 'overdue-late', title: 'Alfa', targetDate: '2020-01-01' }),
      plan({ id: 'overdue-early', title: 'Charlie', targetDate: '2019-12-01' }),
    ];

    const sections = groupLifePlans(plans, today);

    expect(sections.planned.map((p) => p.id)).toEqual(['overdue-early', 'overdue-late', 'future', 'undated']);
  });

  it('orders the DONE section by completedAt descending, then title', () => {
    const plans = [
      plan({ id: 'older', status: LifePlan.StatusEnum.Done, completedAt: '2020-01-01T00:00:00Z' }),
      plan({ id: 'newer', status: LifePlan.StatusEnum.Done, completedAt: '2020-05-01T00:00:00Z' }),
    ];

    const sections = groupLifePlans(plans, today);

    expect(sections.done.map((p) => p.id)).toEqual(['newer', 'older']);
  });
});

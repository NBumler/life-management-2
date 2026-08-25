import { addDaysToDate, projectHouseholdTaskOccurrences, rollForwardHouseholdTask } from './household-occurrence';

describe('addDaysToDate', () => {
  it('adds days across a month boundary', () => {
    expect(addDaysToDate('2026-01-30', 3)) .toBe('2026-02-02');
  });

  it('adds days across a year boundary', () => {
    expect(addDaysToDate('2026-12-30', 5)).toBe('2027-01-04');
  });
});

describe('rollForwardHouseholdTask', () => {
  it('sets nextDue to today + intervalDays, regardless of how overdue the task was', () => {
    // documentation/Subfeatures/Háztartási feladatok.md: "a ritmus a pipálás napjához igazodik" —
    // an old nextDue of e.g. 2025-01-01 must not matter, only today does.
    const result = rollForwardHouseholdTask(7, '2026-06-01', '2026-06-01T09:00:00Z');

    expect(result.nextDue).toBe('2026-06-08');
    expect(result.lastCompletedAt).toBe('2026-06-01T09:00:00Z');
  });

  it('early completion still rolls from today, not from the original nextDue', () => {
    const result = rollForwardHouseholdTask(7, '2026-06-01', '2026-06-01T09:00:00Z');

    expect(result.nextDue).toBe('2026-06-08');
  });
});

describe('projectHouseholdTaskOccurrences', () => {
  const today = '2026-06-01';

  it('emits the live nextDue on its own day, marked overdue when in the past', () => {
    const occurrences = projectHouseholdTaskOccurrences({ nextDue: '2026-05-20', intervalDays: 30 }, today);

    expect(occurrences[0]).toEqual({ date: '2026-05-20', overdue: true });
  });

  it('does not mark a future or today nextDue as overdue', () => {
    expect(projectHouseholdTaskOccurrences({ nextDue: today, intervalDays: 7 }, today)[0]).toEqual({
      date: today,
      overdue: false,
    });
    expect(projectHouseholdTaskOccurrences({ nextDue: '2026-06-15', intervalDays: 7 }, today)[0]).toEqual({
      date: '2026-06-15',
      overdue: false,
    });
  });

  it('skips further past occurrences once caught up to today (no backlog flood)', () => {
    // A weekly task overdue since 2026-01-01: only the live nextDue is overdue; every subsequent
    // emitted date must be >= today, not a run of missed past weeks.
    const occurrences = projectHouseholdTaskOccurrences({ nextDue: '2026-01-01', intervalDays: 7 }, today);

    expect(occurrences[0]).toEqual({ date: '2026-01-01', overdue: true });
    expect(occurrences.slice(1).every((o) => o.date >= today && !o.overdue)).toBe(true);
  });

  it('caps at 10 total occurrences for a short interval', () => {
    const occurrences = projectHouseholdTaskOccurrences({ nextDue: today, intervalDays: 1 }, today);

    expect(occurrences.length).toBe(10);
  });

  it('emits 0 occurrences when the live nextDue itself is beyond the 1-year horizon', () => {
    const occurrences = projectHouseholdTaskOccurrences({ nextDue: '2028-01-01', intervalDays: 30 }, today);

    expect(occurrences).toEqual([]);
  });

  it('stops emitting once a step would land beyond the horizon, even under 10 occurrences', () => {
    // A ~6-month rhythm from today: only 2 occurrences fit inside a 1-year horizon.
    const occurrences = projectHouseholdTaskOccurrences({ nextDue: today, intervalDays: 180 }, today);

    expect(occurrences.length).toBeLessThan(10);
    expect(occurrences.every((o) => o.date <= addDaysToDate(today, 365))).toBe(true);
  });
});

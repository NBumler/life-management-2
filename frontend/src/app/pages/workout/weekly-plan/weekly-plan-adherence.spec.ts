import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WEEK_DAYS, addLocalDays, mondayOf, weekDates } from './weekly-plan-adherence';

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
});

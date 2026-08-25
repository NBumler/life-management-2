import { buildMonthGrid } from './calendar-month-grid';

describe('buildMonthGrid', () => {
  it('starts the grid on a Monday', () => {
    const grid = buildMonthGrid(2026, 6);
    const firstDate = new Date(`${grid[0].date}T00:00:00Z`);

    expect(firstDate.getUTCDay()).toBe(1); // Monday
  });

  it('ends the grid on a Sunday', () => {
    const grid = buildMonthGrid(2026, 6);
    const lastDate = new Date(`${grid[grid.length - 1].date}T00:00:00Z`);

    expect(lastDate.getUTCDay()).toBe(0); // Sunday
  });

  it('marks every day of June 2026 as inCurrentMonth, and the surrounding days as not', () => {
    const grid = buildMonthGrid(2026, 6);
    const juneDays = grid.filter((day) => day.inCurrentMonth);

    expect(juneDays.length).toBe(30);
    expect(juneDays[0].date).toBe('2026-06-01');
    expect(juneDays[juneDays.length - 1].date).toBe('2026-06-30');
    expect(grid.some((day) => !day.inCurrentMonth)).toBe(true);
  });

  it('produces a whole number of 7-day weeks', () => {
    const grid = buildMonthGrid(2026, 6);

    expect(grid.length % 7).toBe(0);
  });
});

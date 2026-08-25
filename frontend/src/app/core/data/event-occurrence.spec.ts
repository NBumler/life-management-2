import { CalendarEvent } from '../../api/model/calendarEvent';
import { addDaysToDate, projectEventOccurrences } from './event-occurrence';

describe('addDaysToDate', () => {
  it('adds negative days across a year boundary', () => {
    expect(addDaysToDate('2026-01-02', -3)).toBe('2025-12-30');
  });
});

describe('projectEventOccurrences', () => {
  const today = '2026-06-01';

  it('one-off: emits the date when inside the ±1 year window', () => {
    expect(projectEventOccurrences({ date: '2026-07-01', frequency: null, interval: 1 }, today)).toEqual(['2026-07-01']);
  });

  it('one-off: emits nothing outside the ±1 year window', () => {
    expect(projectEventOccurrences({ date: '2028-01-01', frequency: null, interval: 1 }, today)).toEqual([]);
  });

  it('DAILY: steps by interval days across the full window, no count cap', () => {
    const occurrences = projectEventOccurrences({ date: today, frequency: CalendarEvent.FrequencyEnum.Daily, interval: 10 }, today);

    expect(occurrences.length).toBeGreaterThan(10);
    expect(occurrences[0]).toBe(today);
    expect(occurrences[1]).toBe(addDaysToDate(today, 10));
  });

  it('WEEKLY: steps by interval * 7 days and still reaches a far-future occurrence, no count cap', () => {
    // documentation/Features/Események.md: "heti esemény a távoli hónapban is kell" — no cap trims it.
    const dtstart = '2020-01-02';
    const occurrences = projectEventOccurrences({ date: dtstart, frequency: CalendarEvent.FrequencyEnum.Weekly, interval: 1 }, today);

    // Every occurrence must be dtstart + a whole multiple of 7 days.
    const dtstartMs = Date.parse(`${dtstart}T00:00:00Z`);
    for (const occurrence of occurrences) {
      const diffDays = (Date.parse(`${occurrence}T00:00:00Z`) - dtstartMs) / 86_400_000;
      expect(diffDays % 7).toBe(0);
    }
    expect(occurrences.length).toBeGreaterThan(20);
  });

  it('YEARLY: repeats on the same month/day each interval', () => {
    const occurrences = projectEventOccurrences({ date: '2025-06-15', frequency: CalendarEvent.FrequencyEnum.Yearly, interval: 1 }, today);

    expect(occurrences).toEqual(['2025-06-15', '2026-06-15']);
  });

  it('YEARLY: a Feb 29 dtstart skips non-leap years, landing on the next real Feb 29', () => {
    // documentation/Features/Események.md: "feb. 29. nem-szökőévben kihagyva ... a következő érvényes feb. 29."
    // 2025/2026/2027 aren't leap years, so the only valid occurrence in range is 2028-02-29.
    const occurrences = projectEventOccurrences({ date: '2024-02-29', frequency: CalendarEvent.FrequencyEnum.Yearly, interval: 1 }, '2028-06-01');

    expect(occurrences).toEqual(['2028-02-29']);
  });

  it('stops emitting once past the +1 year horizon', () => {
    const occurrences = projectEventOccurrences({ date: today, frequency: CalendarEvent.FrequencyEnum.Yearly, interval: 1 }, today);

    expect(occurrences).toEqual([today, '2027-06-01']);
  });
});

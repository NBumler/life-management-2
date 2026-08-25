import { CalendarEvent } from '../../../api/model/calendarEvent';
import { buildEventOccurrenceRows, groupEventOccurrences } from './event-sections';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Fogorvos',
    location: null,
    notes: null,
    allDay: false,
    date: '2026-06-01',
    startTime: '10:00',
    endTime: '11:00',
    frequency: null,
    interval: 1,
    deleted: false,
    ...overrides,
  };
}

describe('buildEventOccurrenceRows', () => {
  it('produces one row per projected occurrence, carrying the event fields', () => {
    const rows = buildEventOccurrenceRows([event({ date: '2026-06-01' })], '2026-06-01');

    expect(rows).toEqual([
      { eventId: 'e1', date: '2026-06-01', allDay: false, startTime: '10:00', endTime: '11:00', title: 'Fogorvos', location: null, recurring: false },
    ]);
  });
});

describe('groupEventOccurrences', () => {
  const today = '2026-06-01';

  it('splits into today / upcoming / past by date', () => {
    // Both "a" and "c" must stay inside the ±1 year horizon (documentation/Features/Események.md
    // "Előfordulás-vetítés") or projectEventOccurrences correctly emits nothing for them.
    const rows = buildEventOccurrenceRows(
      [event({ id: 'a', date: '2026-01-01' }), event({ id: 'b', date: today }), event({ id: 'c', date: '2027-01-01' })],
      today,
    );

    const sections = groupEventOccurrences(rows, today);

    expect(sections.today.map((r) => r.eventId)).toEqual(['b']);
    expect(sections.upcoming.map((r) => r.eventId)).toEqual(['c']);
    expect(sections.past.map((r) => r.eventId)).toEqual(['a']);
  });

  it('today/upcoming: orders all-day before timed, then startTime ascending, then title', () => {
    const rows = [
      { eventId: 'timed-late', date: today, allDay: false, startTime: '18:00', endTime: '19:00', title: 'Zulu', location: null, recurring: false },
      { eventId: 'timed-early', date: today, allDay: false, startTime: '09:00', endTime: '10:00', title: 'Alfa', location: null, recurring: false },
      { eventId: 'allday', date: today, allDay: true, startTime: null, endTime: null, title: 'Bravo', location: null, recurring: false },
    ];

    const sections = groupEventOccurrences(rows, today);

    expect(sections.today.map((r) => r.eventId)).toEqual(['allday', 'timed-early', 'timed-late']);
  });

  it('past: orders newest date first, and within a day all-day before timed-descending', () => {
    const rows = [
      { eventId: 'older', date: '2026-01-01', allDay: false, startTime: '09:00', endTime: '10:00', title: 'X', location: null, recurring: false },
      { eventId: 'newer-timed', date: '2026-05-01', allDay: false, startTime: '09:00', endTime: '10:00', title: 'X', location: null, recurring: false },
      { eventId: 'newer-allday', date: '2026-05-01', allDay: true, startTime: null, endTime: null, title: 'X', location: null, recurring: false },
    ];

    const sections = groupEventOccurrences(rows, today);

    expect(sections.past.map((r) => r.eventId)).toEqual(['newer-allday', 'newer-timed', 'older']);
  });
});

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';
import { buildCalendarOccurrences, occurrencesForDate } from './calendar-occurrence';

function task(overrides: Partial<HouseholdTask> = {}): HouseholdTask {
  return {
    id: 't1',
    roomId: 'r1',
    name: 'Mosogatás',
    energyLevel: HouseholdTask.EnergyLevelEnum.Low,
    estimatedMinutes: 10,
    intervalDays: 7,
    nextDue: '2026-06-01',
    lastCompletedAt: null,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

function room(overrides: Partial<HouseholdRoom> = {}): HouseholdRoom {
  return { id: 'r1', name: 'Konyha', sortOrder: 0, deleted: false, ...overrides };
}

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Fogorvos',
    location: 'Rendelő',
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

describe('buildCalendarOccurrences', () => {
  const today = '2026-06-01';

  it('includes only the active sources', () => {
    const occurrences = buildCalendarOccurrences([task()], [room()], [event()], today, new Set(['HOUSEHOLD_TASK']));

    expect(occurrences.every((o) => o.source === 'HOUSEHOLD_TASK')).toBe(true);
  });

  it('resolves the room name as the household occurrence subtitle', () => {
    const occurrences = buildCalendarOccurrences([task({ roomId: 'r1' })], [room({ id: 'r1', name: 'Konyha' })], [], today, new Set(['HOUSEHOLD_TASK']));

    expect(occurrences[0].subtitle).toBe('Konyha');
    expect(occurrences[0].completable).toBe(true);
  });

  it('event occurrences are never completable and use location as subtitle', () => {
    const occurrences = buildCalendarOccurrences([], [], [event({ location: 'Rendelő' })], today, new Set(['EVENT']));

    expect(occurrences[0].completable).toBe(false);
    expect(occurrences[0].subtitle).toBe('Rendelő');
  });

  it('all sources off yields no occurrences at all', () => {
    const occurrences = buildCalendarOccurrences([task()], [room()], [event()], today, new Set());

    expect(occurrences).toEqual([]);
  });
});

describe('occurrencesForDate', () => {
  const today = '2026-06-01';

  it('orders all-day before timed, household before event within all-day, then by room sortOrder', () => {
    const occurrences = buildCalendarOccurrences(
      [task({ id: 'kitchen-task', roomId: 'kitchen', nextDue: today }), task({ id: 'bath-task', roomId: 'bath', nextDue: today, name: 'Zulu' })],
      [room({ id: 'kitchen', sortOrder: 1 }), room({ id: 'bath', sortOrder: 0 })],
      [event({ id: 'e1', date: today, allDay: false, startTime: '09:00', endTime: '10:00' })],
      today,
      new Set(['HOUSEHOLD_TASK', 'EVENT']),
    );

    const rows = occurrencesForDate(occurrences, today);

    expect(rows.map((r) => r.sourceEntityId)).toEqual(['bath-task', 'kitchen-task', 'e1']);
  });
});

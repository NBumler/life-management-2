import { CalendarEvent } from '../../../api/model/calendarEvent';
import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';
import { projectEventOccurrences } from '../../../core/data/event-occurrence';
import { projectHouseholdTaskOccurrences } from '../../../core/data/household-occurrence';

/**
 * documentation/Features/Naptár.md "Producer registry": the only two live producers in the MVP.
 * `LIFE_PLAN` is deliberately absent — Élet tervek is `Kész` but explicitly not a producer.
 */
export type CalendarSource = 'HOUSEHOLD_TASK' | 'EVENT';

/**
 * documentation/Features/Naptár.md "Előfordulás DTO": client-side only, never persisted. Unique key
 * is `source` + `sourceEntityId` + `date`. The naptár never re-projects — it only reads the two
 * producers' own projection utilities (`household-occurrence.ts`, `event-occurrence.ts`).
 */
export interface CalendarOccurrence {
  source: CalendarSource;
  sourceEntityId: string;
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  title: string;
  subtitle: string | null;
  completable: boolean;
  overdue: boolean;
  /** Household-only, for the day-list row; other producers omit them. */
  energyLevel?: HouseholdTask.EnergyLevelEnum;
  estimatedMinutes?: number;
  /** Household-only sort key (the room's manual order) — resolved once here so the day list never re-joins rooms. */
  roomSortOrder?: number;
}

export function buildCalendarOccurrences(
  householdTasks: readonly HouseholdTask[],
  rooms: readonly HouseholdRoom[],
  events: readonly CalendarEvent[],
  today: string,
  activeSources: ReadonlySet<CalendarSource>,
): CalendarOccurrence[] {
  const occurrences: CalendarOccurrence[] = [];

  if (activeSources.has('HOUSEHOLD_TASK')) {
    const roomById = new Map(rooms.map((room) => [room.id, room]));
    for (const task of householdTasks) {
      const room = roomById.get(task.roomId);
      for (const occurrence of projectHouseholdTaskOccurrences(task, today)) {
        occurrences.push({
          source: 'HOUSEHOLD_TASK',
          sourceEntityId: task.id,
          date: occurrence.date,
          allDay: true,
          startTime: null,
          endTime: null,
          title: task.name,
          subtitle: room?.name ?? null,
          completable: true,
          overdue: occurrence.overdue,
          energyLevel: task.energyLevel,
          estimatedMinutes: task.estimatedMinutes,
          roomSortOrder: room?.sortOrder ?? 0,
        });
      }
    }
  }

  if (activeSources.has('EVENT')) {
    for (const event of events) {
      for (const date of projectEventOccurrences(event, today)) {
        occurrences.push({
          source: 'EVENT',
          sourceEntityId: event.id,
          date,
          allDay: event.allDay,
          startTime: event.startTime ?? null,
          endTime: event.endTime ?? null,
          title: event.title,
          subtitle: event.location ?? null,
          completable: false,
          overdue: false,
        });
      }
    }
  }

  return occurrences;
}

export function occurrencesForDate(occurrences: readonly CalendarOccurrence[], date: string): CalendarOccurrence[] {
  return occurrences.filter((occurrence) => occurrence.date === date).sort(compareDayOrder);
}

export function groupOccurrencesByDate(occurrences: readonly CalendarOccurrence[]): Map<string, CalendarOccurrence[]> {
  const map = new Map<string, CalendarOccurrence[]>();
  for (const occurrence of occurrences) {
    const list = map.get(occurrence.date);
    if (list === undefined) {
      map.set(occurrence.date, [occurrence]);
    } else {
      list.push(occurrence);
    }
  }
  return map;
}

/**
 * documentation/Features/Naptár.md "Napi lista" sorrend: egész napos elöl — háztartás, majd
 * esemény, azon belül helyiség sortOrder / title — utána időzítettek startTime, majd title.
 */
function compareDayOrder(a: CalendarOccurrence, b: CalendarOccurrence): number {
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  if (!a.allDay) {
    const startA = a.startTime ?? '';
    const startB = b.startTime ?? '';
    if (startA !== startB) {
      return startA < startB ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  }
  if (a.source !== b.source) {
    return a.source === 'HOUSEHOLD_TASK' ? -1 : 1;
  }
  if (a.source === 'HOUSEHOLD_TASK' && a.roomSortOrder !== b.roomSortOrder) {
    return (a.roomSortOrder ?? 0) - (b.roomSortOrder ?? 0);
  }
  return a.title.localeCompare(b.title);
}

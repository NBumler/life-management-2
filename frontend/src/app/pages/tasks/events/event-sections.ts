import { CalendarEvent } from '../../../api/model/calendarEvent';
import { projectEventOccurrences } from '../../../core/data/event-occurrence';

export interface EventOccurrenceRow {
  eventId: string;
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  title: string;
  location: string | null;
  recurring: boolean;
  frequency: CalendarEvent.FrequencyEnum | null;
}

/** Flattens every live event's horizon occurrences (documentation/Features/Események.md producer) into one list. */
export function buildEventOccurrenceRows(events: CalendarEvent[], today: string): EventOccurrenceRow[] {
  const rows: EventOccurrenceRow[] = [];
  for (const event of events) {
    for (const date of projectEventOccurrences(event, today)) {
      rows.push({
        eventId: event.id,
        date,
        allDay: event.allDay,
        startTime: event.startTime ?? null,
        endTime: event.endTime ?? null,
        title: event.title,
        location: event.location ?? null,
        recurring: event.frequency != null,
        frequency: event.frequency ?? null,
      });
    }
  }
  return rows;
}

export interface EventSections {
  today: EventOccurrenceRow[];
  upcoming: EventOccurrenceRow[];
  past: EventOccurrenceRow[];
}

/**
 * documentation/Features/Események.md "Lista": Ma (date = ma) / Közelgő (date > ma) / Múlt
 * (date < ma), szekciók az **előfordulásokból**, nem a nyers sorozat-sorokból. Ma/Közelgő: egész
 * napos elöl, majd startTime, majd title. Múlt: dátum csökkenő, napon belül egész napos elöl, majd
 * startTime csökkenő.
 */
export function groupEventOccurrences(rows: EventOccurrenceRow[], today: string): EventSections {
  const todayRows = rows.filter((row) => row.date === today);
  const upcomingRows = rows.filter((row) => row.date > today);
  const pastRows = rows.filter((row) => row.date < today);

  return {
    today: todayRows.sort((a, b) => compareWithinDay(a, b, false)),
    upcoming: upcomingRows.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : compareWithinDay(a, b, false))),
    past: pastRows.sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : compareWithinDay(a, b, true))),
  };
}

function compareWithinDay(a: EventOccurrenceRow, b: EventOccurrenceRow, startTimeDescending: boolean): number {
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  if (!a.allDay) {
    const startA = a.startTime ?? '';
    const startB = b.startTime ?? '';
    if (startA !== startB) {
      const cmp = startA < startB ? -1 : 1;
      return startTimeDescending ? -cmp : cmp;
    }
  }
  return a.title.localeCompare(b.title);
}

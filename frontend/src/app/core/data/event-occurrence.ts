import { CalendarEvent } from '../../api/model/calendarEvent';

/**
 * documentation/Features/Események.md — pure-TS occurrence projection. SSOT: the event list and the
 * Naptár feature both read this output, neither re-derives it.
 */

/** `date` is a client calendar day (`YYYY-MM-DD`, no time zone) — arithmetic done in UTC to dodge DST. */
export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return formatDate(result);
}

/**
 * `valid` is false when the target year has no such calendar day (Feb 29 in a non-leap year) —
 * `Date.UTC` silently rolls that over to March 1st, which this detects by month drift.
 */
function addYearsToDate(date: string, years: number): { date: string; valid: boolean } {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year + years, month - 1, day));
  return { date: formatDate(result), valid: result.getUTCMonth() === month - 1 };
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

type RecurrenceInput = Pick<CalendarEvent, 'date' | 'frequency' | 'interval'>;

/**
 * documentation/Features/Események.md "next(d)": DAILY/WEEKLY step by days; YEARLY keeps the
 * cumulative year offset from `dtstart` and skips forward by another `interval` years whenever the
 * target Feb 29 doesn't exist, rather than drifting the month/day.
 */
function nextOccurrence(event: RecurrenceInput, current: string, yearsSoFar: number): { date: string; yearsSoFar: number } {
  if (event.frequency === CalendarEvent.FrequencyEnum.Daily) {
    return { date: addDaysToDate(current, event.interval), yearsSoFar };
  }
  if (event.frequency === CalendarEvent.FrequencyEnum.Weekly) {
    return { date: addDaysToDate(current, event.interval * 7), yearsSoFar };
  }
  // YEARLY
  let years = yearsSoFar + event.interval;
  let attempt = addYearsToDate(event.date, years);
  while (!attempt.valid) {
    years += event.interval;
    attempt = addYearsToDate(event.date, years);
  }
  return { date: attempt.date, yearsSoFar: years };
}

/**
 * documentation/Features/Események.md "Előfordulás-vetítés (producer)": horizon
 * `windowStart = ma − 1 év`, `windowEnd = ma + 1 év`, no occurrence-count cap (unlike Háztartási
 * feladatok's 10-occurrence cap — a weekly event in a far month still has to show up).
 */
export function projectEventOccurrences(event: RecurrenceInput, today: string): string[] {
  const windowStart = addDaysToDate(today, -365);
  const windowEnd = addDaysToDate(today, 365);

  if (event.frequency === undefined || event.frequency === null) {
    return event.date >= windowStart && event.date <= windowEnd ? [event.date] : [];
  }

  const occurrences: string[] = [];
  let current = event.date;
  let yearsSoFar = 0;
  while (current < windowStart) {
    const next = nextOccurrence(event, current, yearsSoFar);
    current = next.date;
    yearsSoFar = next.yearsSoFar;
  }
  while (current <= windowEnd) {
    occurrences.push(current);
    const next = nextOccurrence(event, current, yearsSoFar);
    current = next.date;
    yearsSoFar = next.yearsSoFar;
  }
  return occurrences;
}

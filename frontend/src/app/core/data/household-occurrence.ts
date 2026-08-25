/**
 * documentation/Subfeatures/Háztartási feladatok.md — pure-TS "pipálás" roll-forward and the Naptár
 * producer projection. SSOT: the Naptár feature reads this output, it never re-derives it.
 */

/** `date` is a client calendar day (`YYYY-MM-DD`, no time zone) — arithmetic done in UTC to dodge DST. */
export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/**
 * documentation/Subfeatures/Háztartási feladatok.md "Pipálás": `nextDue` rolls forward from the
 * calendar day of the tap (not from the old `nextDue`), regardless of how overdue or how early the
 * task was — "ha 3 napot késtél: nem marad azonnal újra esedékes; a ritmus a pipálás napjához igazodik".
 */
export function rollForwardHouseholdTask(
  intervalDays: number,
  today: string,
  now: string,
): { nextDue: string; lastCompletedAt: string } {
  return { nextDue: addDaysToDate(today, intervalDays), lastCompletedAt: now };
}

export interface HouseholdTaskOccurrence {
  date: string;
  overdue: boolean;
}

/**
 * documentation/Subfeatures/Háztartási feladatok.md "Naptár-szerződés (producer)": horizon = ma + 1
 * év; the live `nextDue` emits on its own (possibly past) day; up to 10 total occurrences, future
 * steps only (skips further past dates once caught up to today).
 */
export function projectHouseholdTaskOccurrences(
  task: { nextDue: string; intervalDays: number },
  today: string,
): HouseholdTaskOccurrence[] {
  const horizon = addDaysToDate(today, 365);
  const occurrences: HouseholdTaskOccurrence[] = [];

  if (task.nextDue <= horizon) {
    occurrences.push({ date: task.nextDue, overdue: task.nextDue < today });
  }

  let d = addDaysToDate(task.nextDue, task.intervalDays);
  while (occurrences.length < 10) {
    if (d > horizon) {
      break;
    }
    if (d >= today) {
      occurrences.push({ date: d, overdue: false });
    }
    d = addDaysToDate(d, task.intervalDays);
  }

  return occurrences;
}

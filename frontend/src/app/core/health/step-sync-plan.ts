import { addDaysIso } from '../../shared/local-date';

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md "Mikor kell sync":
 * pure planning for the app-open self-healing backfill.
 *
 * On every app open the sync reads today's step count, **and** looks back over the last
 * `lookbackDays` calendar days (today excluded) for days that have **no** local `DailyStepLog` row
 * yet — neither a manual entry nor an earlier sync — and pulls those from Health Connect too. This
 * is what protects against the 08:00 background job being deferred / killed by the OS (Doze,
 * aggressive battery optimisation): a missed day is filled in at the latest on the next app open,
 * as long as Health Connect's local retention still covers it.
 */
export function datesNeedingBackfill(todayIso: string, existingLiveDates: Iterable<string>, lookbackDays: number): string[] {
  const have = new Set(existingLiveDates);
  const result: string[] = [];
  for (let back = 1; back <= lookbackDays; back += 1) {
    const date = addDaysIso(todayIso, -back);
    if (!have.has(date)) {
      result.push(date);
    }
  }
  return result;
}

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md "Mikor kell
 * felülírni": a Health Connect reading only replaces the stored value when it is strictly greater
 * (a missing day counts as 0). Kept as a pure function so the rule is testable independently of the
 * repository plumbing that also enforces it in `DailyStepLogRepository.maxWinsUpsert`.
 */
export function shouldApplyHealthConnectValue(healthConnectSteps: number, storedSteps: number): boolean {
  return healthConnectSteps > storedSteps;
}

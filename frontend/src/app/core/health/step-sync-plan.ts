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

// The "strictly greater wins (missing day = 0)" rule is enforced in one place —
// DailyStepLogRepository.maxWinsUpsert. It is deliberately not duplicated as a helper here.

/** Prefix the native ReminderWorker uses to stash a Health Connect reading for the app to pick up. */
export const PENDING_NATIVE_STEP_PREFIX = 'steps.pendingHealthConnect.';

export interface PendingStepReading {
  date: string;
  steps: number;
}

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — the 09:00 worker
 * can't write the app's SQLite / outbox, so it stashes yesterday's Health Connect step total under
 * `steps.pendingHealthConnect.<YYYY-MM-DD>` in `@capacitor/preferences`. This parses those entries
 * (from `Preferences.keys()` + `get`) into `{date, steps}` readings for
 * {@link ActivityStepSyncService} to `maxWinsUpsert`, and lists every matching key to remove
 * afterwards (invalid ones included, so a bad value can't wedge forever).
 */
export function drainPendingNativeStepReadings(
  entries: Iterable<{ key: string; value: string | null }>,
): { readings: PendingStepReading[]; keysToClear: string[] } {
  const readings: PendingStepReading[] = [];
  const keysToClear: string[] = [];
  for (const { key, value } of entries) {
    if (!key.startsWith(PENDING_NATIVE_STEP_PREFIX)) {
      continue;
    }
    keysToClear.push(key);
    const date = key.slice(PENDING_NATIVE_STEP_PREFIX.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || value === null) {
      continue;
    }
    const steps = Number(value);
    if (Number.isFinite(steps) && steps > 0) {
      readings.push({ date, steps: Math.round(steps) });
    }
  }
  return { readings, keysToClear };
}

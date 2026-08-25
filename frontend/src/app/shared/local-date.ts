/**
 * documentation/Architektúra/Backend-offline first.md: every "ma" in the app is the "kliens naptári
 * nap (TZ)" — the device's own local calendar day, not UTC. `Date#toISOString()` always renders in
 * UTC, so `new Date().toISOString().slice(0, 10)` is off by one day for part of the day in every
 * timezone east of UTC (including Hungary) — use this instead everywhere a screen needs "today" as
 * `YYYY-MM-DD`.
 */
export function today(): string {
  return toLocalDateString(new Date());
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

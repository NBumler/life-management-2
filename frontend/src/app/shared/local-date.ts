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

/**
 * `iso` (a `YYYY-MM-DD` calendar day) shifted by `delta` whole days, returned as `YYYY-MM-DD`.
 * Arithmetic runs in UTC so it is DST-agnostic — the result is a plain calendar date, not an instant.
 */
export function addDaysIso(iso: string, delta: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * documentation/Features/Tápérték kalkulátor.md "Kanonikus napi mezők": whole completed years,
 * `floor` period, in the client's TZ (both args are `YYYY-MM-DD` client calendar days). Shared by
 * the TDEE engine and the net-salary calculator so the "25 év alatt" / age inputs stay identical.
 */
export function ageInYears(birthDateIso: string, todayIso: string): number {
  const [birthYear, birthMonth, birthDay] = birthDateIso.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = todayIso.split('-').map(Number);
  let age = todayYear - birthYear;
  if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
    age -= 1;
  }
  return age;
}

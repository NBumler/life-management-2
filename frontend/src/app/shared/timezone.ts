/**
 * documentation/Subfeatures/Étkezés.md "Időzóna" — `eatenAt` is stored as a UTC instant plus the
 * IANA zone id the client was in when it was recorded, but the *dashboard* always buckets by the
 * *viewing* device's current calendar day, which may be a different zone (a different device, or
 * the same device after travelling). No timezone-aware entity exists elsewhere in this codebase
 * (CalendarEvent stores a plain local date/time with no zone at all) — this is new plumbing.
 */

/** The device's own current IANA zone, e.g. `Europe/Budapest`. */
export function deviceTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * The calendar day (`YYYY-MM-DD`) that `isoInstant` falls on when viewed in `timeZoneId` — the
 * dashboard's "which day does this meal belong to" resolution, always evaluated against the
 * *viewing* client's current zone, not the zone the meal was originally recorded in.
 */
export function calendarDayInZone(isoInstant: string, timeZoneId: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZoneId,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoInstant));
  const year = parts.find((part) => part.type === 'year')!.value;
  const month = parts.find((part) => part.type === 'month')!.value;
  const day = parts.find((part) => part.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

/**
 * Builds a UTC instant from a local `YYYY-MM-DD` date + `HH:mm` time picked in the *device's own
 * current* zone — safe as plain `Date` construction (no arbitrary-zone→instant math needed) since
 * the meal editor only calls this when recording "now, here" (a fresh meal, or an edit that actually
 * changed the date/time); an untouched edit keeps the meal's original stored instant + zone instead.
 */
export function instantFromLocalDateTime(dateIso: string, timeHHmm: string): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hours, minutes] = timeHHmm.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

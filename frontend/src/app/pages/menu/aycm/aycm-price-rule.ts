import { AycmPriceRule } from '../../../api/model/aycmPriceRule';

/**
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — pure, SSOT time-band logic for AYCM
 * price rules. The Check-In screen imports `matchPriceRule` / `displayLabel` from here; it never
 * re-implements them. Everything is client-side (no server round-trip): a rule is a half-open
 * [startTime, endTime) window on the flagged weekdays, "24:00" allowed on the end only, no midnight
 * crossing. Live rules of one partner that share a weekday must not overlap.
 */

const HHMM = /^(\d{2}):(\d{2})$/;

/** Minutes since midnight for an "HH:mm" string. "24:00" → 1440 (end-of-day sentinel). NaN if malformed. */
export function minutesOfDay(hhmm: string): number {
  const match = HHMM.exec(hhmm);
  if (!match) {
    return NaN;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes !== 0)) {
    return NaN;
  }
  return hours * 60 + minutes;
}

/** documentation/…/AYCM elfogadóhely hozzáadása.md "Megjelenő sávnév": label if non-blank, else "start–end". */
export function displayLabel(rule: Pick<AycmPriceRule, 'label' | 'startTime' | 'endTime'>): string {
  const label = (rule.label ?? '').trim();
  return label.length > 0 ? label : `${rule.startTime}–${rule.endTime}`;
}

const DAY_KEYS = [
  'appliesMon',
  'appliesTue',
  'appliesWed',
  'appliesThu',
  'appliesFri',
  'appliesSat',
  'appliesSun',
] as const satisfies readonly (keyof AycmPriceRule)[];

/** Mon=0 … Sun=6 index for a `YYYY-MM-DD` calendar day (interpreted in the client TZ, matching `new Date`). */
export function weekdayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const jsDay = new Date(y, (m ?? 1) - 1, d ?? 1).getDay(); // 0=Sun … 6=Sat
  return (jsDay + 6) % 7; // 0=Mon … 6=Sun
}

function appliesOnWeekday(rule: AycmPriceRule, dayIndex: number): boolean {
  return rule[DAY_KEYS[dayIndex]] === true;
}

/** Do two rules share at least one weekday AND have intersecting [start, end) intervals? Adjacent (end === start) is OK. */
export function rulesOverlap(
  a: Pick<AycmPriceRule, (typeof DAY_KEYS)[number] | 'startTime' | 'endTime'>,
  b: Pick<AycmPriceRule, (typeof DAY_KEYS)[number] | 'startTime' | 'endTime'>,
): boolean {
  const sharesDay = DAY_KEYS.some((key) => a[key] === true && b[key] === true);
  if (!sharesDay) {
    return false;
  }
  const aStart = minutesOfDay(a.startTime);
  const aEnd = minutesOfDay(a.endTime);
  const bStart = minutesOfDay(b.startTime);
  const bEnd = minutesOfDay(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * documentation/…/AYCM elfogadóhely hozzáadása.md "Illesztés SSOT" — the at-most-one live rule that
 * covers `checkInTime` on the weekday of `checkInDate`. Returns `null` for 0 rules / a gap / the
 * wrong day (the Check-In then snapshots visitValueHuf = 0 with a yellow warning, and still saves).
 * `rules` may include deleted rows — they are filtered here.
 */
export function matchPriceRule(rules: AycmPriceRule[], checkInDate: string, checkInTime: string): AycmPriceRule | null {
  const dayIndex = weekdayIndex(checkInDate);
  const minutes = minutesOfDay(checkInTime);
  if (Number.isNaN(minutes)) {
    return null;
  }
  return (
    rules.find((rule) => {
      if (rule.deleted || !appliesOnWeekday(rule, dayIndex)) {
        return false;
      }
      const start = minutesOfDay(rule.startTime);
      const end = minutesOfDay(rule.endTime);
      return start <= minutes && minutes < end;
    }) ?? null
  );
}

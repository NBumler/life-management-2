/**
 * documentation/Subfeatures/AYCM Statisztikák.md — the read-only stats computed from live AycmCheckIn
 * snapshots. Pure TS, no Angular. Preset + custom + all-time windows, a per-window summary, a
 * per-partner breakdown, a monthly chart and a visit list. `visitValueHuf` drives "megéri-e";
 * `coPaymentHuf` is only ever summed into its own card and never enters the worth-it math.
 */
import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
import { AycmPartner } from '../../../api/model/aycmPartner';

export type StatsWindow =
  | 'THIS_MONTH'
  | 'PREV_MONTH'
  | 'LAST_3_MONTHS'
  | 'THIS_YEAR'
  | 'ALL_TIME'
  | 'CUSTOM';

export interface WindowRange {
  /** Inclusive `YYYY-MM-DD`. */
  from: string;
  /** Inclusive `YYYY-MM-DD`. */
  to: string;
  /** Whole calendar months the window spans — the multiplier for the monthly pass cost. */
  monthCount: number;
}

export interface StatsSummary {
  visitCount: number;
  visitValueSumHuf: number;
  /** Σ `coPaymentHuf` — shown on its own card, never folded into "megéri-e". */
  coPaymentSumHuf: number;
}

export interface PartnerBreakdownRow {
  partnerId: string;
  displayName: string;
  visitCount: number;
  visitValueSumHuf: number;
}

export interface VisitListRow {
  id: string;
  checkInDate: string;
  checkInTime: string;
  displayName: string;
  visitValueHuf: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function firstDayIso(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function lastDayIso(year: number, month: number): string {
  // new Date(year, month, 0) is the last day of 1-based `month` (month index `month` is the next month).
  return `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
}

/**
 * documentation/Subfeatures/AYCM Statisztikák.md "Ablakok" table. `todayIso` is the client calendar
 * day (`YYYY-MM-DD`). Every window snaps to whole calendar months.
 */
export function windowRange(window: StatsWindow, todayIso: string): WindowRange {
  const [year, month] = todayIso.split('-').map(Number);
  if (window === 'PREV_MONTH') {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    return { from: firstDayIso(prevYear, prevMonth), to: lastDayIso(prevYear, prevMonth), monthCount: 1 };
  }
  if (window === 'LAST_3_MONTHS') {
    const zeroBased = year * 12 + (month - 1) - 2;
    const startYear = Math.floor(zeroBased / 12);
    const startMonth = (zeroBased % 12) + 1;
    return { from: firstDayIso(startYear, startMonth), to: lastDayIso(year, month), monthCount: 3 };
  }
  if (window === 'THIS_YEAR') {
    // The whole current calendar year. `monthCount` is 12 like every other window's whole-month
    // count (LAST_3_MONTHS counts the running partial month as full too), so "megéri-e" measures
    // the visits against a full year's pass — not the months elapsed so far.
    return { from: firstDayIso(year, 1), to: lastDayIso(year, 12), monthCount: 12 };
  }
  // THIS_MONTH
  return { from: firstDayIso(year, month), to: lastDayIso(year, month), monthCount: 1 };
}

/**
 * Distinct calendar months an inclusive `[fromIso, toIso]` range touches — the pass-cost multiplier
 * for the CUSTOM / ALL_TIME windows. Partial months at either end count as whole, exactly like the
 * presets (`LAST_3_MONTHS` counts the running partial month as one). `from > to` → 0.
 */
export function monthsSpanned(fromIso: string, toIso: string): number {
  const [fromYear, fromMonth] = fromIso.split('-').map(Number);
  const [toYear, toMonth] = toIso.split('-').map(Number);
  return Math.max(0, toYear * 12 + toMonth - (fromYear * 12 + fromMonth) + 1);
}

/**
 * documentation/Subfeatures/AYCM Statisztikák.md "Egyéni tartomány". Any two client calendar days,
 * inclusive; the endpoints are swapped if given reversed so the range is always valid. `monthCount`
 * is the whole calendar months the (normalised) range spans.
 */
export function customRange(fromIso: string, toIso: string): WindowRange {
  const [from, to] = fromIso <= toIso ? [fromIso, toIso] : [toIso, fromIso];
  return { from, to, monthCount: monthsSpanned(from, to) };
}

/**
 * documentation/Subfeatures/AYCM Statisztikák.md "Összes idő". From the earliest live Check-In to
 * the later of today / the latest Check-In (future rows stay in, like every other window).
 * `monthCount` = whole calendar months since the first Check-In, so "megéri-e" measures the whole
 * history against every pass month paid since. No Check-In → a single-day, single-month range.
 */
export function allTimeRange(checkIns: readonly AycmCheckIn[], todayIso: string): WindowRange {
  const dates = checkIns.filter((c) => !c.deleted).map((c) => c.checkInDate);
  if (dates.length === 0) {
    return { from: todayIso, to: todayIso, monthCount: 1 };
  }
  const from = dates.reduce((min, d) => (d < min ? d : min));
  const latest = dates.reduce((max, d) => (d > max ? d : max));
  const to = latest > todayIso ? latest : todayIso;
  return { from, to, monthCount: monthsSpanned(from, to) };
}

/**
 * Live rows whose `checkInDate` is in the inclusive [from, to] window (lexical compare is correct for
 * `YYYY-MM-DD`). Future dates inside the window are kept (the hub does not clip them either).
 */
export function filterCheckIns(
  checkIns: readonly AycmCheckIn[],
  from: string,
  to: string,
): AycmCheckIn[] {
  return checkIns.filter((c) => !c.deleted && c.checkInDate >= from && c.checkInDate <= to);
}

/**
 * documentation/Subfeatures/AYCM Statisztikák.md "Összegző számok": count (0 OK) + Σ visitValueHuf
 * (0 OK, never `~`) + Σ coPaymentHuf (its own card, never in "megéri-e").
 */
export function summarize(checkIns: readonly AycmCheckIn[]): StatsSummary {
  return {
    visitCount: checkIns.length,
    visitValueSumHuf: checkIns.reduce((sum, c) => sum + c.visitValueHuf, 0),
    coPaymentSumHuf: checkIns.reduce((sum, c) => sum + c.coPaymentHuf, 0),
  };
}

/**
 * Display name per `partnerId`: a still-live partner shows its current name; otherwise the
 * lexicographically-first snapshot `partnerName` seen for that partner in this window (deterministic,
 * stable tie-break — documentation/Subfeatures/AYCM Statisztikák.md "Helyszín bontás").
 */
function resolveNames(
  checkIns: readonly AycmCheckIn[],
  partners: readonly AycmPartner[],
): Map<string, string> {
  const liveById = new Map(partners.filter((p) => !p.deleted).map((p) => [p.id, p.name]));
  const names = new Map<string, string>();
  for (const c of checkIns) {
    const live = liveById.get(c.partnerId);
    if (live !== undefined) {
      names.set(c.partnerId, live);
      continue;
    }
    const current = names.get(c.partnerId);
    if (current === undefined || c.partnerName < current) {
      names.set(c.partnerId, c.partnerName);
    }
  }
  return names;
}

/**
 * Per-partner rows over an already-filtered set. Sort: visitValueSumHuf descending, then displayName.
 * Empty input → empty list (no CTA).
 */
export function groupByPartner(
  checkIns: readonly AycmCheckIn[],
  partners: readonly AycmPartner[],
): PartnerBreakdownRow[] {
  const names = resolveNames(checkIns, partners);
  const byId = new Map<string, PartnerBreakdownRow>();
  for (const c of checkIns) {
    const row = byId.get(c.partnerId) ?? {
      partnerId: c.partnerId,
      displayName: names.get(c.partnerId) ?? c.partnerName,
      visitCount: 0,
      visitValueSumHuf: 0,
    };
    row.visitCount += 1;
    row.visitValueSumHuf += c.visitValueHuf;
    byId.set(c.partnerId, row);
  }
  return [...byId.values()].sort(
    (a, b) => b.visitValueSumHuf - a.visitValueSumHuf || a.displayName.localeCompare(b.displayName),
  );
}

/**
 * The window's visits, `checkInDate` descending then `checkInTime` descending. Partner name follows
 * the same rule as the breakdown.
 */
export function visitList(
  checkIns: readonly AycmCheckIn[],
  partners: readonly AycmPartner[],
): VisitListRow[] {
  const names = resolveNames(checkIns, partners);
  return [...checkIns]
    .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate) || b.checkInTime.localeCompare(a.checkInTime))
    .map((c) => ({
      id: c.id,
      checkInDate: c.checkInDate,
      checkInTime: c.checkInTime,
      displayName: names.get(c.partnerId) ?? c.partnerName,
      visitValueHuf: c.visitValueHuf,
    }));
}

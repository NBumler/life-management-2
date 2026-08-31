/**
 * documentation/Subfeatures/AYCM Statisztikák.md — the read-only stats computed from live AycmCheckIn
 * snapshots. Pure TS, no Angular. Three preset windows, a per-window summary, a per-partner
 * breakdown and a visit list. `coPaymentHuf` never appears here; `visitValueHuf` is the only money.
 */
import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
import { AycmPartner } from '../../../api/model/aycmPartner';

export type StatsWindow = 'THIS_MONTH' | 'PREV_MONTH' | 'LAST_3_MONTHS';

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
  // THIS_MONTH
  return { from: firstDayIso(year, month), to: lastDayIso(year, month), monthCount: 1 };
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

/** documentation/Subfeatures/AYCM Statisztikák.md "Összegző számok": count (0 OK) + Σ visitValueHuf (0 OK, never `~`). */
export function summarize(checkIns: readonly AycmCheckIn[]): StatsSummary {
  return {
    visitCount: checkIns.length,
    visitValueSumHuf: checkIns.reduce((sum, c) => sum + c.visitValueHuf, 0),
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

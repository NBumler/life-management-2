/**
 * documentation/Features/Mászónapló.md "Statisztikák (2.0 scope)" — pure TS climbing statistics.
 * No DOM, no Angular. Four figures per dashboard context (Indoor/Outdoor × Boulder/Kötél):
 *
 *  - **Max fokozat** — the hardest *successful* attempt's `absoluteDifficultyIndex`, all-time.
 *  - **Összes volumen** — Σ `climbingVolume()` over the context's sessions, all-time (the same
 *    per-attempt `mászott méter × I` / `4 m × I` model as the log form's live preview).
 *  - **Sikerarány** — every logged attempt row bucketed into Onsight / Flash / Redpoint / Sikertelen
 *    (a send with no `ascentStyle` recorded counts as a redpoint), all-time.
 *  - **Grade-piramis** — successful sends within the last 30 / 90 / 365 calendar days, bucketed by
 *    matrix index, hardest first. This is the only figure the period selector scopes.
 *
 * Grades are shown with the label the user actually typed (`userRawInput`); the representative label
 * for an index bucket is its most frequent raw input, falling back to `#<index>` when none was kept.
 */
import { ClimbingSession } from '../../../api/model/climbingSession';

import { CLIMBING_CONTEXTS, ClimbingContextKey } from './climbing-contexts';
import { ClimbingAttemptInput, climbingVolume } from './climbing-metrics';

/** The three windows offered by the stats screen's period selector, in render order. */
export const CLIMBING_STATS_PERIODS = [30, 90, 365] as const;
export type ClimbingStatsPeriodDays = (typeof CLIMBING_STATS_PERIODS)[number];

export interface GradePyramidRow {
  /** `absoluteDifficultyIndex` bucket. */
  readonly index: number;
  /** Representative raw label for the bucket (most frequent `userRawInput`, else `#<index>`). */
  readonly label: string;
  /** Successful sends in the bucket within the selected period. */
  readonly sends: number;
}

export interface ClimbingOutcomeBreakdown {
  readonly onsight: number;
  readonly flash: number;
  /** REDPOINT, plus successful attempts with no `ascentStyle` recorded. */
  readonly redpoint: number;
  readonly failed: number;
  /** Every logged (non-deleted) attempt row — `onsight + flash + redpoint + failed`. */
  readonly total: number;
}

export interface ClimbingContextStats {
  readonly key: ClimbingContextKey;
  readonly locationType: ClimbingSession.LocationTypeEnum;
  readonly discipline: ClimbingSession.DisciplineEnum;
  readonly sessionCount: number;
  readonly attemptCount: number;
  /** `null` when the context has no successful attempt with a resolved grade. */
  readonly maxGradeLabel: string | null;
  readonly maxGradeIndex: number | null;
  readonly totalVolume: number;
  readonly outcomes: ClimbingOutcomeBreakdown;
  /** Period-scoped, hardest index first; empty when nothing was sent in the window. */
  readonly pyramid: readonly GradePyramidRow[];
}

export interface ClimbingStats {
  readonly periodDays: ClimbingStatsPeriodDays;
  /** Always all four contexts, in `CLIMBING_CONTEXTS` order. */
  readonly contexts: readonly ClimbingContextStats[];
  /** Σ `totalVolume` over the four contexts (all-time). */
  readonly totalVolume: number;
}

/** `YYYY-MM-DD` minus `days` calendar days, on the local calendar (DST-safe via noon). */
function daysBefore(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day - days, 12, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A session's live attempts as `climbing-metrics` inputs (pitch lengths win when a pitch list exists). */
function attemptInputs(session: ClimbingSession): ClimbingAttemptInput[] {
  return session.attempts
    .filter((attempt) => !attempt.deleted)
    .map((attempt) => {
      const pitches = attempt.pitches.filter((pitch) => !pitch.deleted);
      return {
        isSuccess: attempt.isSuccess,
        absoluteDifficultyIndex: attempt.absoluteDifficultyIndex ?? null,
        safetyStyle: attempt.safetyStyle ?? null,
        lengthInMeters: attempt.lengthInMeters ?? null,
        pitches:
          pitches.length > 0
            ? pitches.map((pitch) => ({ isLead: pitch.isLead, lengthInMeters: pitch.lengthInMeters ?? null }))
            : null,
      };
    });
}

function representativeLabel(freq: Map<string, number> | undefined, index: number): string {
  if (freq && freq.size > 0) {
    let best = '';
    let bestCount = -1;
    for (const [label, count] of freq) {
      if (count > bestCount) {
        best = label;
        bestCount = count;
      }
    }
    return best;
  }
  return `#${index}`;
}

/**
 * documentation/Features/Mászónapló.md "Statisztikák (2.0 scope)". `todayStr` is the client calendar
 * day (`shared/local-date` `today()`); the pyramid window is the `periodDays` calendar days ending on
 * it, inclusive. Soft-deleted sessions, attempts and pitches are ignored.
 */
export function computeClimbingStats(
  sessions: readonly ClimbingSession[],
  periodDays: ClimbingStatsPeriodDays,
  todayStr: string,
): ClimbingStats {
  const since = daysBefore(todayStr, periodDays - 1);
  const live = sessions.filter((session) => !session.deleted);
  let grandVolume = 0;

  const contexts = CLIMBING_CONTEXTS.map<ClimbingContextStats>((ctx) => {
    const ctxSessions = live.filter(
      (session) => session.locationType === ctx.locationType && session.discipline === ctx.discipline,
    );

    let totalVolume = 0;
    let attemptCount = 0;
    let maxGradeIndex: number | null = null;
    const outcomes = { onsight: 0, flash: 0, redpoint: 0, failed: 0, total: 0 };
    const labelFreq = new Map<number, Map<string, number>>();
    const pyramidCount = new Map<number, number>();

    for (const session of ctxSessions) {
      totalVolume += climbingVolume({ discipline: ctx.discipline, attempts: attemptInputs(session) });
      const inPeriod = session.date >= since && session.date <= todayStr;

      for (const attempt of session.attempts) {
        if (attempt.deleted) {
          continue;
        }
        attemptCount++;
        outcomes.total++;
        if (!attempt.isSuccess) {
          outcomes.failed++;
        } else if (attempt.ascentStyle === 'ONSIGHT') {
          outcomes.onsight++;
        } else if (attempt.ascentStyle === 'FLASH') {
          outcomes.flash++;
        } else {
          outcomes.redpoint++;
        }

        const index = attempt.absoluteDifficultyIndex ?? null;
        if (attempt.isSuccess && index != null && index > 0) {
          if (maxGradeIndex == null || index > maxGradeIndex) {
            maxGradeIndex = index;
          }
          const rawLabel = (attempt.userRawInput ?? '').trim();
          if (rawLabel) {
            const perIndex = labelFreq.get(index) ?? new Map<string, number>();
            perIndex.set(rawLabel, (perIndex.get(rawLabel) ?? 0) + 1);
            labelFreq.set(index, perIndex);
          }
          if (inPeriod) {
            pyramidCount.set(index, (pyramidCount.get(index) ?? 0) + 1);
          }
        }
      }
    }

    grandVolume += totalVolume;

    const pyramid = [...pyramidCount.entries()]
      .map<GradePyramidRow>(([index, sends]) => ({ index, sends, label: representativeLabel(labelFreq.get(index), index) }))
      .sort((a, b) => b.index - a.index);

    return {
      key: ctx.key,
      locationType: ctx.locationType as ClimbingSession.LocationTypeEnum,
      discipline: ctx.discipline as ClimbingSession.DisciplineEnum,
      sessionCount: ctxSessions.length,
      attemptCount,
      maxGradeLabel: maxGradeIndex == null ? null : representativeLabel(labelFreq.get(maxGradeIndex), maxGradeIndex),
      maxGradeIndex,
      totalVolume,
      outcomes,
      pyramid,
    };
  });

  return { periodDays, contexts, totalVolume: grandVolume };
}

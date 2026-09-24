/**
 * backlog/125 — a workout-template target given as a single value ("10") or a range ("8-12").
 * Field-agnostic on purpose: reps is the first user (`reps` + `repsMax`), but the same `<field>` +
 * `<field>Max` pair can later carry a weight / hold-time / distance / rest range without touching the
 * parse or display logic — only a new column + the wiring.
 */
export interface TargetRange {
  /** The single target, or the lower bound of a range; null = empty input. */
  lower: number | null;
  /** The upper bound; null = not a range. */
  upper: number | null;
}

export type TargetRangeParseResult = { ok: true; value: TargetRange } | { ok: false; error: 'INVALID' | 'INVERTED' };

export interface TargetRangeOptions {
  /** Accept decimals ("62.5", "62,5") — off for reps. */
  allowDecimal?: boolean;
}

const RANGE_SEPARATOR = /\s*[-–—]\s*/;

/**
 * Parses "N" or "N-M" (spaces tolerated, en/em dash accepted). An empty input is a valid "no target".
 * "N-N" collapses to a single value; "M-N" with M > N is INVERTED; anything else unparseable is INVALID.
 */
export function parseTargetRange(input: string | null | undefined, options: TargetRangeOptions = {}): TargetRangeParseResult {
  const text = (input ?? '').trim();
  if (text === '') {
    return { ok: true, value: { lower: null, upper: null } };
  }
  const parts = text.split(RANGE_SEPARATOR);
  if (parts.length > 2) {
    return { ok: false, error: 'INVALID' };
  }
  const numbers = parts.map((part) => parseBound(part, options.allowDecimal ?? false));
  if (numbers.some((n) => n === null)) {
    return { ok: false, error: 'INVALID' };
  }
  const [lower, upper] = numbers as number[];
  if (upper === undefined || upper === lower) {
    return { ok: true, value: { lower, upper: null } };
  }
  if (upper < lower) {
    return { ok: false, error: 'INVERTED' };
  }
  return { ok: true, value: { lower, upper } };
}

function parseBound(part: string, allowDecimal: boolean): number | null {
  const pattern = allowDecimal ? /^\d+(?:[.,]\d+)?$/ : /^\d+$/;
  if (!pattern.test(part)) {
    return null;
  }
  return Number(part.replace(',', '.'));
}

/** "8–12" for a range, "10" for a single value, "" when empty (en dash for display). */
export function formatTargetRange(lower: number | null | undefined, upper: number | null | undefined): string {
  if (lower == null) {
    return '';
  }
  return upper == null ? `${lower}` : `${lower}–${upper}`;
}

/** The value a session set starts from: the single target, or the range midpoint rounded up (8–11 → 10). */
export function targetRangePrefill(lower: number | null | undefined, upper: number | null | undefined): number | null {
  if (lower == null) {
    return null;
  }
  return upper == null ? lower : Math.ceil((lower + upper) / 2);
}

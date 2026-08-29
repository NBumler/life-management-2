/**
 * documentation/Subfeatures/Nehézségi szint skálája.md — pure TS grade parser: scale detection,
 * pre-parsing (case rules + trim), the four-state validity machine (EMPTY / VALID / AMBIGUOUS /
 * UNKNOWN) and the `absoluteDifficultyIndex` lookup via `climbing-grade-matrix.ts`. No DOM, no
 * Angular — the shared grade-input component (Nehézségi szint skálája.md "Architektúra / Frontend")
 * wraps this with a 250 ms debounce and the chip UI.
 */
import {
  BOULDER_SCALES,
  ClimbingScale,
  ROPE_SCALES,
  gradeToIndex,
} from './climbing-grade-matrix';

export type ClimbingDiscipline = 'BOULDER' | 'ROPE';

/**
 * - `EMPTY` — blank input, no postfix, not submittable.
 * - `VALID` — exactly one scale recognised (or a bare `4` / `5` that defaults per discipline);
 *   `scale` + `absoluteDifficultyIndex` are set.
 * - `AMBIGUOUS` — a bare number `>= 6` (French / Font both need the letter from 6 up) or a bare
 *   number with several readings and no safe default; `candidates` lists the options, not submittable
 *   until one is picked.
 * - `UNKNOWN` — non-empty but matched nothing; show the help modal.
 */
export type GradeParseStatus = 'EMPTY' | 'VALID' | 'AMBIGUOUS' | 'UNKNOWN';

export interface GradeCandidate {
  readonly scale: ClimbingScale;
  /** Normalised label to persist as the attempt's `rawGrade`. */
  readonly label: string;
  readonly absoluteDifficultyIndex: number | null;
}

export interface GradeParseResult {
  readonly status: GradeParseStatus;
  readonly normalized: string;
  /** Set only when `status === 'VALID'`. */
  readonly scale: ClimbingScale | null;
  /** Set only when `status === 'VALID'` and the label is in the matrix. */
  readonly absoluteDifficultyIndex: number | null;
  /**
   * Refinement options. `> 1` entry for `AMBIGUOUS`; for a bare `4` / `5` `VALID` result the
   * alternatives are listed here too (the picked default is also `candidates[0]`).
   */
  readonly candidates: readonly GradeCandidate[];
}

const SCALE_POSTFIX: Record<ClimbingScale, string> = {
  FRENCH: 'FRA',
  YDS: 'YDS',
  UIAA: 'UIAA',
  FONT: 'FONT',
  V_SCALE: 'V',
};

/** Short postfix badge shown at the end of the input for a recognised scale. */
export function scalePostfix(scale: ClimbingScale): string {
  return SCALE_POSTFIX[scale];
}

const SCALE_PATTERNS: Record<ClimbingScale, RegExp> = {
  // Nehézségi szint skálája.md "Regex (kontextus + string)"
  V_SCALE: /^V\d+$/,
  FONT: /^\d[A-C]\+?$/,
  YDS: /^5\.\d+[a-d]?$/,
  FRENCH: /^\d[a-c]\+?$/,
  UIAA: /^[IVXLCDM]+[-+]?$/,
};

const BARE_NUMBER = /^\d+$/;
const ROMAN_1_TO_12 = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/**
 * Nehézségi szint skálája.md "Mobil pre-parsing": trim; Boulder → UPPER; Köteles → lower, but the
 * UIAA roman letters I/V/X are restored to upper (matrix.md never needs L/C/D/M, and upper-casing
 * `c` would corrupt French `5c`).
 */
export function normalizeGradeInput(raw: string, discipline: ClimbingDiscipline): string {
  const trimmed = (raw ?? '').trim();
  if (discipline === 'BOULDER') {
    return trimmed.toUpperCase();
  }
  return trimmed.toLowerCase().replace(/[ivx]/g, (c) => c.toUpperCase());
}

function scalesFor(discipline: ClimbingDiscipline): readonly ClimbingScale[] {
  return discipline === 'BOULDER' ? BOULDER_SCALES : ROPE_SCALES;
}

/** YDS `5.10` (no sub-letter) is an unambiguous YDS grade — resolve its index at the `a` step. */
function resolveIndex(scale: ClimbingScale, normalized: string): number | null {
  const direct = gradeToIndex(scale, normalized);
  if (direct !== null) {
    return direct;
  }
  if (scale === 'YDS' && /^5\.\d+$/.test(normalized)) {
    return gradeToIndex('YDS', `${normalized}a`);
  }
  return null;
}

function bareNumberCandidates(digit: number, discipline: ClimbingDiscipline): GradeCandidate[] {
  const candidates: GradeCandidate[] = [];
  if (discipline === 'ROPE') {
    // French — the default reading; bare 3/4/5 are real grades, 6+ gets an `a` completion hint.
    const frenchLabel = digit <= 5 ? String(digit) : `${digit}a`;
    candidates.push({
      scale: 'FRENCH',
      label: frenchLabel,
      absoluteDifficultyIndex: gradeToIndex('FRENCH', frenchLabel),
    });
    const roman = ROMAN_1_TO_12[digit - 1];
    if (roman !== undefined) {
      candidates.push({ scale: 'UIAA', label: roman, absoluteDifficultyIndex: gradeToIndex('UIAA', roman) });
    }
    return candidates;
  }
  // BOULDER — Font is the default; bare 3/4/5 are real, 6+ gets an `A` completion hint. V-Scale
  // needs the explicit `V` prefix, so a bare digit yields no V candidate.
  const fontLabel = digit <= 5 ? String(digit) : `${digit}A`;
  candidates.push({
    scale: 'FONT',
    label: fontLabel,
    absoluteDifficultyIndex: gradeToIndex('FONT', fontLabel),
  });
  return candidates;
}

/**
 * Parse a raw grade string in a dashboard discipline context. Never throws; an unparseable string is
 * `UNKNOWN`, not an error.
 */
export function parseGrade(raw: string, discipline: ClimbingDiscipline): GradeParseResult {
  const normalized = normalizeGradeInput(raw, discipline);
  if (normalized === '') {
    return { status: 'EMPTY', normalized, scale: null, absoluteDifficultyIndex: null, candidates: [] };
  }

  const matched = scalesFor(discipline).filter((scale) => SCALE_PATTERNS[scale].test(normalized));

  if (matched.length === 1) {
    const scale = matched[0];
    return {
      status: 'VALID',
      normalized,
      scale,
      absoluteDifficultyIndex: resolveIndex(scale, normalized),
      candidates: [{ scale, label: normalized, absoluteDifficultyIndex: resolveIndex(scale, normalized) }],
    };
  }

  if (matched.length > 1) {
    const candidates = matched.map((scale) => ({
      scale,
      label: normalized,
      absoluteDifficultyIndex: resolveIndex(scale, normalized),
    }));
    return { status: 'AMBIGUOUS', normalized, scale: null, absoluteDifficultyIndex: null, candidates };
  }

  if (BARE_NUMBER.test(normalized)) {
    const digit = Number(normalized);
    const candidates = bareNumberCandidates(digit, discipline);
    // 4 / 5 are valid as bare grades (French / Font accept the letterless form on these steps);
    // 6 and up are incomplete until a chip is chosen.
    if (digit >= 3 && digit <= 5 && candidates.length > 0 && candidates[0].absoluteDifficultyIndex !== null) {
      return {
        status: 'VALID',
        normalized,
        scale: candidates[0].scale,
        absoluteDifficultyIndex: candidates[0].absoluteDifficultyIndex,
        candidates,
      };
    }
    return { status: 'AMBIGUOUS', normalized, scale: null, absoluteDifficultyIndex: null, candidates };
  }

  return { status: 'UNKNOWN', normalized, scale: null, absoluteDifficultyIndex: null, candidates: [] };
}

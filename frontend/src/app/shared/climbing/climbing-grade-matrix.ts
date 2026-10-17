/**
 * documentation/Subfeatures/Nehézségi szint skálája (konverziós mátrix).md — the SSOT mapping from
 * every recognised grade label (per scale) to the unified internal `absoluteDifficultyIndex`
 * (`I_grade`), used for volume and statistics. No DOM, no Angular — pure data + lookup.
 *
 * Build rules honoured from the spec:
 *  - The anchor rows (matrix.md "Referencia-anchor tábla") are fixed reference points; the French,
 *    UIAA, YDS and V-Scale cells of every anchor row are reproduced here verbatim.
 *  - The Font (boulder) column of the anchor table is acknowledged-inconsistent by the spec
 *    ("±1 alfokozat", repeated `4` / `6A`, non-monotonic `5`). Its self-consistent tail (`6B`=18 …
 *    `8B`=40) is reproduced verbatim; the broken low cells are rationalised against the V-Scale
 *    anchors (backlog/155: `3`=5, `4`=8, `4C+`=10≈V0, `5`=12≈V1, `5C`=14≈V2, `6A`=16≈V3).
 *  - Indices never decrease along a scale's table order. From `6a` / `6A` up (and on every
 *    other scale) each label has its own integer; in the French / Font 3–5 band the optional
 *    sub-letters (backlog/155) outnumber the free integers, so neighbouring steps may share one.
 *    Steps are deliberately non-uniform (grade difficulty is not linear).
 *
 * Kept as a client-only TS constant on purpose (not `shared/fixtures/*.json`): the M2a/M2a-o/M2b
 * backend deliberately never computes a grade index — `RouteService` stores `guidebookGrade`
 * verbatim and `AscentAttempt.absoluteDifficultyIndex` is client-supplied — so there is no Java
 * consumer to keep in parity, and a shared fixture would be an empty ceremony. If server-side
 * grade-index / kcal parity is ever added (Mászónapló.md Backend "opcionális"), promote this table
 * to `shared/fixtures/climbing-grade-matrix.json` and read it from both sides. Until then the client
 * is the only consumer, like `swim-metrics.ts` / `bike-metrics.ts`.
 */

export type ClimbingScale = 'FRENCH' | 'YDS' | 'UIAA' | 'FONT' | 'V_SCALE';

/** Scales offered in each dashboard discipline context (Nehézségi szint skálája.md "Regex"). */
export const ROPE_SCALES: readonly ClimbingScale[] = ['FRENCH', 'YDS', 'UIAA'];
export const BOULDER_SCALES: readonly ClimbingScale[] = ['FONT', 'V_SCALE'];

/**
 * label → `absoluteDifficultyIndex`. Keys are the canonical normalised label form
 * (see `grade-scale.ts` `normalizeGradeInput`): rope lower-case (UIAA romans upper), boulder
 * upper-case.
 */
export const CLIMBING_GRADE_MATRIX: Readonly<Record<ClimbingScale, Readonly<Record<string, number>>>> = {
  // Rope — French sport
  FRENCH: {
    // backlog/155 — 3–5 take an optional sub-letter (6 up it is mandatory). The bare 3 / 4 / 5
    // keep their indices; the lettered steps share the few integers of the 1–13 band (non-unique).
    '3a': 1,
    '3a+': 1,
    '3': 2,
    '3b': 2,
    '3b+': 3,
    '3c': 3,
    '3c+': 4,
    '4a': 5,
    '4a+': 5,
    '4': 6,
    '4b': 6,
    '4b+': 7,
    '4c': 8,
    '4c+': 8,
    '5': 9,
    '5a': 10,
    '5a+': 10,
    '5b': 11,
    '5b+': 11,
    '5c': 12,
    '5c+': 13,
    '6a': 14,
    '6a+': 15,
    '6b': 16,
    '6b+': 17,
    '6c': 18,
    '6c+': 19,
    '7a': 20,
    '7a+': 22,
    '7b': 24,
    '7b+': 26,
    '7c': 28,
    '7c+': 30,
    '8a': 32,
    '8a+': 34,
    '8b': 36,
    '8b+': 38,
    '8c': 40,
    '8c+': 42,
    '9a': 44,
    '9a+': 46,
    '9b': 48,
    '9b+': 50,
    '9c': 52,
  },
  // Rope — Yosemite Decimal System
  YDS: {
    '5.4': 2,
    '5.5': 4,
    '5.6': 6,
    '5.7': 8,
    '5.8': 10,
    '5.9': 12,
    '5.10a': 14,
    '5.10b': 15,
    '5.10c': 16,
    '5.10d': 17,
    '5.11a': 18,
    '5.11b': 19,
    '5.11c': 20,
    '5.11d': 22,
    '5.12a': 23,
    '5.12b': 24,
    '5.12c': 26,
    '5.12d': 28,
    '5.13a': 30,
    '5.13b': 32,
    '5.13c': 34,
    '5.13d': 36,
    '5.14a': 38,
    '5.14b': 40,
    '5.14c': 42,
    '5.14d': 44,
    '5.15a': 46,
    '5.15b': 48,
    '5.15c': 50,
    '5.15d': 52,
  },
  // Rope — UIAA (roman numerals)
  UIAA: {
    II: 1,
    III: 2,
    'III+': 4,
    'IV-': 5,
    IV: 6,
    'IV+': 7,
    'V-': 9,
    V: 10,
    'V+': 11,
    'VI-': 12,
    VI: 14,
    'VI+': 15,
    'VII-': 16,
    VII: 18,
    'VII+': 19,
    'VIII-': 20,
    VIII: 22,
    'VIII+': 23,
    'IX-': 24,
    IX: 26,
    'IX+': 28,
    'X-': 30,
    X: 32,
    'X+': 34,
    'XI-': 36,
    XI: 38,
    'XI+': 40,
    'XII-': 42,
    XII: 44,
  },
  // Boulder — Fontainebleau
  FONT: {
    // backlog/155 — 3–5 take an optional sub-letter (6 up it is mandatory), aligned to the V-Scale
    // (4C+ ≈ V0 = 10, 5 ≈ V1 = 12, 5C ≈ V2 = 14); the lettered steps share the 4–15 band (non-unique).
    '3A': 4,
    '3A+': 4,
    '3': 5,
    '3B': 5,
    '3B+': 5,
    '3C': 6,
    '3C+': 7,
    '4A': 7,
    '4A+': 8,
    '4': 8,
    '4B': 8,
    '4B+': 9,
    '4C': 9,
    '4C+': 10,
    '5A': 11,
    '5A+': 11,
    '5': 12,
    '5B': 12,
    '5B+': 13,
    '5C': 14,
    '5C+': 15,
    '6A': 16,
    '6A+': 17,
    '6B': 18,
    '6B+': 19,
    '6C': 20,
    '6C+': 22,
    '7A': 24,
    '7A+': 26,
    '7B': 28,
    '7B+': 30,
    '7C': 32,
    '7C+': 34,
    '8A': 36,
    '8A+': 38,
    '8B': 40,
    '8B+': 42,
    '8C': 44,
    '8C+': 46,
    '9A': 48,
  },
  // Boulder — V-Scale (Hueco)
  V_SCALE: {
    // backlog/152 — `VB` ("V-Basic"), the Hueco grade below V0; one V-step (2) under it.
    VB: 8,
    V0: 10,
    V1: 12,
    V2: 14,
    V3: 16,
    V4: 18,
    V5: 20,
    V6: 22,
    V7: 24,
    V8: 26,
    V9: 28,
    V10: 30,
    V11: 32,
    V12: 34,
    V13: 36,
    V14: 38,
    V15: 40,
    V16: 42,
    V17: 44,
  },
};

/** `absoluteDifficultyIndex` for a normalised label on a scale, or `null` if unknown. */
export function gradeToIndex(scale: ClimbingScale, normalizedLabel: string): number | null {
  const index = CLIMBING_GRADE_MATRIX[scale][normalizedLabel];
  return index ?? null;
}

/**
 * documentation/Subfeatures/Nehézségi szint skálája (konverziós mátrix).md "Indoor szín-sáv
 * reprezentatív index": the attempt's index snapshot from a colour band is the floored midpoint of
 * the band's `[lowIndex, highIndex]` range — deterministic, binds client and server alike.
 */
export function colorBandMidIndex(lowIndex: number, highIndex: number): number {
  return Math.floor((lowIndex + highIndex) / 2);
}

/**
 * backlog/122 — the index an indoor-boulder attempt resolves to from its colour band and the tapped
 * part of it: MINUS → the band's lower bound, PLUS → its upper bound, NEUTRAL / not recorded → the
 * {@link colorBandMidIndex} (so an attempt logged without a modifier keeps its historical value).
 */
export function bandModifierIndex(
  band: { absoluteDifficultyIndexLower: number; absoluteDifficultyIndexUpper: number },
  modifier: 'MINUS' | 'NEUTRAL' | 'PLUS' | null | undefined,
): number {
  if (modifier === 'MINUS') {
    return band.absoluteDifficultyIndexLower;
  }
  if (modifier === 'PLUS') {
    return band.absoluteDifficultyIndexUpper;
  }
  return colorBandMidIndex(band.absoluteDifficultyIndexLower, band.absoluteDifficultyIndexUpper);
}

/** The rope scales the indoor-rope live quick-record grid offers (backlog/166). */
export type RopeQuickScale = 'FRENCH' | 'UIAA' | 'YDS';
export const ROPE_QUICK_SCALES: readonly RopeQuickScale[] = ['FRENCH', 'UIAA', 'YDS'];

/** The bare French `3` / `4` / `5` are aliases of a lettered step (backlog/155) — no grid button of their own. */
const BARE_FRENCH_ALIAS = /^[345]$/;

/** The main grade a label belongs to (one grid row): French `6`, UIAA `VI`, YDS `5.x` (≤ 5.9) or `5.11`. */
function quickRowKey(scale: RopeQuickScale, label: string): string {
  if (scale === 'FRENCH') {
    return label.charAt(0);
  }
  if (scale === 'UIAA') {
    return label.replace(/[+-]$/, '');
  }
  return /^5\.\d$/.test(label) ? '5.x' : label.replace(/[a-d]$/, '');
}

/**
 * backlog/166 — every matrix label of a rope scale, easiest first, split into one row per main grade
 * (`6a 6a+ 6b 6b+ 6c 6c+` · `VI- VI VI+` · `5.10a … 5.10d`). Sorted by index (stable, so equal indices
 * keep table order) because `Object.keys` lists integer-like keys first, not in table order.
 */
export function ropeQuickGradeRows(scale: RopeQuickScale): string[][] {
  const table = CLIMBING_GRADE_MATRIX[scale];
  const labels = Object.keys(table)
    .filter((label) => !(scale === 'FRENCH' && BARE_FRENCH_ALIAS.test(label)))
    .sort((a, b) => table[a] - table[b]);
  const rows: string[][] = [];
  let lastKey: string | null = null;
  for (const label of labels) {
    const key = quickRowKey(scale, label);
    if (key !== lastKey) {
      rows.push([]);
      lastKey = key;
    }
    rows[rows.length - 1].push(label);
  }
  return rows;
}

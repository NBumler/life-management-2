/**
 * documentation/Architektúra/Mennyiség mező.md — shared `quantity`/`duration` value parsing,
 * formatting, and canonical-unit equality comparison (used by the Food field-set duplicate check,
 * documentation/Architektúra/Névegyediség.md).
 *
 * The multiplier tables mirror shared/fixtures/quantity-conversion.json exactly — that fixture is
 * the parity SSOT with the backend's hu.bumler.lm2.common.QuantityConverter; quantity.spec.ts
 * asserts this file's tables match it structurally.
 */

export type QuantityMode = 'quantity' | 'duration';
export type QuantityUnit = 'cs' | 'db' | 'g' | 'dkg' | 'kg' | 'l' | 'dl' | 'cl' | 'ml';
export type DurationUnit = 'perc' | 'óra' | 'nap' | 'hét' | 'hó' | 'év';
export type QuantityFamily = 'weight' | 'volume' | 'piece' | 'time';

export interface ParsedQuantity<U extends string = QuantityUnit | DurationUnit> {
  amount: number | null;
  unit: U | null;
}

export class QuantityParseError extends Error {}

const QUANTITY_UNITS: readonly QuantityUnit[] = ['cs', 'db', 'g', 'dkg', 'kg', 'l', 'dl', 'cl', 'ml'];

/**
 * documentation/Architektúra/Mennyiség mező.md "Támogatott egységek — quantity": alias → canonical
 * unit, case-insensitive. The piece family carries `csomag` → `cs` and `darab` → `db`.
 *
 * `db` is a **contextual** unit: it only fully resolves against a specific `Food` (its darab-
 * definíció), the same way `cs` resolves against the net content. With no darab-definíció `1 db =
 * 1 cs` — which is exactly the piece multiplier below, so a `db` amount with no Food context still
 * canonicalizes (as packages). See `pages/food/food-quantity.ts` for the Food-aware resolution.
 */
const QUANTITY_ALIASES: Record<string, QuantityUnit> = {
  csomag: 'cs',
  darab: 'db',
};

/** documentation/Architektúra/Mennyiség mező.md "Támogatott egységek — duration": alias → canonical unit, case-insensitive. */
const DURATION_ALIASES: Record<string, DurationUnit> = {
  perc: 'perc',
  p: 'perc',
  min: 'perc',
  óra: 'óra',
  ora: 'óra',
  h: 'óra',
  nap: 'nap',
  n: 'nap',
  d: 'nap',
  hét: 'hét',
  het: 'hét',
  w: 'hét',
  hó: 'hó',
  ho: 'hó',
  honap: 'hó',
  hónap: 'hó',
  m: 'hó',
  év: 'év',
  ev: 'év',
  y: 'év',
};

export const QUANTITY_WEIGHT_MULTIPLIERS: Record<string, number> = { g: 1, dkg: 10, kg: 1000 };
export const QUANTITY_VOLUME_MULTIPLIERS: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000 };
export const QUANTITY_PIECE_MULTIPLIERS: Record<string, number> = { cs: 1, db: 1 };
export const DURATION_MULTIPLIERS: Record<string, number> = { perc: 1, óra: 60, nap: 1440, hét: 10080, hó: 43200, év: 525600 };

/**
 * documentation/Architektúra/Mennyiség mező.md "Tört bevitel" / "Kanonikus egyenlőség" — a fraction
 * input (`1/6 csomag`) is stored as a decimal rounded to this many places, and equality comparisons
 * work on the canonical amount scaled to an integer at this scale, so float noise from `1/6` etc.
 * (`6 × 0.1667 ≠ 1` exactly) never produces a false "not equal". Mirrors
 * `shared/fixtures/quantity-conversion.json` → `equalityDecimalScale` and
 * `QuantityConverter.EQUALITY_DECIMAL_SCALE`.
 */
export const EQUALITY_DECIMAL_SCALE = 4;

const SCALE_FACTOR = 10 ** EQUALITY_DECIMAL_SCALE;

/**
 * Number part: a non-negative decimal (`120`, `1.5`, `0,4`) or a simple fraction (`1/6`, `5/2`) — no
 * mixed fractions (`1 1/2`), and no leading `-`: a negative quantity or duration is meaningless, so
 * both forms reject it uniformly rather than the decimal accepting `-1cs` while the fraction rejects
 * `-1/2cs` (GIGA-REVIEW C-8).
 */
const INPUT_PATTERN = /^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-Zóőúűáéíöü]+)$/;

/**
 * Round half away from zero, matching Java's `RoundingMode.HALF_UP` (QuantityConverter). Canonical
 * amounts are always ≥ 0 (the input pattern rejects `-`), so this only differs from a plain
 * `Math.round` — which rounds half toward +∞ — on a hypothetical negative half; keeping the rule
 * identical on both sides guards the parity if that ever changes (GIGA-REVIEW C-6).
 */
function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function roundToScale(value: number): number {
  return roundHalfAwayFromZero(value * SCALE_FACTOR) / SCALE_FACTOR;
}

/** Canonical amounts are equal iff they match once scaled to `EQUALITY_DECIMAL_SCALE` places (integer compare). */
function scaledEqual(a: number, b: number): boolean {
  return roundHalfAwayFromZero(a * SCALE_FACTOR) === roundHalfAwayFromZero(b * SCALE_FACTOR);
}

/**
 * documentation/Architektúra/Mennyiség mező.md "Parser kimenet": empty input is a valid "no value"
 * (amount/unit both null). Throws {@link QuantityParseError} for anything unparseable, including a
 * unit outside the given mode's set.
 */
export function parseQuantityInput(input: string, mode: QuantityMode): ParsedQuantity {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { amount: null, unit: null };
  }
  const match = INPUT_PATTERN.exec(trimmed);
  if (!match) {
    throw new QuantityParseError(`Cannot parse "${input}" as ${mode}`);
  }
  const rawNumber = match[1];
  let amount: number;
  if (rawNumber.includes('/')) {
    const [numerator, denominator] = rawNumber.split('/').map(Number);
    if (denominator === 0) {
      throw new QuantityParseError(`Zero denominator in "${input}"`);
    }
    amount = roundToScale(numerator / denominator);
  } else {
    amount = Number(rawNumber.replace(',', '.'));
  }
  if (!Number.isFinite(amount)) {
    throw new QuantityParseError(`Invalid number in "${input}"`);
  }
  const rawUnit = match[2].toLowerCase();
  const unit = mode === 'quantity' ? resolveQuantityUnit(rawUnit) : resolveDurationUnit(rawUnit);
  if (!unit) {
    throw new QuantityParseError(`Unknown ${mode} unit "${match[2]}"`);
  }
  return { amount, unit };
}

/** documentation/Architektúra/Mennyiség mező.md "Parser kimenet": no space in the canonical display form. */
export function formatQuantityValue(value: ParsedQuantity): string {
  if (value.amount === null || value.unit === null) {
    return '';
  }
  return `${value.amount}${value.unit}`;
}

function resolveQuantityUnit(rawUnit: string): QuantityUnit | null {
  if ((QUANTITY_UNITS as readonly string[]).includes(rawUnit)) {
    return rawUnit as QuantityUnit;
  }
  return QUANTITY_ALIASES[rawUnit] ?? null;
}

function resolveDurationUnit(rawUnit: string): DurationUnit | null {
  return DURATION_ALIASES[rawUnit] ?? null;
}

export function quantityFamily(unit: QuantityUnit): QuantityFamily {
  if (unit === 'cs' || unit === 'db') {
    return 'piece';
  }
  if (unit in QUANTITY_WEIGHT_MULTIPLIERS) {
    return 'weight';
  }
  return 'volume';
}

export function canonicalQuantityAmount(amount: number, unit: QuantityUnit): number {
  const family = quantityFamily(unit);
  const multipliers = family === 'weight' ? QUANTITY_WEIGHT_MULTIPLIERS : family === 'volume' ? QUANTITY_VOLUME_MULTIPLIERS : QUANTITY_PIECE_MULTIPLIERS;
  return amount * multipliers[unit];
}

/** Inverse of {@link canonicalQuantityAmount}: a canonical (g/ml/cs) amount back into `unit`. */
export function fromCanonicalQuantityAmount(canonicalAmount: number, unit: QuantityUnit): number {
  const family = quantityFamily(unit);
  const multipliers = family === 'weight' ? QUANTITY_WEIGHT_MULTIPLIERS : family === 'volume' ? QUANTITY_VOLUME_MULTIPLIERS : QUANTITY_PIECE_MULTIPLIERS;
  return canonicalAmount / multipliers[unit];
}

export function canonicalDurationAmount(amount: number, unit: DurationUnit): number {
  return amount * DURATION_MULTIPLIERS[unit];
}

/**
 * documentation/Architektúra/Mennyiség mező.md: unit families never compare equal to each other,
 * even with numerically equal `amount`. Both values missing counts as equal.
 */
export function quantitiesEqual(a: ParsedQuantity<QuantityUnit>, b: ParsedQuantity<QuantityUnit>): boolean {
  if (a.amount === null || a.unit === null || b.amount === null || b.unit === null) {
    return a.amount === null && a.unit === null && b.amount === null && b.unit === null;
  }
  if (quantityFamily(a.unit) !== quantityFamily(b.unit)) {
    return false;
  }
  return scaledEqual(canonicalQuantityAmount(a.amount, a.unit), canonicalQuantityAmount(b.amount, b.unit));
}

export function durationsEqual(a: ParsedQuantity<DurationUnit>, b: ParsedQuantity<DurationUnit>): boolean {
  if (a.amount === null || a.unit === null || b.amount === null || b.unit === null) {
    return a.amount === null && a.unit === null && b.amount === null && b.unit === null;
  }
  return scaledEqual(canonicalDurationAmount(a.amount, a.unit), canonicalDurationAmount(b.amount, b.unit));
}

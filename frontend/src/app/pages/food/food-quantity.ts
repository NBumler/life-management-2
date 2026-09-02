import { QuantityUnit, canonicalQuantityAmount, quantityFamily } from '../../shared/quantity';

/**
 * backlog/063 — the one place that turns a `(amount, unit)` bound to a catalog `Food` into the two
 * numbers every downstream calc needs:
 *
 *  - `packages` — the quantity expressed in `cs` (csomag). Price is always `packages × priceHuf`
 *    (the catalog only has a per-package price).
 *  - `baseAmount` — the quantity in canonical grams / millilitres, for per-100 nutrient scaling.
 *
 * `db` (darab) is **contextual**: it resolves through the Food's darab-definíció
 * (`pieceAmount` + `pieceUnit`) → `cs` → net content → g/ml. With no darab-definíció `1 db = 1 cs`
 * (documentation/Subfeatures/Élelmiszerek.md). `cs` resolves through the net content the same way it
 * always has; an SI unit is already a base amount and only needs the net content to derive packages.
 *
 * A `null` on either field means "not resolvable from what the catalog knows" (missing / non-SI net
 * content, or an SI darab-definíció with no matching-family net content) — callers surface this as
 * the "hiányos" state, never as a zero.
 */
export interface FoodQuantityContext {
  netAmount?: number | null;
  netUnit?: string | null;
  pieceAmount?: number | null;
  pieceUnit?: string | null;
}

export interface ResolvedFoodQuantity {
  /** Quantity in `cs` (packages) — `price = packages × priceHuf`. `null` when not derivable. */
  packages: number | null;
  /** Canonical grams / millilitres, for `(baseAmount / 100) × per100` nutrient math. `null` when not derivable. */
  baseAmount: number | null;
}

const MISSING: ResolvedFoodQuantity = { packages: null, baseAmount: null };

/** Display helper: trim float noise from a derived amount (`3 × 0.1667` etc.) to 4 places. */
function tidy(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

function isSiUnit(unit: string): boolean {
  const family = quantityFamily(unit as QuantityUnit);
  return family === 'weight' || family === 'volume';
}

/** The Food's net content as a canonical g/ml amount, or `null` if it isn't a usable SI quantity. */
function netBase(food: FoodQuantityContext): number | null {
  if (food.netAmount == null || food.netUnit == null || !isSiUnit(food.netUnit)) {
    return null;
  }
  return canonicalQuantityAmount(food.netAmount, food.netUnit as QuantityUnit);
}

/** A usable darab-definíció, or `null` (both fields must be set, and `db` is not a legal piece unit). */
function pieceDef(food: FoodQuantityContext): { amount: number; unit: QuantityUnit } | null {
  if (food.pieceAmount == null || food.pieceUnit == null || food.pieceUnit === 'db') {
    return null;
  }
  return { amount: food.pieceAmount, unit: food.pieceUnit as QuantityUnit };
}

/** `N cs` → packages + (base amount when the net content is SI). */
function fromPackages(packages: number, food: FoodQuantityContext): ResolvedFoodQuantity {
  const base = netBase(food);
  return { packages, baseAmount: base === null ? null : packages * base };
}

export function resolveFoodQuantity(amount: number, unit: QuantityUnit, food: FoodQuantityContext): ResolvedFoodQuantity {
  if (unit === 'cs') {
    return fromPackages(amount, food);
  }

  if (unit === 'db') {
    const piece = pieceDef(food);
    if (piece === null) {
      // No darab-definíció: 1 db = 1 cs.
      return fromPackages(amount, food);
    }
    if (piece.unit === 'cs') {
      return fromPackages(amount * piece.amount, food);
    }
    // SI darab-definíció: 1 db = piece.amount piece.unit (g/ml). Base amount is direct; packages
    // need a net content in the same family.
    const baseAmount = amount * canonicalQuantityAmount(piece.amount, piece.unit);
    const base = netBase(food);
    const packages = base !== null && quantityFamily(piece.unit) === quantityFamily(food.netUnit as QuantityUnit) ? baseAmount / base : null;
    return { packages, baseAmount };
  }

  // SI unit: already a base amount; packages need a same-family SI net content.
  if (!isSiUnit(unit)) {
    return MISSING;
  }
  const baseAmount = canonicalQuantityAmount(amount, unit);
  const base = netBase(food);
  const packages = base !== null && quantityFamily(unit) === quantityFamily(food.netUnit as QuantityUnit) ? baseAmount / base : null;
  return { packages, baseAmount };
}

/**
 * documentation/Subfeatures/Recept.md "`db` / `cs` megjelenítés" — the parenthesised conversion hint:
 * `3db (18dkg)` for an SI darab-definíció, `3db (0.5cs)` for a package-fraction one, `3db` with no
 * definíció; `2cs (1000g)` when the net content is known.
 */
export function formatFoodQuantity(amount: number, unit: QuantityUnit, food: FoodQuantityContext | undefined): string {
  const bare = `${amount}${unit}`;
  if (food === undefined) {
    return bare;
  }
  if (unit === 'db') {
    const piece = pieceDef(food);
    if (piece === null) {
      return bare;
    }
    return `${amount}db (${tidy(amount * piece.amount)}${piece.unit})`;
  }
  if (unit === 'cs') {
    if (food.netAmount == null || food.netUnit == null) {
      return bare;
    }
    return `${amount}cs (${tidy(amount * food.netAmount)}${food.netUnit})`;
  }
  return bare;
}

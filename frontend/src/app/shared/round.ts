/**
 * Rounds to 3 decimals — the precision of every derived (computed, not typed) nutrient value: the
 * salt → sodium / chloride split (documentation/Subfeatures/Élelmiszer manuális bevitele.md) and the
 * Open Food Facts complex-carb / unsaturated-fat derivations (backlog/174). Plain IEEE-754
 * subtraction leaks artefacts like `7 - 4.4 = 2.5999999999999996` into the form otherwise.
 */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * documentation/Subfeatures/Élelmiszer manuális bevitele.md "Só → nátrium / klorid": EU rule of
 * thumb (salt = sodium × 2.5) plus a NaCl assumption for the chloride remainder. Rounded to 3
 * decimals, matching the spec's stated precision.
 */
export function sodiumFromSalt(saltG: number): number {
  return round3(saltG / 2.5);
}

export function chlorideFromSaltAndSodium(saltG: number, sodiumG: number): number {
  return round3(saltG - sodiumG);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

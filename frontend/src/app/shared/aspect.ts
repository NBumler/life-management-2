/**
 * backlog/068 — the wall "fekvés" (aspect / orientation) of a climbing sector, route or logged
 * session, as an 8-wind compass enum. Guidebooks give the aspect as a compass point, so the value
 * *is* the enum — but a reading taken off a phone compass (degrees) can be binned into it with
 * {@link degreesToAspect}. `null` means "unknown / not given".
 *
 * Storage is a plain `text` column holding the token (`N`..`NW`); the OpenAPI schema pins the same
 * eight values and a DB CHECK enforces them. The degree ↔ enum mapping is pinned by
 * shared/fixtures/aspect-degrees.json (see aspect.spec.ts) so it stays bit-for-bit identical to the
 * Java side (hu.bumler.lm2.common.AspectDirection).
 */

export const ASPECTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export type Aspect = (typeof ASPECTS)[number];

/** Clockwise order from North — index `i` owns the 45° wedge centred on `i * 45` degrees. */
const CENTER_DEGREES = 45;

export function isAspect(value: unknown): value is Aspect {
  return typeof value === 'string' && (ASPECTS as readonly string[]).includes(value);
}

/** Normalise any degree reading into `[0, 360)`. */
function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Bin a compass bearing (degrees clockwise from North, any sign / magnitude) into one of the eight
 * aspects. The lower boundary of a wedge rounds *up* into it — exactly 22.5° is `NE`, not `N`.
 */
export function degreesToAspect(degrees: number): Aspect {
  const normalized = normalizeDegrees(degrees);
  const index = Math.floor((normalized + CENTER_DEGREES / 2) / CENTER_DEGREES) % ASPECTS.length;
  return ASPECTS[index];
}

/** The cardinal degree an aspect points at (`N` → 0, `NE` → 45, …) — the inverse midpoint of its wedge. */
export function aspectToDegrees(aspect: Aspect): number {
  return ASPECTS.indexOf(aspect) * CENTER_DEGREES;
}

/** i18n key for the short compass label (`É`, `ÉK`, …) rendered on the picker. */
export function aspectShortKey(aspect: Aspect): string {
  return `SHARED.ASPECT_PICKER.SHORT.${aspect}`;
}

/** i18n key for the spelled-out direction (`észak`, …) used as the accessible label / summary text. */
export function aspectFullKey(aspect: Aspect): string {
  return `SHARED.ASPECT_PICKER.FULL.${aspect}`;
}

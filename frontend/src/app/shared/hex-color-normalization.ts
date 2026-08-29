/**
 * documentation/Subfeatures/Indoor boulder admin.md + documentation/Architektúra/Névegyediség.md —
 * canonical form of a CSS hex colour for the "unique among a gym's live colour bands" check: trim →
 * lowercase → drop a leading `#` → expand a 3-digit short form to 6 digits → re-prepend `#`. Pure and
 * lenient like `normalizeName` / `normalizeBarcode`; shape validation (must be 3 or 6 hex digits) is
 * done at the form / OpenAPI boundary, not here.
 *
 * Client/server parity is mandatory (an offline save must not "succeed" locally and then 409 at sync
 * time): both sides are tested against the single fixture list,
 * shared/fixtures/hex-color-normalization.json (see hex-color-normalization.spec.ts and the backend's
 * hu.bumler.lm2.common.HexColorNormalizer).
 */
export function normalizeHexColor(input: string): string {
  let s = input.trim().toLowerCase();
  if (s.startsWith('#')) {
    s = s.slice(1);
  }
  if (s.length === 3) {
    s = s
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  return `#${s}`;
}

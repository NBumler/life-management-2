/**
 * documentation/Architektúra/Névegyediség.md `normalizeName`: NFC → collapse every whitespace run
 * (JS `\s` already includes U+00A0) to a single regular space, trimming leading/trailing runs as a
 * side effect → locale-independent lowercase (`toLowerCase`, not `toLocaleLowerCase`). Accents are
 * intentionally kept — unlike search folding (see text-search.ts, which must NOT reuse this for
 * uniqueness checks).
 *
 * Client/server parity is mandatory: both sides are tested against the single fixture list,
 * shared/fixtures/name-normalization.json (see name-normalization.spec.ts and the backend's
 * hu.bumler.lm2.common.NameNormalizerTest).
 */
export function normalizeName(input: string): string {
  return input.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség (Food)": barcode comparison for
 * the Food field-set duplicate check — trim, strip every non-digit character (hyphens, spaces),
 * keep leading zeros. Empty input normalizes to empty.
 *
 * Client/server parity is mandatory: both sides are tested against the single fixture list,
 * shared/fixtures/barcode-normalization.json (see barcode-normalization.spec.ts and the backend's
 * hu.bumler.lm2.common.BarcodeNormalizer).
 */
export function normalizeBarcode(input: string): string {
  return input.trim().replace(/[^0-9]/g, '');
}

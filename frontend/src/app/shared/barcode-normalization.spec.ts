import fixtureCases from '../../../../shared/fixtures/barcode-normalization.json';
import { normalizeBarcode } from './barcode-normalization';

describe('normalizeBarcode', () => {
  for (const { description, input, expected } of fixtureCases) {
    it(description, () => {
      expect(normalizeBarcode(input)).toBe(expected);
    });
  }
});

import fixtureCases from '../../../../shared/fixtures/hex-color-normalization.json';
import { normalizeHexColor } from './hex-color-normalization';

describe('normalizeHexColor', () => {
  for (const { description, input, expected } of fixtureCases) {
    it(description, () => {
      expect(normalizeHexColor(input)).toBe(expected);
    });
  }

  it('is idempotent', () => {
    const once = normalizeHexColor('#F0A');
    expect(normalizeHexColor(once)).toBe(once);
  });
});

import fixtureCases from '../../../../shared/fixtures/name-normalization.json';
import { normalizeName } from './name-normalization';

describe('normalizeName', () => {
  for (const { description, input, expected } of fixtureCases) {
    it(description, () => {
      expect(normalizeName(input)).toBe(expected);
    });
  }

  it('distinguishes accented from unaccented names (unlike search folding)', () => {
    expect(normalizeName('Sör')).not.toBe(normalizeName('Sor'));
  });
});

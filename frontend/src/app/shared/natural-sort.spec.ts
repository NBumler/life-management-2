import fixtureCases from '../../../../shared/fixtures/natural-sort.json';
import { compareNatural, compareTopoNumber } from './natural-sort';

describe('compareNatural (shared/fixtures/natural-sort.json)', () => {
  for (const { description, input, expected } of fixtureCases) {
    it(description, () => {
      expect([...input].sort(compareNatural)).toEqual(expected);
    });
  }

  it('is idempotent — sorting an already-sorted list is a no-op', () => {
    for (const { expected } of fixtureCases) {
      expect([...expected].sort(compareNatural)).toEqual(expected);
    }
  });
});

describe('compareTopoNumber', () => {
  it('returns 0 when neither side has a topo number (caller falls back to name)', () => {
    expect(compareTopoNumber(null, null)).toBe(0);
    expect(compareTopoNumber('', '   ')).toBe(0);
    expect(compareTopoNumber(undefined, '')).toBe(0);
  });

  it('sorts a present topo number before an absent one', () => {
    expect(compareTopoNumber('7', null)).toBeLessThan(0);
    expect(compareTopoNumber(null, '7')).toBeGreaterThan(0);
    expect(compareTopoNumber('  ', '1')).toBeGreaterThan(0);
  });

  it('orders present values naturally', () => {
    const rows = ['10', '2', '5/b', '5/a', ''];
    expect([...rows].sort(compareTopoNumber)).toEqual(['2', '5/a', '5/b', '10', '']);
  });
});

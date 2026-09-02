import fixture from '../../../../shared/fixtures/quantity-conversion.json';
import {
  DURATION_MULTIPLIERS,
  DurationUnit,
  EQUALITY_DECIMAL_SCALE,
  QUANTITY_PIECE_MULTIPLIERS,
  QUANTITY_VOLUME_MULTIPLIERS,
  QUANTITY_WEIGHT_MULTIPLIERS,
  QuantityParseError,
  QuantityUnit,
  canonicalQuantityAmount,
  durationsEqual,
  formatQuantityValue,
  fromCanonicalQuantityAmount,
  parseQuantityInput,
  quantitiesEqual,
} from './quantity';

describe('quantity multiplier tables', () => {
  it('match the shared fixture exactly (parity with hu.bumler.lm2.common.QuantityConverter)', () => {
    expect(QUANTITY_WEIGHT_MULTIPLIERS).toEqual(fixture.quantity.weight.multipliers);
    expect(QUANTITY_VOLUME_MULTIPLIERS).toEqual(fixture.quantity.volume.multipliers);
    expect(QUANTITY_PIECE_MULTIPLIERS).toEqual(fixture.quantity.piece.multipliers);
    expect(DURATION_MULTIPLIERS).toEqual(fixture.duration.time.multipliers);
    expect(EQUALITY_DECIMAL_SCALE).toBe(fixture.equalityDecimalScale);
  });
});

describe('fromCanonicalQuantityAmount', () => {
  const cases: [QuantityUnit, number][] = [
    ['g', 250],
    ['dkg', 12],
    ['kg', 1.5],
    ['ml', 400],
    ['dl', 3],
    ['l', 2],
    ['cs', 5],
    ['db', 7],
  ];
  for (const [unit, amount] of cases) {
    it(`round-trips ${amount}${unit} through canonical and back`, () => {
      expect(fromCanonicalQuantityAmount(canonicalQuantityAmount(amount, unit), unit)).toBeCloseTo(amount);
    });
  }
});

describe('parseQuantityInput', () => {
  const quantityExamples: [string, number, QuantityUnit][] = [
    ['120dkg', 120, 'dkg'],
    ['3cs', 3, 'cs'],
    ['2 csomag', 2, 'cs'],
    ['4db', 4, 'db'],
    ['2 darab', 2, 'db'],
    ['2l', 2, 'l'],
    ['1.5kg', 1.5, 'kg'],
    ['5cl', 5, 'cl'],
    ['100 g', 100, 'g'],
    ['0.4 ml', 0.4, 'ml'],
    ['0,4ml', 0.4, 'ml'],
  ];
  for (const [input, amount, unit] of quantityExamples) {
    it(`parses "${input}" as quantity`, () => {
      expect(parseQuantityInput(input, 'quantity')).toEqual({ amount, unit });
    });
  }

  const durationExamples: [string, number, DurationUnit][] = [
    ['14nap', 14, 'nap'],
    ['2 hét', 2, 'hét'],
    ['3hó', 3, 'hó'],
    ['1év', 1, 'év'],
    ['48óra', 48, 'óra'],
    ['5min', 5, 'perc'],
    ['2w', 2, 'hét'],
  ];
  for (const [input, amount, unit] of durationExamples) {
    it(`parses "${input}" as duration`, () => {
      expect(parseQuantityInput(input, 'duration')).toEqual({ amount, unit });
    });
  }

  it('treats empty input as a valid "no value"', () => {
    expect(parseQuantityInput('', 'quantity')).toEqual({ amount: null, unit: null });
    expect(parseQuantityInput('   ', 'duration')).toEqual({ amount: null, unit: null });
  });

  it('rejects a unit foreign to the mode', () => {
    expect(() => parseQuantityInput('5kg', 'duration')).toThrowError(QuantityParseError);
    expect(() => parseQuantityInput('5nap', 'quantity')).toThrowError(QuantityParseError);
  });

  it('rejects unparseable input', () => {
    expect(() => parseQuantityInput('abc', 'quantity')).toThrowError(QuantityParseError);
    expect(() => parseQuantityInput('5', 'quantity')).toThrowError(QuantityParseError);
  });

  describe('fraction input (documentation/Architektúra/Mennyiség mező.md "Tört bevitel")', () => {
    for (const { input, amount } of fixture.fractionExamples) {
      it(`parses "${input}cs" as ${amount}cs (rounded to ${EQUALITY_DECIMAL_SCALE} places)`, () => {
        expect(parseQuantityInput(`${input}cs`, 'quantity')).toEqual({ amount, unit: 'cs' });
      });
    }

    it('accepts an optional space and the "csomag" alias with a fraction', () => {
      expect(parseQuantityInput('1/6 cs', 'quantity')).toEqual({ amount: 0.1667, unit: 'cs' });
      expect(parseQuantityInput('1/6 csomag', 'quantity')).toEqual({ amount: 0.1667, unit: 'cs' });
    });

    it('rejects a zero denominator', () => {
      expect(() => parseQuantityInput('1/0cs', 'quantity')).toThrowError(QuantityParseError);
    });

    it('does not support mixed fractions', () => {
      expect(() => parseQuantityInput('1 1/2cs', 'quantity')).toThrowError(QuantityParseError);
    });
  });
});

describe('formatQuantityValue', () => {
  it('formats without a space, canonical form', () => {
    expect(formatQuantityValue({ amount: 120, unit: 'dkg' })).toBe('120dkg');
  });

  it('formats a missing value as an empty string', () => {
    expect(formatQuantityValue({ amount: null, unit: null })).toBe('');
  });
});

describe('quantitiesEqual', () => {
  it('treats 1l and 100cl as equal', () => {
    expect(quantitiesEqual({ amount: 1, unit: 'l' }, { amount: 100, unit: 'cl' })).toBe(true);
  });

  it('never treats different unit families as equal, even with the same numeric amount', () => {
    expect(quantitiesEqual({ amount: 3, unit: 'cs' }, { amount: 3, unit: 'g' })).toBe(false);
  });

  it('backlog/063: db and cs share the piece family (context-free default 1 db = 1 cs)', () => {
    expect(quantitiesEqual({ amount: 3, unit: 'db' }, { amount: 3, unit: 'cs' })).toBe(true);
  });

  it('treats both-missing as equal', () => {
    expect(quantitiesEqual({ amount: null, unit: null }, { amount: null, unit: null })).toBe(true);
  });

  it('absorbs fraction-rounding float noise via the scaled-integer compare', () => {
    // 1/6 stored as 0.1667; a raw 1/6 (0.16666…) is equal at EQUALITY_DECIMAL_SCALE places.
    expect(quantitiesEqual({ amount: 0.1667, unit: 'cs' }, { amount: 1 / 6, unit: 'cs' })).toBe(true);
  });

  it('still distinguishes amounts that differ beyond the scale', () => {
    expect(quantitiesEqual({ amount: 0.1667, unit: 'cs' }, { amount: 0.1669, unit: 'cs' })).toBe(false);
  });
});

describe('durationsEqual', () => {
  it('treats 2 hét and 14 nap as equal', () => {
    expect(durationsEqual({ amount: 2, unit: 'hét' }, { amount: 14, unit: 'nap' })).toBe(true);
  });
});

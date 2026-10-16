import {
  BOULDER_SCALES,
  CLIMBING_GRADE_MATRIX,
  ClimbingScale,
  ROPE_SCALES,
  bandModifierIndex,
  colorBandMidIndex,
  gradeToIndex,
} from './climbing-grade-matrix';

describe('climbing-grade-matrix', () => {
  const ALL_SCALES = [...ROPE_SCALES, ...BOULDER_SCALES] as ClimbingScale[];

  it('covers the five scales, split into rope and boulder contexts', () => {
    expect(ROPE_SCALES).toEqual(['FRENCH', 'YDS', 'UIAA']);
    expect(BOULDER_SCALES).toEqual(['FONT', 'V_SCALE']);
  });

  // backlog/155 — the French / Font 3–5 band (optional sub-letter) may share indices; everything
  // else is one label per integer. The band is checked in an explicit easiest-first order because
  // `Object.entries` lists integer-like keys (`'3'`, `'4'`, `'5'`) first, not in table order.
  const SHARED_LOW_BAND = /^[345]([a-cA-C]\+?)?$/;
  const LOW_BAND_ORDER: Partial<Record<ClimbingScale, readonly string[]>> = {
    // The bare French 5 (= 9, pre-155 anchor) sits below 5a; the other bare steps mid-letter.
    FRENCH: ['3a', '3a+', '3', '3b', '3b+', '3c', '3c+', '4a', '4a+', '4', '4b', '4b+', '4c', '4c+',
      '5', '5a', '5a+', '5b', '5b+', '5c', '5c+'],
    FONT: ['3A', '3A+', '3', '3B', '3B+', '3C', '3C+', '4A', '4A+', '4', '4B', '4B+', '4C', '4C+',
      '5A', '5A+', '5', '5B', '5B+', '5C', '5C+'],
  };

  for (const scale of ['FRENCH', 'YDS', 'UIAA', 'FONT', 'V_SCALE'] as ClimbingScale[]) {
    it(`${scale}: indices strictly increase outside the 3–5 band and never decrease within it`, () => {
      const entries = Object.entries(CLIMBING_GRADE_MATRIX[scale]);
      const isLowBand = (label: string) => (scale === 'FRENCH' || scale === 'FONT') && SHARED_LOW_BAND.test(label);
      const upper = entries.filter(([label]) => !isLowBand(label)).map(([, index]) => index);
      for (let i = 1; i < upper.length; i += 1) {
        expect(upper[i]).toBeGreaterThan(upper[i - 1]);
      }
      const order = LOW_BAND_ORDER[scale];
      if (order) {
        expect(entries.filter(([label]) => isLowBand(label)).length).toBe(order.length);
        const low = order.map((label) => gradeToIndex(scale, label) as number);
        for (let i = 1; i < low.length; i += 1) {
          expect(low[i]).withContext(order[i]).toBeGreaterThanOrEqual(low[i - 1]);
        }
        expect(upper[0]).toBeGreaterThan(low[low.length - 1]);
      }
    });
  }

  it('covers every 3–5 French / Font step with and without its optional sub-letter (backlog/155)', () => {
    for (const digit of ['3', '4', '5']) {
      expect(gradeToIndex('FRENCH', digit)).not.toBeNull();
      expect(gradeToIndex('FONT', digit)).not.toBeNull();
      for (const letter of ['a', 'b', 'c']) {
        for (const plus of ['', '+']) {
          expect(gradeToIndex('FRENCH', `${digit}${letter}${plus}`)).withContext(`${digit}${letter}${plus}`).not.toBeNull();
          expect(gradeToIndex('FONT', `${digit}${letter.toUpperCase()}${plus}`))
            .withContext(`${digit}${letter.toUpperCase()}${plus}`)
            .not.toBeNull();
        }
      }
    }
    // The bare French steps keep their pre-155 indices; Font 3–5 is aligned to the V-Scale.
    expect(gradeToIndex('FRENCH', '3')).toBe(2);
    expect(gradeToIndex('FRENCH', '4')).toBe(6);
    expect(gradeToIndex('FRENCH', '5')).toBe(9);
    expect(gradeToIndex('FONT', '3')).toBe(5);
    expect(gradeToIndex('FONT', '4')).toBe(8);
    expect(gradeToIndex('FONT', '4C+')).toBe(gradeToIndex('V_SCALE', 'V0'));
    expect(gradeToIndex('FONT', '5')).toBe(gradeToIndex('V_SCALE', 'V1'));
    expect(gradeToIndex('FONT', '5C')).toBe(gradeToIndex('V_SCALE', 'V2'));
    expect(gradeToIndex('FONT', '6A')).toBe(gradeToIndex('V_SCALE', 'V3'));
  });

  it('reproduces the fixed anchor rows verbatim (French / UIAA / YDS / V-Scale)', () => {
    // matrix.md "Referencia-anchor tábla" — the hand-confirmed 10–20 rows and their extension.
    expect(gradeToIndex('FRENCH', '5a')).toBe(10);
    expect(gradeToIndex('FRENCH', '5c')).toBe(12);
    expect(gradeToIndex('FRENCH', '6a')).toBe(14);
    expect(gradeToIndex('FRENCH', '6b')).toBe(16);
    expect(gradeToIndex('FRENCH', '6c')).toBe(18);
    expect(gradeToIndex('FRENCH', '7a')).toBe(20);
    expect(gradeToIndex('FRENCH', '8c')).toBe(40);

    expect(gradeToIndex('UIAA', 'V')).toBe(10);
    expect(gradeToIndex('UIAA', 'VI-')).toBe(12);
    expect(gradeToIndex('UIAA', 'VI')).toBe(14);
    expect(gradeToIndex('UIAA', 'VIII-')).toBe(20);
    expect(gradeToIndex('UIAA', 'XI+')).toBe(40);

    expect(gradeToIndex('YDS', '5.8')).toBe(10);
    expect(gradeToIndex('YDS', '5.9')).toBe(12);
    expect(gradeToIndex('YDS', '5.10a')).toBe(14);
    expect(gradeToIndex('YDS', '5.11c')).toBe(20);
    expect(gradeToIndex('YDS', '5.14b')).toBe(40);

    expect(gradeToIndex('V_SCALE', 'V0')).toBe(10);
    // backlog/152 — VB sits one V-step below V0.
    expect(gradeToIndex('V_SCALE', 'VB')).toBe(8);
    expect(gradeToIndex('V_SCALE', 'V2')).toBe(14);
    expect(gradeToIndex('V_SCALE', 'V5')).toBe(20);
    expect(gradeToIndex('V_SCALE', 'V15')).toBe(40);
  });

  it('keeps the self-consistent Font anchor tail (6B=18 … 8B=40)', () => {
    expect(gradeToIndex('FONT', '6B')).toBe(18);
    expect(gradeToIndex('FONT', '6C')).toBe(20);
    expect(gradeToIndex('FONT', '7A')).toBe(24);
    expect(gradeToIndex('FONT', '7C+')).toBe(34);
    expect(gradeToIndex('FONT', '8B')).toBe(40);
  });

  it('aligns cross-scale grades at the shared anchor indices', () => {
    // index 14: French 6a · UIAA VI · YDS 5.10a · V2 · Font 5C
    expect(
      [
        gradeToIndex('FRENCH', '6a'),
        gradeToIndex('UIAA', 'VI'),
        gradeToIndex('YDS', '5.10a'),
        gradeToIndex('V_SCALE', 'V2'),
        gradeToIndex('FONT', '5C'),
      ],
    ).toEqual([14, 14, 14, 14, 14]);
    // index 20: French 7a · UIAA VIII- · YDS 5.11c · V5 · Font 6C
    expect(
      [
        gradeToIndex('FRENCH', '7a'),
        gradeToIndex('UIAA', 'VIII-'),
        gradeToIndex('YDS', '5.11c'),
        gradeToIndex('V_SCALE', 'V5'),
        gradeToIndex('FONT', '6C'),
      ],
    ).toEqual([20, 20, 20, 20, 20]);
  });

  it('returns null for an unknown label', () => {
    expect(gradeToIndex('FRENCH', '9z')).toBeNull();
    expect(gradeToIndex('V_SCALE', 'V99')).toBeNull();
  });

  it('every matrix index is a positive integer', () => {
    for (const scale of ALL_SCALES) {
      for (const index of Object.values(CLIMBING_GRADE_MATRIX[scale])) {
        expect(Number.isInteger(index)).toBeTrue();
        expect(index).toBeGreaterThan(0);
      }
    }
  });

  describe('colorBandMidIndex', () => {
    it('floors the midpoint of the band range', () => {
      expect(colorBandMidIndex(14, 18)).toBe(16);
      expect(colorBandMidIndex(15, 18)).toBe(16); // 33 / 2 = 16.5 -> 16
      expect(colorBandMidIndex(10, 11)).toBe(10);
      expect(colorBandMidIndex(20, 20)).toBe(20);
    });
  });

  describe('bandModifierIndex (backlog/122)', () => {
    const band = { absoluteDifficultyIndexLower: 15, absoluteDifficultyIndexUpper: 18 };
    it('maps − / band / + to the lower / floored mid / upper index; no modifier = mid', () => {
      expect(bandModifierIndex(band, 'MINUS')).toBe(15);
      expect(bandModifierIndex(band, 'NEUTRAL')).toBe(16);
      expect(bandModifierIndex(band, 'PLUS')).toBe(18);
      expect(bandModifierIndex(band, null)).toBe(16);
    });
  });
});

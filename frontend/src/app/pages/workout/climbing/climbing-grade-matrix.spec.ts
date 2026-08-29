import {
  BOULDER_SCALES,
  CLIMBING_GRADE_MATRIX,
  ClimbingScale,
  ROPE_SCALES,
  colorBandMidIndex,
  gradeToIndex,
} from './climbing-grade-matrix';

describe('climbing-grade-matrix', () => {
  const ALL_SCALES = [...ROPE_SCALES, ...BOULDER_SCALES] as ClimbingScale[];

  it('covers the five scales, split into rope and boulder contexts', () => {
    expect(ROPE_SCALES).toEqual(['FRENCH', 'YDS', 'UIAA']);
    expect(BOULDER_SCALES).toEqual(['FONT', 'V_SCALE']);
  });

  for (const scale of ['FRENCH', 'YDS', 'UIAA', 'FONT', 'V_SCALE'] as ClimbingScale[]) {
    it(`${scale}: indices are strictly increasing and unique`, () => {
      const values = Object.values(CLIMBING_GRADE_MATRIX[scale]);
      for (let i = 1; i < values.length; i += 1) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
      expect(new Set(values).size).toBe(values.length);
    });
  }

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
    // index 14: French 6a · UIAA VI · YDS 5.10a · V2 · Font 5
    expect(
      [
        gradeToIndex('FRENCH', '6a'),
        gradeToIndex('UIAA', 'VI'),
        gradeToIndex('YDS', '5.10a'),
        gradeToIndex('V_SCALE', 'V2'),
        gradeToIndex('FONT', '5'),
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
});

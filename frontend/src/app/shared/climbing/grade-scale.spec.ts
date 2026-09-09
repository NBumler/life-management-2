import { normalizeGradeInput, parseGrade, scalePostfix } from './grade-scale';

describe('grade-scale', () => {
  describe('normalizeGradeInput', () => {
    it('trims and upper-cases for boulder', () => {
      expect(normalizeGradeInput('  6a+ ', 'BOULDER')).toBe('6A+');
      expect(normalizeGradeInput('v5', 'BOULDER')).toBe('V5');
    });

    it('trims and lower-cases for rope, restoring UIAA roman letters', () => {
      expect(normalizeGradeInput(' 6A ', 'ROPE')).toBe('6a');
      expect(normalizeGradeInput('5C', 'ROPE')).toBe('5c'); // French letter stays lower
      expect(normalizeGradeInput('vi-', 'ROPE')).toBe('VI-');
      expect(normalizeGradeInput('viii+', 'ROPE')).toBe('VIII+');
      expect(normalizeGradeInput('5.10A', 'ROPE')).toBe('5.10a');
    });
  });

  describe('parseGrade — empty / unknown', () => {
    it('is EMPTY for blank input', () => {
      expect(parseGrade('', 'ROPE').status).toBe('EMPTY');
      expect(parseGrade('   ', 'BOULDER').status).toBe('EMPTY');
    });

    it('is UNKNOWN for an unrecognised string', () => {
      expect(parseGrade('abc', 'ROPE').status).toBe('UNKNOWN');
      expect(parseGrade('7z', 'ROPE').status).toBe('UNKNOWN');
      expect(parseGrade('nope', 'BOULDER').status).toBe('UNKNOWN');
    });
  });

  describe('parseGrade — unambiguous', () => {
    it('recognises a French rope grade', () => {
      const r = parseGrade('6a', 'ROPE');
      expect(r.status).toBe('VALID');
      expect(r.scale).toBe('FRENCH');
      expect(r.absoluteDifficultyIndex).toBe(14);
    });

    it('recognises a YDS rope grade, including the letterless form', () => {
      expect(parseGrade('5.10c', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'YDS', absoluteDifficultyIndex: 16 }),
      );
      expect(parseGrade('5.10', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'YDS', absoluteDifficultyIndex: 14 }),
      );
    });

    it('recognises a UIAA rope grade', () => {
      const r = parseGrade('VII+', 'ROPE');
      expect(r.status).toBe('VALID');
      expect(r.scale).toBe('UIAA');
      expect(r.absoluteDifficultyIndex).toBe(19);
    });

    it('recognises V-Scale and Font boulder grades', () => {
      expect(parseGrade('V5', 'BOULDER')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'V_SCALE', absoluteDifficultyIndex: 20 }),
      );
      expect(parseGrade('7B', 'BOULDER')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FONT', absoluteDifficultyIndex: 28 }),
      );
    });
  });

  describe('parseGrade — bare numbers', () => {
    it('treats bare 4 / 5 as valid with a discipline default and lists the alternatives', () => {
      const rope = parseGrade('4', 'ROPE');
      expect(rope.status).toBe('VALID');
      expect(rope.scale).toBe('FRENCH');
      expect(rope.absoluteDifficultyIndex).toBe(6);
      expect(rope.candidates.map((c) => c.scale)).toEqual(['FRENCH', 'UIAA']);
      expect(rope.candidates[1]).toEqual(
        jasmine.objectContaining({ scale: 'UIAA', label: 'IV', absoluteDifficultyIndex: 6 }),
      );

      expect(parseGrade('5', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FRENCH', absoluteDifficultyIndex: 9 }),
      );
      expect(parseGrade('4', 'BOULDER')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FONT', absoluteDifficultyIndex: 12 }),
      );
    });

    // Nehézségi szint skálája.md §2 spells out 4 / 5 as the letterless-valid steps; a bare 3 is
    // accepted on the same rule (French / Font 1–3 have no sub-letter form, so `3` is already a
    // complete grade — see the matrix rows FRENCH '3' and FONT '3'). 1 / 2 have no matrix row and
    // stay AMBIGUOUS.
    it('treats a bare 3 as valid with a discipline default (letterless French / Font step)', () => {
      expect(parseGrade('3', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FRENCH', absoluteDifficultyIndex: 2 }),
      );
      expect(parseGrade('3', 'BOULDER')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FONT', absoluteDifficultyIndex: 10 }),
      );
      expect(parseGrade('2', 'ROPE').status).toBe('AMBIGUOUS');
    });

    it('treats a bare number >= 6 as AMBIGUOUS until a chip is chosen', () => {
      const rope = parseGrade('6', 'ROPE');
      expect(rope.status).toBe('AMBIGUOUS');
      expect(rope.scale).toBeNull();
      expect(rope.candidates.map((c) => `${c.scale}:${c.label}`)).toEqual(['FRENCH:6a', 'UIAA:VI']);
      expect(rope.candidates.every((c) => c.absoluteDifficultyIndex === 14)).toBeTrue();

      const boulder = parseGrade('7', 'BOULDER');
      expect(boulder.status).toBe('AMBIGUOUS');
      expect(boulder.candidates).toEqual([
        jasmine.objectContaining({ scale: 'FONT', label: '7A', absoluteDifficultyIndex: 24 }),
      ]);
    });
  });

  describe('parseGrade — "/"-separated guidebook range (backlog/085)', () => {
    it('resolves a same-scale range to the floored midpoint index', () => {
      // UIAA VIII=22, VIII+=23 → floor(22.5)=22
      expect(parseGrade('VIII/VIII+', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'UIAA', absoluteDifficultyIndex: 22 }),
      );
      // French 6c=18, 7a=20 → 19
      expect(parseGrade('6c/7a', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FRENCH', absoluteDifficultyIndex: 19 }),
      );
      // V-Scale V4=18, V5=20 → 19
      expect(parseGrade('V4/V5', 'BOULDER')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'V_SCALE', absoluteDifficultyIndex: 19 }),
      );
      // Font 6A=16, 6B=18 → 17
      expect(parseGrade('6A/6B', 'BOULDER')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FONT', absoluteDifficultyIndex: 17 }),
      );
    });

    it('expands the modifier / sub-letter shorthand on the right side', () => {
      // 7a=20, 7a+=22 → 21
      expect(parseGrade('7a/+', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FRENCH', absoluteDifficultyIndex: 21 }),
      );
      // VIII=22, VIII+=23 → 22
      expect(parseGrade('VIII/+', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'UIAA', absoluteDifficultyIndex: 22 }),
      );
      // French 6a=14, 6b=16 → 15
      expect(parseGrade('6a/b', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FRENCH', absoluteDifficultyIndex: 15 }),
      );
    });

    it('keeps the raw slash text as the normalized label and tolerates spaces around the slash', () => {
      const r = parseGrade('viii / viii+', 'ROPE');
      expect(r.status).toBe('VALID');
      expect(r.normalized).toBe('VIII / VIII+');
      expect(r.candidates[0].label).toBe('VIII / VIII+');
    });

    it('is UNKNOWN for a mixed-scale or malformed range', () => {
      expect(parseGrade('6c/VIII', 'ROPE').status).toBe('UNKNOWN');
      expect(parseGrade('6c/', 'ROPE').status).toBe('UNKNOWN');
      expect(parseGrade('6a/6b/6c', 'ROPE').status).toBe('UNKNOWN');
      expect(parseGrade('abc/def', 'BOULDER').status).toBe('UNKNOWN');
    });

    it('falls back to the single resolvable endpoint when the other is off-matrix', () => {
      // French 9c=52 is the matrix ceiling; 9c+ is not a row → use 9c's index.
      expect(parseGrade('9c/9c+', 'ROPE')).toEqual(
        jasmine.objectContaining({ status: 'VALID', scale: 'FRENCH', absoluteDifficultyIndex: 52 }),
      );
    });
  });

  describe('scalePostfix', () => {
    it('maps scales to their short badge', () => {
      expect(scalePostfix('FRENCH')).toBe('FRA');
      expect(scalePostfix('YDS')).toBe('YDS');
      expect(scalePostfix('UIAA')).toBe('UIAA');
      expect(scalePostfix('FONT')).toBe('FONT');
      expect(scalePostfix('V_SCALE')).toBe('V');
    });
  });
});

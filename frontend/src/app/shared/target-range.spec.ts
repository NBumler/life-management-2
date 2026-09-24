import { formatTargetRange, parseTargetRange, targetRangePrefill } from './target-range';

describe('target-range (backlog/125)', () => {
  describe('parseTargetRange', () => {
    it('accepts a single value and a range, tolerating spaces and an en dash', () => {
      expect(parseTargetRange('10')).toEqual({ ok: true, value: { lower: 10, upper: null } });
      expect(parseTargetRange('8-12')).toEqual({ ok: true, value: { lower: 8, upper: 12 } });
      expect(parseTargetRange(' 8 – 12 ')).toEqual({ ok: true, value: { lower: 8, upper: 12 } });
    });

    it('treats an empty input as "no target"', () => {
      expect(parseTargetRange('')).toEqual({ ok: true, value: { lower: null, upper: null } });
      expect(parseTargetRange('   ')).toEqual({ ok: true, value: { lower: null, upper: null } });
      expect(parseTargetRange(null)).toEqual({ ok: true, value: { lower: null, upper: null } });
    });

    it('collapses an equal-bound range to a single value', () => {
      expect(parseTargetRange('10-10')).toEqual({ ok: true, value: { lower: 10, upper: null } });
    });

    it('rejects an inverted range', () => {
      expect(parseTargetRange('12-8')).toEqual({ ok: false, error: 'INVERTED' });
    });

    it('rejects garbage, open ranges, negatives and decimals for reps', () => {
      for (const input of ['abc', '8-', '-8', '8-12-15', '8.5', '8 12']) {
        expect(parseTargetRange(input)).withContext(input).toEqual({ ok: false, error: 'INVALID' });
      }
    });

    it('accepts decimals (dot or comma) when asked — the future weight-range case', () => {
      expect(parseTargetRange('60-62,5', { allowDecimal: true })).toEqual({ ok: true, value: { lower: 60, upper: 62.5 } });
    });
  });

  it('formatTargetRange renders a range with an en dash', () => {
    expect(formatTargetRange(8, 12)).toBe('8–12');
    expect(formatTargetRange(10, null)).toBe('10');
    expect(formatTargetRange(null, null)).toBe('');
  });

  it('targetRangePrefill takes the midpoint rounded up', () => {
    expect(targetRangePrefill(8, 12)).toBe(10);
    expect(targetRangePrefill(8, 11)).toBe(10);
    expect(targetRangePrefill(10, null)).toBe(10);
    expect(targetRangePrefill(null, null)).toBeNull();
  });
});

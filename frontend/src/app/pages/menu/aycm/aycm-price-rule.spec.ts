import { AycmPriceRule } from '../../../api/model/aycmPriceRule';
import { displayLabel, matchPriceRule, minutesOfDay, rulesOverlap, weekdayIndex } from './aycm-price-rule';

function rule(overrides: Partial<AycmPriceRule> = {}): AycmPriceRule {
  return {
    id: 'r1',
    partnerId: 'p1',
    label: null,
    appliesMon: true,
    appliesTue: true,
    appliesWed: true,
    appliesThu: true,
    appliesFri: true,
    appliesSat: false,
    appliesSun: false,
    startTime: '08:00',
    endTime: '12:00',
    listPriceHuf: 2500,
    coPaymentHuf: 0,
    deleted: false,
    ...overrides,
  };
}

describe('minutesOfDay', () => {
  it('parses HH:mm', () => {
    expect(minutesOfDay('00:00')).toBe(0);
    expect(minutesOfDay('08:30')).toBe(510);
    expect(minutesOfDay('23:59')).toBe(1439);
  });

  it('treats 24:00 as the end-of-day sentinel (1440)', () => {
    expect(minutesOfDay('24:00')).toBe(1440);
  });

  it('returns NaN for malformed input or 24:xx', () => {
    expect(Number.isNaN(minutesOfDay('8:00'))).toBe(true);
    expect(Number.isNaN(minutesOfDay('24:30'))).toBe(true);
    expect(Number.isNaN(minutesOfDay('12:75'))).toBe(true);
  });
});

describe('displayLabel', () => {
  it('uses a non-blank trimmed label', () => {
    expect(displayLabel({ label: '  Reggeli  ', startTime: '08:00', endTime: '12:00' })).toBe('Reggeli');
  });

  it('falls back to the time band when the label is blank / null', () => {
    expect(displayLabel({ label: null, startTime: '08:00', endTime: '12:00' })).toBe('08:00–12:00');
    expect(displayLabel({ label: '   ', startTime: '20:00', endTime: '24:00' })).toBe('20:00–24:00');
  });
});

describe('weekdayIndex', () => {
  it('maps Monday to 0 and Sunday to 6', () => {
    expect(weekdayIndex('2026-08-31')).toBe(0); // Monday
    expect(weekdayIndex('2026-09-06')).toBe(6); // Sunday
  });
});

describe('rulesOverlap', () => {
  it('is true for a shared weekday and intersecting intervals', () => {
    expect(rulesOverlap(rule(), rule({ startTime: '11:00', endTime: '14:00' }))).toBe(true);
  });

  it('is false for adjacent intervals (end === start)', () => {
    expect(rulesOverlap(rule(), rule({ startTime: '12:00', endTime: '16:00' }))).toBe(false);
  });

  it('is false when the weekdays are disjoint even if the intervals match', () => {
    const weekend = rule({ appliesMon: false, appliesTue: false, appliesWed: false, appliesThu: false, appliesFri: false, appliesSat: true, appliesSun: true });
    expect(rulesOverlap(rule(), weekend)).toBe(false);
  });
});

describe('matchPriceRule', () => {
  it('returns the covering live rule', () => {
    const rules = [rule({ id: 'morning', startTime: '08:00', endTime: '12:00' }), rule({ id: 'afternoon', startTime: '12:00', endTime: '18:00' })];
    expect(matchPriceRule(rules, '2026-08-31', '13:30')?.id).toBe('afternoon');
  });

  it('is half-open — the end minute belongs to the next band', () => {
    const rules = [rule({ id: 'morning', startTime: '08:00', endTime: '12:00' })];
    expect(matchPriceRule(rules, '2026-08-31', '12:00')).toBeNull();
  });

  it('returns null on a gap / wrong weekday / no rules', () => {
    expect(matchPriceRule([rule()], '2026-08-31', '20:00')).toBeNull();
    expect(matchPriceRule([rule()], '2026-09-05', '09:00')).toBeNull(); // Saturday
    expect(matchPriceRule([], '2026-08-31', '09:00')).toBeNull();
  });

  it('ignores deleted rules', () => {
    expect(matchPriceRule([rule({ deleted: true })], '2026-08-31', '09:00')).toBeNull();
  });
});

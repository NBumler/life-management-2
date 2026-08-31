import { ageInYears, today } from './local-date';

describe('today()', () => {
  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('matches the device local calendar day (independent oracle: Date\'s own local getters, not toISOString)', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    expect(today()).toBe(expected);
  });

  it('zero-pads single-digit month and day', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 0, 5, 12, 0, 0));

    expect(today()).toBe('2026-01-05');
  });

  it('reports the local calendar day even at an instant whose UTC calendar day differs (the bug this guards against)', () => {
    // documentation/Architektúra/Backend-offline first.md: "ma" is always the client's local
    // calendar day. `new Date().toISOString().slice(0, 10)` is UTC and disagrees with the local
    // day near local midnight in any non-UTC timezone — that was the actual regression. Per MDN,
    // getTimezoneOffset() is negative for zones AHEAD of UTC (e.g. Budapest), where the crossing
    // happens just AFTER local midnight, and positive for zones BEHIND UTC, where it happens just
    // BEFORE local midnight — pick whichever side actually crosses for this test runner's zone.
    const offsetMinutes = new Date().getTimezoneOffset();
    if (offsetMinutes === 0) {
      return; // UTC-configured runner: local and UTC calendar days can never disagree.
    }
    jasmine.clock().install();
    const localExpected = offsetMinutes < 0 ? '2026-06-01' : '2026-05-31';
    const instant = offsetMinutes < 0 ? new Date(2026, 5, 1, 0, 0, 30) : new Date(2026, 4, 31, 23, 59, 30);
    jasmine.clock().mockDate(instant);

    expect(today()).toBe(localExpected);
    expect(instant.toISOString().slice(0, 10)).not.toBe(localExpected);
  });
});

describe('ageInYears()', () => {
  it('counts only completed years (floor period)', () => {
    expect(ageInYears('2000-06-15', '2026-06-15')).toBe(26);
    expect(ageInYears('2000-06-15', '2026-06-14')).toBe(25);
    expect(ageInYears('2000-06-15', '2026-12-31')).toBe(26);
  });

  it('handles the birthday-month day boundary', () => {
    expect(ageInYears('2001-03-10', '2026-03-09')).toBe(24);
    expect(ageInYears('2001-03-10', '2026-03-10')).toBe(25);
  });
});

import { ForecastDay } from './training-forecast';
import { DayLoad } from './training-load';
import { loadWarningDates, loadWarnings } from './load-warnings';
import { addLocalDays } from './weekly-plan/weekly-plan-adherence';

const TODAY = '2026-10-01'; // a Thursday — Monday is 2026-09-28

/** Days from `loadWarningDates(TODAY)`; `overrides` keyed by date. Default: a rest day. */
function days(overrides: Record<string, Partial<DayLoad>> = {}): DayLoad[] {
  return loadWarningDates(TODAY).map((date) => ({
    date,
    climbing: 0,
    workouts: 0,
    fingerLoad: false,
    rest: true,
    plannedClimb: false,
    missedClimb: false,
    ...overrides[date],
  }));
}

const busy: Partial<DayLoad> = { workouts: 1, rest: false };
const climb: Partial<DayLoad> = { climbing: 1, fingerLoad: true, rest: false };

function codes(list: DayLoad[], ahead: ForecastDay[] = []): string[] {
  return loadWarnings(list, TODAY, ahead).map((warning) => warning.code);
}

/** A 7-day forecast from TODAY; `kinds[i]` is day i's kind. */
function forecastAhead(kinds: ForecastDay['kind'][]): ForecastDay[] {
  return kinds.map((kind, offset) => ({
    date: addLocalDays(TODAY, offset),
    kind,
    reason: kind === 'CLIMB' ? 'PLANNED_CLIMB' : kind === 'REST' ? 'BLOCK_LIMIT' : 'ROTATION',
    plan: null,
    fingerFallback: false,
    blockLength: 0,
  }));
}

describe('load-warnings (backlog/138)', () => {
  it('covers the 7 days before today (rest window) through the 7-day look-ahead', () => {
    const dates = loadWarningDates(TODAY);
    expect(dates[0]).toBe(addLocalDays(TODAY, -7));
    expect(dates[dates.length - 1]).toBe(addLocalDays(TODAY, 6));
  });

  it('a quiet week has no warnings', () => {
    expect(codes(days())).toEqual([]);
  });

  it('NO_REST_DAY when none of the 7 days before today was a rest day (today itself does not count)', () => {
    const overrides: Record<string, Partial<DayLoad>> = {};
    for (let offset = 1; offset <= 7; offset++) {
      overrides[addLocalDays(TODAY, -offset)] = busy;
    }
    expect(codes(days(overrides))).toEqual(['NO_REST_DAY']);

    overrides[addLocalDays(TODAY, -7)] = {};
    expect(codes(days(overrides))).toEqual([]);
  });

  it('CLIMBED_TODAY is an info when today has a climbing session', () => {
    const result = loadWarnings(days({ [TODAY]: climb }), TODAY);
    expect(result).toEqual([{ code: 'CLIMBED_TODAY', severity: 'info' }]);
  });

  it('MANY_CLIMBS from 4 climbing days in the calendar week (last week does not count)', () => {
    const overrides = {
      '2026-09-27': climb, // previous Sunday
      '2026-09-28': climb,
      '2026-09-29': climb,
      '2026-09-30': climb,
    };
    expect(codes(days(overrides))).toEqual([]);
    // the 5th climbing day in a row also crosses the rolling finger-load limit
    expect(codes(days({ ...overrides, [TODAY]: climb }))).toEqual(['FINGER_LOAD', 'CLIMBED_TODAY', 'MANY_CLIMBS']);
  });

  it('FINGER_LOAD from 5 finger-loading days in the rolling 7 days, today included', () => {
    const finger: Partial<DayLoad> = { workouts: 1, fingerLoad: true, rest: false };
    const overrides: Record<string, Partial<DayLoad>> = {};
    for (let offset = 0; offset < 5; offset++) {
      overrides[addLocalDays(TODAY, -offset)] = finger;
    }
    expect(codes(days(overrides))).toEqual(['FINGER_LOAD']);
  });

  describe('planned climbs (backlog/143)', () => {
    const planned: Partial<DayLoad> = { plannedClimb: true, rest: false };

    it('a climb planned today is CLIMB_PLANNED_TODAY (a logged one stays CLIMBED_TODAY)', () => {
      expect(codes(days({ [TODAY]: planned }))).toEqual(['CLIMB_PLANNED_TODAY']);
    });

    it('a climb planned tomorrow is CLIMB_TOMORROW', () => {
      expect(codes(days({ [addLocalDays(TODAY, 1)]: planned }))).toEqual(['CLIMB_TOMORROW']);
    });

    it('MANY_CLIMBS counts logged + planned climbs over the whole calendar week', () => {
      const overrides = {
        '2026-09-28': climb,
        '2026-10-02': planned,
        '2026-10-03': planned,
        '2026-10-04': planned,
      };
      // 10-02 is tomorrow, so the look-ahead info shows too
      expect(codes(days(overrides))).toEqual(['CLIMB_TOMORROW', 'MANY_CLIMBS']);
    });

    it('NO_REST_AHEAD (backlog/144) when the 7-day forecast keeps no rest day', () => {
      expect(codes(days(), forecastAhead(['WORKOUT', 'CLIMB', 'WORKOUT', 'CLIMB', 'WORKOUT', 'CLIMB', 'CLIMB']))).toContain('NO_REST_AHEAD');
      expect(codes(days(), forecastAhead(['WORKOUT', 'CLIMB', 'REST', 'CLIMB', 'WORKOUT', 'CLIMB', 'CLIMB']))).not.toContain('NO_REST_AHEAD');
    });

    it('a forecast shorter than the look-ahead window does not trigger NO_REST_AHEAD', () => {
      expect(codes(days(), forecastAhead(['WORKOUT', 'CLIMB']))).toEqual([]);
    });
  });
});

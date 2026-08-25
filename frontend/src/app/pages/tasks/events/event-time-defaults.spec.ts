import { computeDefaultTimedTimes } from './event-time-defaults';

describe('computeDefaultTimedTimes', () => {
  it('rounds up to the next 15-minute mark', () => {
    expect(computeDefaultTimedTimes(10, 1)).toEqual({ startTime: '10:15', endTime: '11:15' });
  });

  it('leaves an exact 15-minute mark unchanged', () => {
    expect(computeDefaultTimedTimes(10, 0)).toEqual({ startTime: '10:00', endTime: '11:00' });
  });

  it('clamps endTime to 23:59 when startTime + 1h would cross midnight', () => {
    expect(computeDefaultTimedTimes(23, 16)).toEqual({ startTime: '23:30', endTime: '23:59' });
  });

  it('falls back to 22:59/23:59 when rounding itself would cross midnight (23:46–23:59)', () => {
    expect(computeDefaultTimedTimes(23, 46)).toEqual({ startTime: '22:59', endTime: '23:59' });
    expect(computeDefaultTimedTimes(23, 59)).toEqual({ startTime: '22:59', endTime: '23:59' });
  });

  it('does not fall back at 23:45 exactly (still a valid 15-minute mark)', () => {
    expect(computeDefaultTimedTimes(23, 45)).toEqual({ startTime: '23:45', endTime: '23:59' });
  });
});

import { VolleyballLog } from '../../api/model/volleyballLog';
import { volleyballKcalForDay } from '../../core/data/activity-kcal';
import { VOLLEYBALL_MAX_DURATION_MINUTES, VOLLEYBALL_NET_MET, volleyballKcal } from './volleyball-metrics';

function log(overrides: Partial<VolleyballLog> = {}): VolleyballLog {
  return { id: 'v1', date: '2026-10-17', durationMinutes: 90, deleted: false, ...overrides };
}

describe('volleyball-metrics', () => {
  it('uses the conservative fixed net MET (Compendium floor 3.0 gross − 1 resting)', () => {
    expect(VOLLEYBALL_NET_MET).toBe(2.0);
    expect(VOLLEYBALL_MAX_DURATION_MINUTES).toBe(240);
  });

  describe('volleyballKcal', () => {
    it('applies net MET × weight × minutes/60 (75 kg × 90 min = 225 kcal)', () => {
      expect(volleyballKcal({ durationMinutes: 90 }, 75)).toBeCloseTo(225, 6);
    });

    // backlog/163 "soha ne becsüljön felül": the self-rating must never raise the estimate.
    it('gives the same kcal for every intensity and for none', () => {
      const none = volleyballKcal(log({ intensity: null }), 75);
      for (const intensity of Object.values(VolleyballLog.IntensityEnum)) {
        expect(volleyballKcal(log({ intensity }), 75)).toBe(none);
      }
      expect(none).toBeCloseTo(225, 6);
    });

    it('clamps an over-cap duration to the cap', () => {
      expect(volleyballKcal({ durationMinutes: 900 }, 75)).toBeCloseTo(volleyballKcal({ durationMinutes: 240 }, 75), 6);
    });

    it('is 0 when the body weight is missing or non-positive', () => {
      expect(volleyballKcal({ durationMinutes: 60 }, null)).toBe(0);
      expect(volleyballKcal({ durationMinutes: 60 }, 0)).toBe(0);
    });

    it('is 0 when the duration is 0 or negative', () => {
      expect(volleyballKcal({ durationMinutes: 0 }, 75)).toBe(0);
      expect(volleyballKcal({ durationMinutes: -5 }, 75)).toBe(0);
    });
  });

  describe('volleyballKcalForDay', () => {
    it('sums only live logs on the given day', () => {
      const logs = [
        log({ id: 'a', durationMinutes: 60 }),
        log({ id: 'b', durationMinutes: 30 }),
        log({ id: 'c', durationMinutes: 60, deleted: true }),
        log({ id: 'd', durationMinutes: 60, date: '2026-10-16' }),
      ];
      expect(volleyballKcalForDay(logs, '2026-10-17', 80)).toBeCloseTo(2.0 * 80 * 1.5, 6);
    });
  });
});

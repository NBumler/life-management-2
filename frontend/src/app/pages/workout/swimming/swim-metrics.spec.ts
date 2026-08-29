import { SwimLog } from '../../../api/model/swimLog';
import { SWIM_MET, isOpenWater, swimDistanceMeters, swimKcal } from './swim-metrics';

describe('swim-metrics', () => {
  describe('SWIM_MET', () => {
    it('has a value for every intensity enum member', () => {
      for (const value of Object.values(SwimLog.IntensityEnum)) {
        expect(SWIM_MET[value]).toBeGreaterThan(0);
      }
    });

    it('matches the canonical table', () => {
      expect(SWIM_MET[SwimLog.IntensityEnum.Casual]).toBe(5.5);
      expect(SWIM_MET[SwimLog.IntensityEnum.Backstroke]).toBe(7.0);
      expect(SWIM_MET[SwimLog.IntensityEnum.CrawlFreestyle]).toBe(8.0);
      expect(SWIM_MET[SwimLog.IntensityEnum.OpenWater]).toBe(9.5);
      expect(SWIM_MET[SwimLog.IntensityEnum.Butterfly]).toBe(11.0);
      expect(SWIM_MET[SwimLog.IntensityEnum.Mixed]).toBe(5.5);
    });
  });

  describe('swimKcal', () => {
    it('applies MET × weight × minutes/60', () => {
      const kcal = swimKcal({ intensity: SwimLog.IntensityEnum.CrawlFreestyle, durationMinutes: 45 }, 80);
      expect(kcal).toBeCloseTo(8.0 * 80 * (45 / 60), 6);
    });

    it('is 0 when the body weight is missing or non-positive', () => {
      expect(swimKcal({ intensity: SwimLog.IntensityEnum.Casual, durationMinutes: 30 }, null)).toBe(0);
      expect(swimKcal({ intensity: SwimLog.IntensityEnum.Casual, durationMinutes: 30 }, 0)).toBe(0);
    });

    it('is 0 when the duration is 0 or negative', () => {
      expect(swimKcal({ intensity: SwimLog.IntensityEnum.Casual, durationMinutes: 0 }, 80)).toBe(0);
    });
  });

  describe('swimDistanceMeters', () => {
    it('multiplies pool length by lap count when both are present', () => {
      expect(swimDistanceMeters({ poolLengthMeters: 25, lapCount: 40, distanceMeters: 9999 })).toBe(1000);
    });

    it('falls back to the stored manual value when the pool fields are absent', () => {
      expect(swimDistanceMeters({ poolLengthMeters: null, lapCount: null, distanceMeters: 1800 })).toBe(1800);
    });

    it('is null when nothing is available', () => {
      expect(swimDistanceMeters({ poolLengthMeters: null, lapCount: null, distanceMeters: null })).toBeNull();
    });
  });

  describe('isOpenWater', () => {
    it('is true only for OPEN_WATER', () => {
      expect(isOpenWater(SwimLog.IntensityEnum.OpenWater)).toBe(true);
      expect(isOpenWater(SwimLog.IntensityEnum.Casual)).toBe(false);
    });
  });
});

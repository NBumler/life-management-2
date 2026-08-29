import { BikeRideLog } from '../../../api/model/bikeRideLog';
import { BIKE_MET, avgSpeedKmH, bikeKcal, suggestedIntensity } from './bike-metrics';

describe('bike-metrics', () => {
  describe('BIKE_MET', () => {
    it('has a value for every intensity enum member', () => {
      for (const value of Object.values(BikeRideLog.IntensityEnum)) {
        expect(BIKE_MET[value]).toBeGreaterThan(0);
      }
    });

    it('matches the canonical table', () => {
      expect(BIKE_MET[BikeRideLog.IntensityEnum.City]).toBe(4.0);
      expect(BIKE_MET[BikeRideLog.IntensityEnum.Stationary]).toBe(6.0);
      expect(BIKE_MET[BikeRideLog.IntensityEnum.RoadLeisure]).toBe(6.8);
      expect(BIKE_MET[BikeRideLog.IntensityEnum.MountainTrail]).toBe(8.5);
      expect(BIKE_MET[BikeRideLog.IntensityEnum.RoadVigorous]).toBe(10.0);
    });
  });

  describe('bikeKcal', () => {
    it('applies MET × weight × minutes/60', () => {
      const kcal = bikeKcal({ intensity: BikeRideLog.IntensityEnum.RoadVigorous, durationMinutes: 90 }, 80);
      expect(kcal).toBeCloseTo(10.0 * 80 * (90 / 60), 6);
    });

    it('is 0 when the body weight is missing or non-positive', () => {
      expect(bikeKcal({ intensity: BikeRideLog.IntensityEnum.City, durationMinutes: 30 }, null)).toBe(0);
      expect(bikeKcal({ intensity: BikeRideLog.IntensityEnum.City, durationMinutes: 30 }, 0)).toBe(0);
    });

    it('is 0 when the duration is 0 or negative', () => {
      expect(bikeKcal({ intensity: BikeRideLog.IntensityEnum.City, durationMinutes: 0 }, 80)).toBe(0);
    });
  });

  describe('avgSpeedKmH', () => {
    it('divides distance by hours', () => {
      expect(avgSpeedKmH({ distanceKm: 30, durationMinutes: 90 })).toBeCloseTo(20, 6);
    });

    it('is null when distance or duration is missing / non-positive', () => {
      expect(avgSpeedKmH({ distanceKm: null, durationMinutes: 60 })).toBeNull();
      expect(avgSpeedKmH({ distanceKm: 20, durationMinutes: 0 })).toBeNull();
      expect(avgSpeedKmH({ distanceKm: 0, durationMinutes: 60 })).toBeNull();
    });
  });

  describe('suggestedIntensity', () => {
    it('maps speed bands to the three road intensities', () => {
      expect(suggestedIntensity(12)).toBe(BikeRideLog.IntensityEnum.City);
      expect(suggestedIntensity(16)).toBe(BikeRideLog.IntensityEnum.RoadLeisure);
      expect(suggestedIntensity(22)).toBe(BikeRideLog.IntensityEnum.RoadLeisure);
      expect(suggestedIntensity(28)).toBe(BikeRideLog.IntensityEnum.RoadVigorous);
    });

    it('is null when the speed is unknown', () => {
      expect(suggestedIntensity(null)).toBeNull();
    });
  });
});

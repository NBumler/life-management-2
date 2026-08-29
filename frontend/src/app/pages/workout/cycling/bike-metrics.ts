/**
 * documentation/Features/Biciklizés napló.md — pure TS helpers for a bike ride log: MET kcal and the
 * UI-only average-speed hint. No DOM, no Angular. The MET constants are the canonical ones from
 * documentation/Features/Tápérték kalkulátor.md; `core/data/activity-kcal.ts` sums `bikeKcal` over a
 * day for the Étkezés dashboard's `activityExtraKcal`. Mirrors `swimming/swim-metrics.ts`.
 */
import { BikeRideLog } from '../../../api/model/bikeRideLog';

/** documentation/Features/Biciklizés napló.md "Kalória (kanonikus)": MET per intensity. */
export const BIKE_MET: Record<BikeRideLog.IntensityEnum, number> = {
  [BikeRideLog.IntensityEnum.City]: 4.0,
  [BikeRideLog.IntensityEnum.Stationary]: 6.0,
  [BikeRideLog.IntensityEnum.RoadLeisure]: 6.8,
  [BikeRideLog.IntensityEnum.MountainTrail]: 8.5,
  [BikeRideLog.IntensityEnum.RoadVigorous]: 10.0,
};

/** Fixed picker order — city → road by effort → MTB → indoor. */
export const BIKE_INTENSITIES: readonly BikeRideLog.IntensityEnum[] = [
  BikeRideLog.IntensityEnum.City,
  BikeRideLog.IntensityEnum.RoadLeisure,
  BikeRideLog.IntensityEnum.RoadVigorous,
  BikeRideLog.IntensityEnum.MountainTrail,
  BikeRideLog.IntensityEnum.Stationary,
];

/**
 * documentation/Features/Biciklizés napló.md canonical: kcal = MET(intensity) × m × durationMinutes / 60.
 * `m` is the CURRENT profile weight, never frozen into the log. Returns 0 when weight is
 * missing/non-positive or the duration is 0/negative. `distanceKm` / `elevationGainMeters` never enter.
 */
export function bikeKcal(
  log: Pick<BikeRideLog, 'intensity' | 'durationMinutes'>,
  bodyWeightKg: number | null,
): number {
  if (bodyWeightKg == null || bodyWeightKg <= 0) {
    return 0;
  }
  if (log.durationMinutes == null || log.durationMinutes <= 0) {
    return 0;
  }
  return BIKE_MET[log.intensity] * bodyWeightKg * (log.durationMinutes / 60);
}

/**
 * documentation/Features/Biciklizés napló.md "Átlagsebesség-hint (csak UI)": distanceKm / (durationMinutes / 60).
 * Null unless both are present and positive.
 */
export function avgSpeedKmH(
  log: { distanceKm: number | null | undefined; durationMinutes: number | null | undefined },
): number | null {
  if (log.distanceKm == null || log.distanceKm <= 0) {
    return null;
  }
  if (log.durationMinutes == null || log.durationMinutes <= 0) {
    return null;
  }
  return log.distanceKm / (log.durationMinutes / 60);
}

/**
 * documentation/Features/Biciklizés napló.md soft speed-based suggestion (never overrides the user's
 * pick): < 16 → CITY, 16–22 → ROAD_LEISURE, > 22 → ROAD_VIGOROUS. STATIONARY / MOUNTAIN_TRAIL have
 * no speed-based suggestion, so this only ever returns those three. Null when speed is unknown.
 */
export function suggestedIntensity(speedKmH: number | null): BikeRideLog.IntensityEnum | null {
  if (speedKmH == null) {
    return null;
  }
  if (speedKmH < 16) {
    return BikeRideLog.IntensityEnum.City;
  }
  if (speedKmH <= 22) {
    return BikeRideLog.IntensityEnum.RoadLeisure;
  }
  return BikeRideLog.IntensityEnum.RoadVigorous;
}

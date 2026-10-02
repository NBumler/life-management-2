import { ElevationProfilePoint } from '../../api/model/elevationProfilePoint';
import { polylineLengthMeters, resampleEvenly } from './geo-math';

/**
 * backlog/151 — distance / elevation gain-loss / duration estimate / elevation profile for a route,
 * computed on the device (Backend-offline first §14). Formerly the backend `RouteMetricsService`
 * behind `POST /api/tura/route-metrics`; the constants and the algorithm are carried over 1:1.
 *
 * The distance needs no input beyond the coordinates, so it is always computable. Everything that
 * depends on elevation is `null` when no elevation data is available (§14: a non-computable value is
 * shown as `~`, never stored as `0`).
 */

/** Elevation is looked up at this many points along the route, spread evenly by distance. */
export const PROFILE_SAMPLE_COUNT = 50;

/**
 * Elevation sources are noisy by a few metres even on flat ground; steps below this threshold do not
 * count towards gain / loss, otherwise a perfectly flat route would show a sizeable (fake) ascent.
 */
export const ELEVATION_NOISE_THRESHOLD_METERS = 2;

// Naismith's rule: 12 min/km base pace plus 1 minute per 10 m of ascent (600 m/h climbing rate).
export const MINUTES_PER_KILOMETER = 12;
export const METERS_ASCENT_PER_MINUTE = 10;

export interface RouteMetricsResult {
  distanceMeters: number;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  /** Needs the ascent (Naismith), so it is `null` together with the elevation fields. */
  estimatedDurationMinutes: number | null;
  profile: ElevationProfilePoint[] | null;
}

/** The points whose elevation `computeRouteMetrics` expects, as `[lon, lat, distanceFromStartMeters]`. */
export function routeMetricsSamples(coordinates: readonly (readonly number[])[]): [number, number, number][] {
  return resampleEvenly(coordinates, PROFILE_SAMPLE_COUNT);
}

/**
 * `elevations` must match `samples` one-to-one (or be `null` when unavailable). Throws on fewer than
 * two coordinates — a route needs a start and an end.
 */
export function computeRouteMetrics(
  coordinates: readonly (readonly number[])[],
  samples: readonly (readonly number[])[],
  elevations: readonly number[] | null,
): RouteMetricsResult {
  if (coordinates.length < 2) {
    throw new Error('Route needs at least 2 points');
  }
  const distanceMeters = polylineLengthMeters(coordinates);
  if (elevations === null || elevations.length !== samples.length || elevations.length === 0) {
    return { distanceMeters, elevationGainMeters: null, elevationLossMeters: null, estimatedDurationMinutes: null, profile: null };
  }

  let gain = 0;
  let loss = 0;
  let lastElevation = elevations[0];
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - lastElevation;
    if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD_METERS) {
      if (diff > 0) {
        gain += diff;
      } else {
        loss += -diff;
      }
      lastElevation = elevations[i];
    }
  }

  const durationMinutes = (distanceMeters / 1000) * MINUTES_PER_KILOMETER + gain / METERS_ASCENT_PER_MINUTE;
  const profile = samples.map((sample, i) => ({ distanceMeters: sample[2], elevationMeters: elevations[i] }));
  return {
    distanceMeters,
    elevationGainMeters: gain,
    elevationLossMeters: loss,
    estimatedDurationMinutes: Math.round(durationMinutes),
    profile,
  };
}

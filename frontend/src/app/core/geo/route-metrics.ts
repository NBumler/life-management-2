import { ElevationProfilePoint } from '../../api/model/elevationProfilePoint';
import { haversineMeters, polylineLengthMeters, resampleEvenly } from './geo-math';

/**
 * backlog/151 — distance / elevation gain-loss / duration estimate / elevation profile for a route,
 * computed on the device (Backend-offline first §14). Formerly the backend `RouteMetricsService`
 * behind `POST /api/tura/route-metrics`; the gain / loss algorithm and its constants are carried over
 * 1:1, the sampling is distance-based since backlog/176 (the backend still takes a fixed 50 samples).
 *
 * The distance needs no input beyond the coordinates, so it is always computable. Everything that
 * depends on elevation is `null` when no elevation data is available (§14: a non-computable value is
 * shown as `~`, never stored as `0`).
 */

/**
 * backlog/176 — elevation is looked up every this many metres along a line, for the hike route metrics
 * and the bike ride alike (one sampler, so the same line gives the same gain): dense enough for real
 * climbs, sparse enough to smooth GPS jitter on a recorded track.
 */
export const ELEVATION_SAMPLE_SPACING_METERS = 50;

/** Upper bound on the samples per line (100 km at the spacing above); a longer line is sampled more sparsely instead. */
export const MAX_ELEVATION_SAMPLES = 2000;

/** The elevation profile (chart) gets at most this many points, thinned from the elevation samples. */
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

/** backlog/188 — one day of a multi-day route: the route metrics without the chart. */
export type RouteDayMetrics = Omit<RouteMetricsResult, 'profile'>;

/**
 * The points whose elevation `computeRouteMetrics` expects, as `[lon, lat, distanceFromStartMeters]`:
 * one every `ELEVATION_SAMPLE_SPACING_METERS`, at least the two endpoints, at most `MAX_ELEVATION_SAMPLES`.
 */
export function elevationSamples(coordinates: readonly (readonly number[])[]): [number, number, number][] {
  const count = Math.ceil(polylineLengthMeters(coordinates) / ELEVATION_SAMPLE_SPACING_METERS) + 1;
  return resampleEvenly(coordinates, Math.min(MAX_ELEVATION_SAMPLES, Math.max(2, count)));
}

/** At most `PROFILE_SAMPLE_COUNT` evenly picked items, always keeping the first and the last. */
function thinForProfile<T>(items: readonly T[]): T[] {
  if (items.length <= PROFILE_SAMPLE_COUNT) {
    return [...items];
  }
  return Array.from({ length: PROFILE_SAMPLE_COUNT }, (_, k) => items[Math.round((k * (items.length - 1)) / (PROFILE_SAMPLE_COUNT - 1))]);
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
  for (const step of elevationSteps(elevations)) {
    if (step.diff > 0) {
      gain += step.diff;
    } else {
      loss -= step.diff;
    }
  }

  // gain / loss above come from every sample; the chart only needs a thinned series
  const profile = thinForProfile(samples.map((sample, i) => ({ distanceMeters: sample[2], elevationMeters: elevations[i] })));
  return {
    distanceMeters,
    elevationGainMeters: gain,
    elevationLossMeters: loss,
    estimatedDurationMinutes: naismithMinutes(distanceMeters, gain),
    profile,
  };
}

/**
 * backlog/188 — per-day metrics of a route split at `endIndexes` (each day's last coordinate index,
 * strictly increasing, the last one `coordinates.length - 1` — the `HikeRouteDay.endWaypointIndex`
 * contract). Uses the route's single sample series (`samples` / `elevations` exactly as for
 * `computeRouteMetrics`), so the noise filter runs once along the whole route and each counted step
 * goes to the day its sample lies in: the daily gains / losses add up exactly to the route's. The
 * per-day duration is Naismith on the day's own distance and gain, rounded per day.
 */
export function splitRouteMetrics(
  coordinates: readonly (readonly number[])[],
  samples: readonly (readonly number[])[],
  elevations: readonly number[] | null,
  endIndexes: readonly number[],
): RouteDayMetrics[] {
  const cumulative = cumulativeDistances(coordinates);
  const boundaries = endIndexes.map((index) => cumulative[index]);
  const hasElevation = elevations !== null && elevations.length === samples.length && elevations.length > 0;
  const gains = endIndexes.map(() => 0);
  const losses = endIndexes.map(() => 0);
  if (hasElevation) {
    let day = 0;
    for (const step of elevationSteps(elevations)) {
      const distance = samples[step.index][2];
      while (day < boundaries.length - 1 && distance > boundaries[day]) {
        day++;
      }
      if (step.diff > 0) {
        gains[day] += step.diff;
      } else {
        losses[day] -= step.diff;
      }
    }
  }
  return endIndexes.map((end, day) => {
    const distanceMeters = cumulative[end] - (day === 0 ? 0 : cumulative[endIndexes[day - 1]]);
    return hasElevation
      ? {
          distanceMeters,
          elevationGainMeters: gains[day],
          elevationLossMeters: losses[day],
          estimatedDurationMinutes: naismithMinutes(distanceMeters, gains[day]),
        }
      : { distanceMeters, elevationGainMeters: null, elevationLossMeters: null, estimatedDurationMinutes: null };
  });
}

/**
 * The elevation changes that count towards gain / loss: a step is counted (and becomes the new
 * reference) once it reaches `ELEVATION_NOISE_THRESHOLD_METERS` from the last counted elevation.
 * `index` is the sample at which the step is counted.
 */
function elevationSteps(elevations: readonly number[]): { index: number; diff: number }[] {
  const steps: { index: number; diff: number }[] = [];
  let lastElevation = elevations[0];
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - lastElevation;
    if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD_METERS) {
      steps.push({ index: i, diff });
      lastElevation = elevations[i];
    }
  }
  return steps;
}

/** Naismith: walking time for a distance and its ascent, in whole minutes. */
export function naismithMinutes(distanceMeters: number, gainMeters: number): number {
  return Math.round((distanceMeters / 1000) * MINUTES_PER_KILOMETER + gainMeters / METERS_ASCENT_PER_MINUTE);
}

/** Distance from the start to each coordinate, in metres (`[0, ..., polylineLengthMeters]`). */
function cumulativeDistances(coordinates: readonly (readonly number[])[]): number[] {
  const distances = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1];
    const b = coordinates[i];
    distances.push(distances[i - 1] + haversineMeters(a[0], a[1], b[0], b[1]));
  }
  return distances;
}

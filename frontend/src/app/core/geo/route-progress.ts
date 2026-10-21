import { ElevationProfilePoint } from '../../api/model/elevationProfilePoint';
import { haversineMeters } from './geo-math';
import {
  OFF_ROUTE_ENTER_METERS,
  OFF_ROUTE_EXIT_METERS,
  PROGRESS_SEARCH_AHEAD_METERS,
  PROGRESS_SEARCH_BACK_METERS,
} from './navigation-config';
import { ELEVATION_NOISE_THRESHOLD_METERS, naismithMinutes } from './route-metrics';

/**
 * backlog/106 — where the walker is along a planned route: the GPS fix projected onto the route line
 * (distance along it, distance off it) and what is left of the route from there. Pure, on-device maths
 * (Backend-offline first §14), so navigation works with no network at all.
 */

const METERS_PER_DEGREE_LAT = (Math.PI * 6_371_000) / 180;

/** A route line with its cumulative distances, computed once per navigation. */
export interface RouteLine {
  readonly coordinates: readonly (readonly number[])[];
  /** Distance from the start to each coordinate, in metres. */
  readonly cumulativeMeters: readonly number[];
  readonly totalMeters: number;
}

export interface RouteProjection {
  /** Distance from the route's start to the projected point, in metres. */
  distanceAlongMeters: number;
  /** Distance of the fix from the route line, in metres. */
  offsetMeters: number;
  /** The nearest point of the route line, `[lon, lat]`. */
  point: [number, number];
}

export interface RemainingRoute {
  distanceMeters: number;
  /** `null` when the route has no elevation data (shown as `~`, never `0` — §14). */
  elevationGainMeters: number | null;
  /** Naismith on the remaining distance and ascent; `null` together with the ascent. */
  durationMinutes: number | null;
}

export function routeLine(coordinates: readonly (readonly number[])[]): RouteLine {
  const cumulativeMeters = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1];
    const b = coordinates[i];
    cumulativeMeters.push(cumulativeMeters[i - 1] + haversineMeters(a[0], a[1], b[0], b[1]));
  }
  return { coordinates, cumulativeMeters, totalMeters: cumulativeMeters[cumulativeMeters.length - 1] };
}

/**
 * Nearest point of segment `a`–`b` to `point`, in a local equirectangular projection around `point`
 * (accurate at the scale of a route segment). `t` is the position along the segment, 0…1.
 */
export function projectOntoSegment(
  point: readonly number[],
  a: readonly number[],
  b: readonly number[],
): { t: number; distanceMeters: number; point: [number, number] } {
  const lonScale = METERS_PER_DEGREE_LAT * Math.cos((point[1] * Math.PI) / 180);
  const ax = (a[0] - point[0]) * lonScale;
  const ay = (a[1] - point[1]) * METERS_PER_DEGREE_LAT;
  const dx = (b[0] - a[0]) * lonScale;
  const dy = (b[1] - a[1]) * METERS_PER_DEGREE_LAT;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return {
    t,
    distanceMeters: Math.sqrt(cx * cx + cy * cy),
    point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
  };
}

/**
 * The fix projected onto the route. With `fromMeters` (the progress so far) only the stretch from
 * `PROGRESS_SEARCH_BACK_METERS` behind to `PROGRESS_SEARCH_AHEAD_METERS` ahead is searched, so on an
 * out-and-back or loop route the walker stays on the leg they are on. When nothing in that window is
 * within `OFF_ROUTE_ENTER_METERS` but some other part of the route is within `OFF_ROUTE_EXIT_METERS`
 * (a long GPS gap, a shortcut), the walker is re-located there. Of two equally near points the one
 * nearer the start wins (a loop's first fix belongs to its start, not its end).
 */
export function projectOntoRoute(line: RouteLine, point: readonly number[], fromMeters?: number): RouteProjection {
  if (line.coordinates.length === 1) {
    const only = line.coordinates[0];
    return { distanceAlongMeters: 0, offsetMeters: haversineMeters(only[0], only[1], point[0], point[1]), point: [only[0], only[1]] };
  }
  if (fromMeters === undefined) {
    return nearestOnRoute(line, point, 0, line.totalMeters);
  }
  const windowed = nearestOnRoute(line, point, fromMeters - PROGRESS_SEARCH_BACK_METERS, fromMeters + PROGRESS_SEARCH_AHEAD_METERS);
  if (windowed.offsetMeters <= OFF_ROUTE_ENTER_METERS) {
    return windowed;
  }
  const anywhere = nearestOnRoute(line, point, 0, line.totalMeters);
  return anywhere.offsetMeters <= OFF_ROUTE_EXIT_METERS ? anywhere : windowed;
}

function nearestOnRoute(line: RouteLine, point: readonly number[], fromMeters: number, toMeters: number): RouteProjection {
  let best: RouteProjection | null = null;
  for (let i = 0; i + 1 < line.coordinates.length; i++) {
    const startMeters = line.cumulativeMeters[i];
    const endMeters = line.cumulativeMeters[i + 1];
    if (endMeters < fromMeters || startMeters > toMeters) {
      continue;
    }
    const projected = projectOntoSegment(point, line.coordinates[i], line.coordinates[i + 1]);
    if (best === null || projected.distanceMeters < best.offsetMeters) {
      best = {
        distanceAlongMeters: startMeters + (endMeters - startMeters) * projected.t,
        offsetMeters: projected.distanceMeters,
        point: projected.point,
      };
    }
  }
  // the window always overlaps the route (progress lies on it), so `best` is set; the fallback is defensive
  return best ?? nearestOnRoute(line, point, 0, line.totalMeters);
}

/**
 * What is left from `progressMeters` to the end. The ascent comes from the route's saved (thinned)
 * elevation profile, scaled so that from the start it equals the saved `totalGainMeters` — the thinned
 * profile alone under-counts the climbs.
 */
export function remainingRoute(
  line: RouteLine,
  progressMeters: number,
  profile: readonly ElevationProfilePoint[] | null | undefined,
  totalGainMeters: number | null | undefined,
): RemainingRoute {
  const distanceMeters = Math.max(0, line.totalMeters - progressMeters);
  if (!profile || profile.length < 2 || totalGainMeters == null) {
    return { distanceMeters, elevationGainMeters: null, durationMinutes: null };
  }
  const profileGain = profileGainFrom(profile, 0);
  const rawGain = profileGainFrom(profile, progressMeters);
  const elevationGainMeters = Math.round(profileGain > 0 ? (rawGain * totalGainMeters) / profileGain : 0);
  return { distanceMeters, elevationGainMeters, durationMinutes: naismithMinutes(distanceMeters, elevationGainMeters) };
}

/** Ascent along the profile from `fromMeters` on, with the same noise threshold as the route metrics. */
function profileGainFrom(profile: readonly ElevationProfilePoint[], fromMeters: number): number {
  let index = profile.findIndex((sample) => sample.distanceMeters > fromMeters);
  if (index === -1) {
    return 0;
  }
  let lastElevation = index === 0 ? profile[0].elevationMeters : elevationAt(profile, fromMeters, index);
  let gain = 0;
  for (; index < profile.length; index++) {
    const diff = profile[index].elevationMeters - lastElevation;
    if (Math.abs(diff) >= ELEVATION_NOISE_THRESHOLD_METERS) {
      gain += Math.max(0, diff);
      lastElevation = profile[index].elevationMeters;
    }
  }
  return gain;
}

/** Linear interpolation between `profile[next - 1]` and `profile[next]`. */
function elevationAt(profile: readonly ElevationProfilePoint[], distanceMeters: number, next: number): number {
  const a = profile[next - 1];
  const b = profile[next];
  const span = b.distanceMeters - a.distanceMeters;
  const ratio = span === 0 ? 0 : (distanceMeters - a.distanceMeters) / span;
  return a.elevationMeters + (b.elevationMeters - a.elevationMeters) * ratio;
}

import { bboxOf, bboxesIntersect, expandBboxMeters, haversineMeters, isNearAnyLine, pointAtDistance } from './geo-math';
import {
  MIN_TURN_DEGREES,
  SHARP_TURN_MAX_DEGREES,
  SLIGHT_TURN_MAX_DEGREES,
  TURN_BEARING_SPAN_METERS,
  TURN_JUNCTION_RADIUS_METERS,
  TURN_MAX_DEGREES,
  TURN_MERGE_METERS,
  TURN_SIMPLIFY_TOLERANCE_METERS,
} from './navigation-config';
import { RouteLine, projectOntoSegment } from './route-progress';

/**
 * backlog/106 — turn-by-turn instructions from a planned route's geometry alone, so they work for any
 * saved route (auto-planned, manually drawn, adopted from the catalogue) and fully offline. When the
 * trail network along the route is known, turns on a trail are kept only at junctions — a hairpin on a
 * single trail needs no instruction.
 */

export type TurnDirection = 'SLIGHT_LEFT' | 'LEFT' | 'SHARP_LEFT' | 'SLIGHT_RIGHT' | 'RIGHT' | 'SHARP_RIGHT' | 'U_TURN';

export interface RouteTurn {
  /** Distance from the route's start to the turn, in metres. */
  distanceAlongMeters: number;
  point: [number, number];
  direction: TurnDirection;
  /** Signed change of direction, -180…180: negative = left, positive = right. */
  angleDegrees: number;
}

/** Initial bearing from `from` to `to`, 0…360 clockwise from north. */
export function bearingDegrees(from: readonly number[], to: readonly number[]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLon = toRad(to[0] - from[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** The signed change from bearing `inbound` to `outbound`, -180…180 (positive = clockwise = right). */
export function bearingChange(inbound: number, outbound: number): number {
  const change = (((outbound - inbound) % 360) + 540) % 360 - 180;
  return change === -180 ? 180 : change;
}

/** `null` below `MIN_TURN_DEGREES` (straight on). */
export function turnDirection(angleDegrees: number): TurnDirection | null {
  const size = Math.abs(angleDegrees);
  if (size < MIN_TURN_DEGREES) {
    return null;
  }
  if (size >= SHARP_TURN_MAX_DEGREES) {
    return 'U_TURN';
  }
  const left = angleDegrees < 0;
  if (size < SLIGHT_TURN_MAX_DEGREES) {
    return left ? 'SLIGHT_LEFT' : 'SLIGHT_RIGHT';
  }
  if (size < TURN_MAX_DEGREES) {
    return left ? 'LEFT' : 'RIGHT';
  }
  return left ? 'SHARP_LEFT' : 'SHARP_RIGHT';
}

/**
 * The turns along `line`, in route order. `trails` (the trail lines around the route, `[lon, lat]`
 * polylines as the trail-segment layer has them) turns on the junction filter; `null` = not known, every
 * turn is kept.
 */
export function routeTurns(line: RouteLine, trails: readonly (readonly (readonly number[])[])[] | null): RouteTurn[] {
  const coordinates = line.coordinates;
  if (coordinates.length < 3) {
    return [];
  }
  const nearbyTrails = trails === null ? null : trailsAround(coordinates, trails);
  const junctions = nearbyTrails === null ? null : trailJunctions(nearbyTrails);
  const candidates: RouteTurn[] = [];
  for (const index of simplifiedIndexes(coordinates, TURN_SIMPLIFY_TOLERANCE_METERS)) {
    const along = line.cumulativeMeters[index];
    if (along < TURN_BEARING_SPAN_METERS || along > line.totalMeters - TURN_BEARING_SPAN_METERS) {
      continue; // the start and the end are not turns
    }
    const vertex = coordinates[index];
    const before = pointAtDistance(coordinates, along - TURN_BEARING_SPAN_METERS);
    const after = pointAtDistance(coordinates, along + TURN_BEARING_SPAN_METERS);
    const angleDegrees = bearingChange(bearingDegrees(before, vertex), bearingDegrees(vertex, after));
    const direction = turnDirection(angleDegrees);
    if (direction === null) {
      continue;
    }
    if (nearbyTrails !== null && junctions !== null && !isTurnPoint(vertex, nearbyTrails, junctions)) {
      continue;
    }
    candidates.push({ distanceAlongMeters: along, point: [vertex[0], vertex[1]], direction, angleDegrees });
  }
  return mergeCloseTurns(candidates);
}

/** On a trail only at a junction; off every trail (a manually drawn stretch) always. */
function isTurnPoint(vertex: readonly number[], trails: readonly (readonly (readonly number[])[])[], junctions: readonly number[][]): boolean {
  if (!isNearAnyLine(vertex, trails, TURN_JUNCTION_RADIUS_METERS)) {
    return true;
  }
  return junctions.some((junction) => haversineMeters(vertex[0], vertex[1], junction[0], junction[1]) <= TURN_JUNCTION_RADIUS_METERS);
}

function trailsAround(
  coordinates: readonly (readonly number[])[],
  trails: readonly (readonly (readonly number[])[])[],
): (readonly (readonly number[])[])[] {
  const area = expandBboxMeters(bboxOf(coordinates), TURN_JUNCTION_RADIUS_METERS * 2);
  return trails.filter((trail) => trail.length > 0 && bboxesIntersect(bboxOf(trail), area));
}

/**
 * Points where three or more trail directions meet. The trail lines share their vertices at a crossing
 * (the on-device routing graph is built on exactly that), so a vertex with three or more distinct
 * neighbours across all lines is a junction.
 */
export function trailJunctions(trails: readonly (readonly (readonly number[])[])[]): number[][] {
  const key = (point: readonly number[]) => `${Math.round(point[0] * 1e6)},${Math.round(point[1] * 1e6)}`;
  const neighbours = new Map<string, { point: readonly number[]; keys: Set<string> }>();
  const link = (from: readonly number[], to: readonly number[]) => {
    const fromKey = key(from);
    const toKey = key(to);
    if (fromKey === toKey) {
      return;
    }
    let entry = neighbours.get(fromKey);
    if (entry === undefined) {
      entry = { point: from, keys: new Set() };
      neighbours.set(fromKey, entry);
    }
    entry.keys.add(toKey);
  };
  for (const trail of trails) {
    for (let i = 0; i + 1 < trail.length; i++) {
      link(trail[i], trail[i + 1]);
      link(trail[i + 1], trail[i]);
    }
  }
  return [...neighbours.values()].filter((entry) => entry.keys.size >= 3).map((entry) => [entry.point[0], entry.point[1]]);
}

/** Interior vertex indexes kept by Douglas–Peucker at `toleranceMeters` (iterative, no recursion depth limit). */
export function simplifiedIndexes(coordinates: readonly (readonly number[])[], toleranceMeters: number): number[] {
  const keep = new Set<number>();
  const stack: [number, number][] = [[0, coordinates.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let farthest = -1;
    let farthestDistance = toleranceMeters;
    for (let i = first + 1; i < last; i++) {
      const distance = projectOntoSegment(coordinates[i], coordinates[first], coordinates[last]).distanceMeters;
      if (distance > farthestDistance) {
        farthest = i;
        farthestDistance = distance;
      }
    }
    if (farthest !== -1) {
      keep.add(farthest);
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return [...keep].sort((a, b) => a - b);
}

/** Turns closer than `TURN_MERGE_METERS` collapse into the sharper one. */
function mergeCloseTurns(turns: readonly RouteTurn[]): RouteTurn[] {
  const merged: RouteTurn[] = [];
  for (const turn of turns) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && turn.distanceAlongMeters - previous.distanceAlongMeters < TURN_MERGE_METERS) {
      if (Math.abs(turn.angleDegrees) > Math.abs(previous.angleDegrees)) {
        merged[merged.length - 1] = turn;
      }
      continue;
    }
    merged.push(turn);
  }
  return merged;
}

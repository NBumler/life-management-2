/**
 * backlog/151 — shared, pure on-device geo maths (Backend-offline first §14: every user-facing
 * calculation is client-side pure TS). Coordinates are `[lon, lat]` pairs, as everywhere in the
 * tura feature (GeoJSON order). The planned bike tracker (backlog/150) builds on the same module.
 */

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Total length of a `[lon, lat]` polyline in metres. */
export function polylineLengthMeters(coordinates: readonly (readonly number[])[]): number {
  let distance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1];
    const b = coordinates[i];
    distance += haversineMeters(a[0], a[1], b[0], b[1]);
  }
  return distance;
}

/** `[lon, lat, distanceFromStartMeters]` of the point `targetDistanceMeters` along the polyline (linear interpolation within a segment). */
export function pointAtDistance(coordinates: readonly (readonly number[])[], targetDistanceMeters: number): [number, number, number] {
  let covered = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1];
    const b = coordinates[i];
    const segmentLength = haversineMeters(a[0], a[1], b[0], b[1]);
    if (covered + segmentLength >= targetDistanceMeters || i === coordinates.length - 1) {
      const ratio = segmentLength === 0 ? 0 : Math.min(1, (targetDistanceMeters - covered) / segmentLength);
      return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio, targetDistanceMeters];
    }
    covered += segmentLength;
  }
  const last = coordinates[coordinates.length - 1];
  return [last[0], last[1], targetDistanceMeters];
}

/**
 * backlog/151 — egy illesztett (snap-elt) útvonal eleje/vége a gráf legközelebbi éle, nem a kért
 * `start`/`end` pont — ez a legfeljebb `maxSnapDistanceMeters` (eddig 2 km) eltérést a pontos
 * kért pontra cseréli, hogy a térképen a tervezett vonal a kattintott ponttól induljon/érjen véget,
 * nem egy tőle néhány száz métert illesztett ponttól. Duplikátum végpontot nem told be (<0,1 m).
 */
export function withExactEndpoints(coordinates: readonly (readonly number[])[], start: readonly number[], end: readonly number[]): number[][] {
  const result: number[][] = [[start[0], start[1]]];
  for (const point of coordinates) {
    const last = result[result.length - 1];
    if (haversineMeters(last[0], last[1], point[0], point[1]) > 0.1) {
      result.push([point[0], point[1]]);
    }
  }
  const last = result[result.length - 1];
  if (haversineMeters(last[0], last[1], end[0], end[1]) > 0.1) {
    result.push([end[0], end[1]]);
  }
  return result;
}

/**
 * `count` points spread evenly by distance along the polyline, as `[lon, lat, distanceFromStartMeters]`
 * — independent of the raw vertex count, so a long two-point line gets as dense a sampling as a
 * many-vertex auto-route. A zero-length line repeats its first point.
 */
export function resampleEvenly(coordinates: readonly (readonly number[])[], count: number): [number, number, number][] {
  const total = polylineLengthMeters(coordinates);
  const samples: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (total === 0) {
      samples.push([coordinates[0][0], coordinates[0][1], 0]);
    } else {
      samples.push(pointAtDistance(coordinates, (total * i) / (count - 1)));
    }
  }
  return samples;
}

/** Bounding box in `[minLon, minLat, maxLon, maxLat]` order (GeoJSON `bbox` order). */
export type LonLatBbox = readonly [number, number, number, number];

const METERS_PER_DEGREE_LAT = (Math.PI * EARTH_RADIUS_METERS) / 180;

/** The smallest bbox containing every `[lon, lat]` point. */
export function bboxOf(coordinates: readonly (readonly number[])[]): LonLatBbox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coordinates) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLon, minLat, maxLon, maxLat];
}

/** Edge-touching boxes count as intersecting. */
export function bboxesIntersect(a: LonLatBbox, b: LonLatBbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** `bbox` grown by `meters` on every side (the longitude margin is scaled at the box's centre latitude). */
export function expandBboxMeters(bbox: LonLatBbox, meters: number): LonLatBbox {
  const dLat = meters / METERS_PER_DEGREE_LAT;
  const centreLat = (bbox[1] + bbox[3]) / 2;
  const dLon = meters / (METERS_PER_DEGREE_LAT * Math.max(0.01, Math.cos((centreLat * Math.PI) / 180)));
  return [bbox[0] - dLon, bbox[1] - dLat, bbox[2] + dLon, bbox[3] + dLat];
}

/** `bbox` grown by `fraction` of its own width / height on every side. */
export function expandBboxFraction(bbox: LonLatBbox, fraction: number): LonLatBbox {
  const dLon = (bbox[2] - bbox[0]) * fraction;
  const dLat = (bbox[3] - bbox[1]) * fraction;
  return [bbox[0] - dLon, bbox[1] - dLat, bbox[2] + dLon, bbox[3] + dLat];
}

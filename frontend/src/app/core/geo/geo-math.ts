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

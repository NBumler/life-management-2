import {
  bboxOf,
  bboxesIntersect,
  expandBboxFraction,
  expandBboxMeters,
  haversineMeters,
  pointAtDistance,
  polylineLengthMeters,
  resampleEvenly,
  withExactEndpoints,
} from './geo-math';

describe('geo-math', () => {
  it('haversineMeters: ~1112 m for 0.01° of latitude in Hungary', () => {
    expect(haversineMeters(19.0, 47.0, 19.0, 47.01)).toBeCloseTo(1112, -1);
  });

  it('haversineMeters: zero for the same point', () => {
    expect(haversineMeters(19.0, 47.0, 19.0, 47.0)).toBe(0);
  });

  it('polylineLengthMeters: sums the segments; a single point is 0', () => {
    const a = [19.0, 47.0];
    const b = [19.0, 47.01];
    const c = [19.0, 47.02];
    expect(polylineLengthMeters([a, b, c])).toBeCloseTo(2 * haversineMeters(19.0, 47.0, 19.0, 47.01), 6);
    expect(polylineLengthMeters([a])).toBe(0);
  });

  it('pointAtDistance: interpolates inside the right segment and clamps past the end', () => {
    const line = [
      [19.0, 47.0],
      [19.0, 47.02],
    ];
    const total = polylineLengthMeters(line);
    const [lon, lat, distance] = pointAtDistance(line, total / 2);
    expect(lon).toBeCloseTo(19.0, 9);
    expect(lat).toBeCloseTo(47.01, 6);
    expect(distance).toBe(total / 2);
    expect(pointAtDistance(line, total * 2).slice(0, 2)).toEqual([19.0, 47.02]);
  });

  it('resampleEvenly: count points from start to end, evenly by distance', () => {
    const line = [
      [19.0, 47.0],
      [19.0, 47.04],
    ];
    const samples = resampleEvenly(line, 5);
    expect(samples.length).toBe(5);
    expect(samples[0]).toEqual([19.0, 47.0, 0]);
    expect(samples[4][1]).toBeCloseTo(47.04, 9);
    expect(samples[2][1]).toBeCloseTo(47.02, 6);
  });

  it('withExactEndpoints: replaces the snapped first/last point with the exact requested one', () => {
    const snapped = [
      [19.0001, 47.0], // az illesztett él egy pontja, nem a kért start
      [19.005, 47.0],
      [19.0099, 47.0], // az illesztett él egy pontja, nem a kért end
    ];
    const result = withExactEndpoints(snapped, [19.0, 47.0], [19.01, 47.0]);

    expect(result[0]).toEqual([19.0, 47.0]);
    expect(result[result.length - 1]).toEqual([19.01, 47.0]);
    expect(result).toEqual([
      [19.0, 47.0],
      [19.0001, 47.0],
      [19.005, 47.0],
      [19.0099, 47.0],
      [19.01, 47.0],
    ]);
  });

  it('withExactEndpoints: does not duplicate a point already within 0.1 m of the requested endpoint', () => {
    const start = [19.0, 47.0];
    const end = [19.01, 47.0];
    const result = withExactEndpoints([start, [19.005, 47.0], end], start, end);

    expect(result).toEqual([start, [19.005, 47.0], end]);
  });

  it('resampleEvenly: a zero-length line repeats its first point', () => {
    const samples = resampleEvenly(
      [
        [19.0, 47.0],
        [19.0, 47.0],
      ],
      3,
    );
    expect(samples).toEqual([
      [19.0, 47.0, 0],
      [19.0, 47.0, 0],
      [19.0, 47.0, 0],
    ]);
  });
  it('bboxOf: min / max of every point', () => {
    expect(bboxOf([[19.1, 47.2], [19.0, 47.3], [19.2, 47.1]])).toEqual([19.0, 47.1, 19.2, 47.3]);
  });

  it('bboxesIntersect: overlapping and edge-touching boxes intersect, separate ones do not', () => {
    expect(bboxesIntersect([0, 0, 1, 1], [0.5, 0.5, 2, 2])).toBeTrue();
    expect(bboxesIntersect([0, 0, 1, 1], [1, 0, 2, 1])).toBeTrue();
    expect(bboxesIntersect([0, 0, 1, 1], [1.1, 0, 2, 1])).toBeFalse();
    expect(bboxesIntersect([0, 0, 1, 1], [0, 1.1, 1, 2])).toBeFalse();
  });

  it('expandBboxMeters: ~1112 m is 0.01° of latitude, and more degrees of longitude at 47° N', () => {
    const [minLon, minLat, maxLon, maxLat] = expandBboxMeters([19.0, 47.0, 19.0, 47.0], 1112);
    expect(maxLat - 47.0).toBeCloseTo(0.01, 4);
    expect(47.0 - minLat).toBeCloseTo(0.01, 4);
    expect(maxLon - 19.0).toBeCloseTo(0.01 / Math.cos((47 * Math.PI) / 180), 4);
    expect(19.0 - minLon).toBeCloseTo(maxLon - 19.0, 10);
  });

  it('expandBboxFraction: grows by the given share of the width and height', () => {
    expect(expandBboxFraction([0, 0, 2, 1], 0.5)).toEqual([-1, -0.5, 3, 1.5]);
  });
});

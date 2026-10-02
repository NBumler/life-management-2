import { haversineMeters, pointAtDistance, polylineLengthMeters, resampleEvenly } from './geo-math';

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
});

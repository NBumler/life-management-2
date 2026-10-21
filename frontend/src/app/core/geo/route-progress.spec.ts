import { projectOntoRoute, remainingRoute, routeLine } from './route-progress';
import { naismithMinutes } from './route-metrics';

/** `[lon, lat]` of a point `x` metres east and `y` metres north of a reference point in Hungary. */
function at(x: number, y: number): [number, number] {
  const metersPerDegreeLat = (Math.PI * 6_371_000) / 180;
  return [19 + x / (metersPerDegreeLat * Math.cos((47.5 * Math.PI) / 180)), 47.5 + y / metersPerDegreeLat];
}

describe('route-progress (backlog/106)', () => {
  // 1 km due north
  const straight = routeLine([at(0, 0), at(0, 500), at(0, 1000)]);

  it('routeLine: cumulative distances and the total', () => {
    expect(straight.cumulativeMeters[0]).toBe(0);
    expect(straight.cumulativeMeters[1]).toBeCloseTo(500, 0);
    expect(straight.totalMeters).toBeCloseTo(1000, 0);
  });

  it('projectOntoRoute: distance along the line and the sideways offset', () => {
    const projection = projectOntoRoute(straight, at(20, 300));
    expect(projection.distanceAlongMeters).toBeCloseTo(300, 0);
    expect(projection.offsetMeters).toBeCloseTo(20, 0);
  });

  it('projectOntoRoute: past the end clamps to the end', () => {
    const projection = projectOntoRoute(straight, at(0, 1100));
    expect(projection.distanceAlongMeters).toBeCloseTo(1000, 0);
    expect(projection.offsetMeters).toBeCloseTo(100, 0);
  });

  describe('out-and-back route (the same path twice)', () => {
    // 500 m north, then back along a line 5 m to the east
    const outAndBack = routeLine([at(0, 0), at(0, 500), at(5, 500), at(5, 0)]);

    it('without progress the nearest leg wins', () => {
      expect(projectOntoRoute(outAndBack, at(1, 200)).distanceAlongMeters).toBeCloseTo(200, 0);
    });

    it('with progress on the way back, the walker stays on the way back', () => {
      const projection = projectOntoRoute(outAndBack, at(2, 200), 780);
      expect(projection.distanceAlongMeters).toBeCloseTo(805, 0);
    });
  });

  it('after a long gap the walker is re-located further along the route', () => {
    const long = routeLine([at(0, 0), at(0, 2000), at(0, 5000)]);
    expect(projectOntoRoute(long, at(0, 4000), 100).distanceAlongMeters).toBeCloseTo(4000, 0);
  });

  it('far from the whole route, the window match stays (no jump to an equally far point)', () => {
    const long = routeLine([at(0, 0), at(0, 2000), at(0, 5000)]);
    const projection = projectOntoRoute(long, at(300, 4000), 100);
    expect(projection.distanceAlongMeters).toBeCloseTo(2000, 0);
    expect(projection.offsetMeters).toBeGreaterThan(300);
  });

  describe('remainingRoute', () => {
    const profile = [
      { distanceMeters: 0, elevationMeters: 100 },
      { distanceMeters: 500, elevationMeters: 150 },
      { distanceMeters: 1000, elevationMeters: 200 },
    ];

    it('without elevation data only the distance is known', () => {
      expect(remainingRoute(straight, 400, null, null)).toEqual({
        distanceMeters: straight.totalMeters - 400,
        elevationGainMeters: null,
        durationMinutes: null,
      });
    });

    it('the ascent left from the middle, scaled to the saved total', () => {
      // the thinned profile climbs 100 m, the saved total says 120 m → factor 1.2
      const remaining = remainingRoute(straight, 500, profile, 120);
      expect(remaining.elevationGainMeters).toBe(60);
      expect(remaining.durationMinutes).toBe(naismithMinutes(remaining.distanceMeters, 60));
    });

    it('between two profile points the climb is interpolated', () => {
      expect(remainingRoute(straight, 750, profile, 100).elevationGainMeters).toBe(25);
    });

    it('at the end nothing is left', () => {
      expect(remainingRoute(straight, 1000, profile, 100)).toEqual(jasmine.objectContaining({ elevationGainMeters: 0, durationMinutes: 0 }));
    });
  });
});

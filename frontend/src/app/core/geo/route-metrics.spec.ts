import { PROFILE_SAMPLE_COUNT, computeRouteMetrics, routeMetricsSamples } from './route-metrics';

/**
 * backlog/151 — the on-device port of the backend `RouteMetricsService`; these cases mirror
 * `RouteMetricsServiceTest` (flat route, alternating ascent, sub-threshold noise, too few points)
 * plus the new "no elevation data" branch.
 */
describe('route-metrics', () => {
  const short = [
    [19.0, 47.0],
    [19.0, 47.01],
  ];
  const longer = [
    [19.0, 47.0],
    [19.0, 47.02],
  ];

  it('samples PROFILE_SAMPLE_COUNT points along the route', () => {
    expect(routeMetricsSamples(short).length).toBe(PROFILE_SAMPLE_COUNT);
  });

  it('computes distance and a flat profile for a route with no elevation change', () => {
    const samples = routeMetricsSamples(short);
    const metrics = computeRouteMetrics(
      short,
      samples,
      samples.map(() => 500),
    );

    expect(metrics.distanceMeters).toBeCloseTo(1112, -1);
    expect(metrics.elevationGainMeters).toBe(0);
    expect(metrics.elevationLossMeters).toBe(0);
    expect(metrics.profile?.length).toBe(PROFILE_SAMPLE_COUNT);
    expect(metrics.profile?.[0]).toEqual({ distanceMeters: 0, elevationMeters: 500 });
    // Naismith with no ascent: 12 min/km.
    expect(metrics.estimatedDurationMinutes).toBe(Math.round((metrics.distanceMeters / 1000) * 12));
  });

  it('accumulates gain and loss for steps above the noise threshold, and adds ascent time', () => {
    const samples = routeMetricsSamples(longer);
    const metrics = computeRouteMetrics(
      longer,
      samples,
      samples.map((_, i) => (i % 2 === 0 ? 100 : 105)),
    );

    expect(metrics.elevationGainMeters).toBeGreaterThan(0);
    expect(metrics.elevationLossMeters).toBeGreaterThan(0);
    const baseMinutes = (metrics.distanceMeters / 1000) * 12;
    expect(metrics.estimatedDurationMinutes).toBe(Math.round(baseMinutes + (metrics.elevationGainMeters ?? 0) / 10));
  });

  it('ignores sub-threshold noise (flat route)', () => {
    const samples = routeMetricsSamples(longer);
    const metrics = computeRouteMetrics(
      longer,
      samples,
      samples.map((_, i) => (i % 2 === 0 ? 200 : 200.9)),
    );

    expect(metrics.elevationGainMeters).toBe(0);
    expect(metrics.elevationLossMeters).toBe(0);
  });

  it('without elevation data: distance is still computed, everything elevation-dependent is null (never 0)', () => {
    const metrics = computeRouteMetrics(short, routeMetricsSamples(short), null);

    expect(metrics.distanceMeters).toBeCloseTo(1112, -1);
    expect(metrics.elevationGainMeters).toBeNull();
    expect(metrics.elevationLossMeters).toBeNull();
    expect(metrics.estimatedDurationMinutes).toBeNull();
    expect(metrics.profile).toBeNull();
  });

  it('treats an elevation list of the wrong length as unavailable', () => {
    const metrics = computeRouteMetrics(short, routeMetricsSamples(short), [100, 200]);
    expect(metrics.elevationGainMeters).toBeNull();
  });

  it('rejects fewer than two points', () => {
    expect(() => computeRouteMetrics([[19.0, 47.0]], [], null)).toThrowError();
  });
});

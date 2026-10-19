import { polylineLengthMeters, resampleEvenly } from './geo-math';
import {
  ELEVATION_SAMPLE_SPACING_METERS,
  MAX_ELEVATION_SAMPLES,
  PROFILE_SAMPLE_COUNT,
  computeRouteMetrics,
  elevationSamples,
  splitRouteMetrics,
} from './route-metrics';

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

  it('samples every ELEVATION_SAMPLE_SPACING_METERS along the route (backlog/176)', () => {
    const samples = elevationSamples(short); // ~1112 m
    expect(samples.length).toBe(Math.ceil(polylineLengthMeters(short) / ELEVATION_SAMPLE_SPACING_METERS) + 1);
    expect(samples[1][2] - samples[0][2]).toBeLessThanOrEqual(ELEVATION_SAMPLE_SPACING_METERS);
    expect(samples[samples.length - 1][2]).toBeCloseTo(polylineLengthMeters(short), 0);
  });

  it('a tiny line still gets both endpoints; a very long one is capped at MAX_ELEVATION_SAMPLES', () => {
    expect(elevationSamples([[19.0, 47.0], [19.0, 47.0001]]).length).toBe(2);
    expect(elevationSamples([[16.0, 46.0], [23.0, 48.5]]).length).toBe(MAX_ELEVATION_SAMPLES);
  });

  it('computes distance and a flat profile for a route with no elevation change', () => {
    const samples = elevationSamples(short);
    const metrics = computeRouteMetrics(
      short,
      samples,
      samples.map(() => 500),
    );

    expect(metrics.distanceMeters).toBeCloseTo(1112, -1);
    expect(metrics.elevationGainMeters).toBe(0);
    expect(metrics.elevationLossMeters).toBe(0);
    expect(metrics.profile?.length).toBe(samples.length); // under PROFILE_SAMPLE_COUNT: nothing to thin
    expect(metrics.profile?.[0]).toEqual({ distanceMeters: 0, elevationMeters: 500 });
    // Naismith with no ascent: 12 min/km.
    expect(metrics.estimatedDurationMinutes).toBe(Math.round((metrics.distanceMeters / 1000) * 12));
  });

  it('accumulates gain and loss for steps above the noise threshold, and adds ascent time', () => {
    const samples = elevationSamples(longer);
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
    const samples = elevationSamples(longer);
    const metrics = computeRouteMetrics(
      longer,
      samples,
      samples.map((_, i) => (i % 2 === 0 ? 200 : 200.9)),
    );

    expect(metrics.elevationGainMeters).toBe(0);
    expect(metrics.elevationLossMeters).toBe(0);
  });

  it('without elevation data: distance is still computed, everything elevation-dependent is null (never 0)', () => {
    const metrics = computeRouteMetrics(short, elevationSamples(short), null);

    expect(metrics.distanceMeters).toBeCloseTo(1112, -1);
    expect(metrics.elevationGainMeters).toBeNull();
    expect(metrics.elevationLossMeters).toBeNull();
    expect(metrics.estimatedDurationMinutes).toBeNull();
    expect(metrics.profile).toBeNull();
  });

  it('treats an elevation list of the wrong length as unavailable', () => {
    const metrics = computeRouteMetrics(short, elevationSamples(short), [100, 200]);
    expect(metrics.elevationGainMeters).toBeNull();
  });

  it('the profile is thinned to PROFILE_SAMPLE_COUNT points, keeping both ends; the gain uses every sample', () => {
    const route = [
      [19.0, 47.0],
      [19.0, 47.1],
    ]; // ~11 km → ~224 samples
    const samples = elevationSamples(route);
    const metrics = computeRouteMetrics(route, samples, samples.map((_, i) => 100 + i * 3));

    expect(samples.length).toBeGreaterThan(PROFILE_SAMPLE_COUNT);
    expect(metrics.profile?.length).toBe(PROFILE_SAMPLE_COUNT);
    expect(metrics.profile?.[0].distanceMeters).toBe(0);
    expect(metrics.profile?.[PROFILE_SAMPLE_COUNT - 1].distanceMeters).toBeCloseTo(samples[samples.length - 1][2], 6);
    expect(metrics.elevationGainMeters).toBeCloseTo((samples.length - 1) * 3, 6);
  });

  it('on a long rolling route the distance-based sampling sees the climbs a fixed 50 samples smooth away', () => {
    const route = [
      [19.0, 47.0],
      [19.0, 47.18],
    ]; // ~20 km of 10 m hills every 500 m → ~800 m of real ascent
    const hills = (samples: readonly number[][]) => samples.map((s) => 10 * Math.sin((2 * Math.PI * s[2]) / 500));
    const dense = elevationSamples(route);
    const sparse = resampleEvenly(route, 50); // the pre-#176 sampling

    const denseGain = computeRouteMetrics(route, dense, hills(dense)).elevationGainMeters ?? 0;
    const sparseGain = computeRouteMetrics(route, sparse, hills(sparse)).elevationGainMeters ?? 0;
    expect(denseGain).toBeGreaterThan(700);
    expect(denseGain).toBeGreaterThan(sparseGain * 2);
  });

  it('rejects fewer than two points', () => {
    expect(() => computeRouteMetrics([[19.0, 47.0]], [], null)).toThrowError();
  });

  describe('splitRouteMetrics (backlog/188)', () => {
    // ~3.3 km due north, split after the 2nd coordinate (~1.1 km) into two days
    const route = [
      [19.0, 47.0],
      [19.0, 47.01],
      [19.0, 47.02],
      [19.0, 47.03],
    ];
    const samples = elevationSamples(route);
    // a slow climb in 1.5 m steps (below the noise threshold one by one), then a descent with jitter
    const elevations = samples.map((_, i) => (i < samples.length / 2 ? 200 + 1.5 * i : 200 + 1.5 * (samples.length - i)) + (i % 3 === 0 ? 0.8 : 0));

    it('the daily gains and losses add up exactly to the route totals', () => {
      const total = computeRouteMetrics(route, samples, elevations);
      const days = splitRouteMetrics(route, samples, elevations, [1, 3]);

      expect(days.length).toBe(2);
      expect(days[0].elevationGainMeters! + days[1].elevationGainMeters!).toBe(total.elevationGainMeters!);
      expect(days[0].elevationLossMeters! + days[1].elevationLossMeters!).toBe(total.elevationLossMeters!);
      expect(days[0].distanceMeters + days[1].distanceMeters).toBeCloseTo(total.distanceMeters, 6);
    });

    it('unlike restarting the noise filter at the break (the old per-day computation)', () => {
      const total = computeRouteMetrics(route, samples, elevations);
      const breakDistance = polylineLengthMeters(route.slice(0, 2));
      const split = samples.findIndex((sample) => sample[2] > breakDistance);
      const gainOf = (from: number, to: number) =>
        computeRouteMetrics(route, samples.slice(from, to), elevations.slice(from, to)).elevationGainMeters!;
      expect(gainOf(0, split) + gainOf(split - 1, samples.length)).not.toBe(total.elevationGainMeters!);
    });

    it('each day gets its own distance and Naismith duration', () => {
      const days = splitRouteMetrics(route, samples, elevations, [1, 3]);
      expect(days[0].distanceMeters).toBeCloseTo(polylineLengthMeters(route.slice(0, 2)), 6);
      expect(days[1].distanceMeters).toBeCloseTo(polylineLengthMeters(route.slice(1)), 6);
      expect(days[0].estimatedDurationMinutes).toBe(
        Math.round((days[0].distanceMeters / 1000) * 12 + days[0].elevationGainMeters! / 10),
      );
    });

    it('a flat route splits into flat days', () => {
      const flat = samples.map(() => 150);
      const days = splitRouteMetrics(route, samples, flat, [2, 3]);
      expect(days.map((day) => day.elevationGainMeters)).toEqual([0, 0]);
      expect(days.map((day) => day.elevationLossMeters)).toEqual([0, 0]);
    });

    it('without elevation data every day keeps its distance, the rest is null', () => {
      const days = splitRouteMetrics(route, samples, null, [1, 3]);
      expect(days[0].distanceMeters).toBeGreaterThan(0);
      expect(days.every((day) => day.elevationGainMeters === null && day.elevationLossMeters === null && day.estimatedDurationMinutes === null)).toBeTrue();
    });
  });
});

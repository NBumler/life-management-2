import { Injectable, inject, signal } from '@angular/core';

import { ElevationService } from '../geo/elevation.service';
import { RouteDayMetrics, RouteMetricsResult, computeRouteMetrics, elevationSamples, splitRouteMetrics } from '../geo/route-metrics';

/**
 * backlog/tura-utvonaltervezo/103-... 2.3 fázis; backlog/151 — route metrics are computed on the
 * device (`core/geo/route-metrics.ts`), not by the backend. The distance is always available; the
 * elevation-dependent fields need elevation data, fetched directly from an external API — when that
 * fails (no internet), they are `null` and the UI shows `~`. Stateless computation, not a persisted /
 * synced entity — the `TuraPage` decides when to ask and what to do with the result.
 */
@Injectable({ providedIn: 'root' })
export class RouteMetricsRepository {
  private readonly elevation = inject(ElevationService);
  readonly loading = signal(false);

  async compute(coordinates: readonly number[][]): Promise<RouteMetricsResult> {
    return (await this.computeWithDays(coordinates, [])).route;
  }

  /**
   * backlog/188 — the route metrics plus per-day metrics split at `endIndexes` (see
   * `splitRouteMetrics`), from one elevation lookup, so the daily gains / losses add up exactly to the
   * route's. An empty `endIndexes` gives no days.
   */
  async computeWithDays(
    coordinates: readonly number[][],
    endIndexes: readonly number[],
  ): Promise<{ route: RouteMetricsResult; days: RouteDayMetrics[] }> {
    this.loading.set(true);
    try {
      const samples = elevationSamples(coordinates);
      let elevations: number[] | null;
      try {
        elevations = await this.elevation.fetchElevations(samples);
      } catch {
        elevations = null;
      }
      return {
        route: computeRouteMetrics(coordinates, samples, elevations),
        days: endIndexes.length === 0 ? [] : splitRouteMetrics(coordinates, samples, elevations, endIndexes),
      };
    } finally {
      this.loading.set(false);
    }
  }
}

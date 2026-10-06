import { Injectable, inject, signal } from '@angular/core';

import { ElevationService } from '../geo/elevation.service';
import { RouteMetricsResult, computeRouteMetrics, routeMetricsSamples } from '../geo/route-metrics';

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
    this.loading.set(true);
    try {
      const samples = routeMetricsSamples(coordinates);
      let elevations: number[] | null;
      try {
        elevations = await this.elevation.fetchElevations(samples);
      } catch {
        elevations = null;
      }
      return computeRouteMetrics(coordinates, samples, elevations);
    } finally {
      this.loading.set(false);
    }
  }
}

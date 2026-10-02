import { Injectable } from '@angular/core';

/**
 * backlog/151 — elevation for `[lon, lat]` points from the free, key-less Open-Meteo elevation API
 * (https://open-meteo.com/en/docs/elevation-api), called **directly from the client** — Backend-offline
 * first §13: external integrations are never proxied through the own backend, so this works in
 * `BACKEND_OFFLINE` too, as long as there is internet. `FULL_OFFLINE` → the call fails and the caller
 * falls back to "elevation unknown". Replaced by an on-device DEM once the backlog/150 geo asset
 * package is approved.
 */
const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation';

/** The request URL length is bounded; points are sent in batches of this size. */
const BATCH_SIZE = 100;

/** Backend-offline first §13: mandatory 8 s timeout on every external call. */
export const EXTERNAL_CALL_TIMEOUT_MS = 8_000;

@Injectable({ providedIn: 'root' })
export class OpenMeteoElevationService {
  /** Elevations in metres, in the same order as `points`. Rejects on any network / shape error. */
  async fetchElevations(points: readonly (readonly number[])[]): Promise<number[]> {
    const elevations: number[] = [];
    for (let start = 0; start < points.length; start += BATCH_SIZE) {
      elevations.push(...(await this.fetchBatch(points.slice(start, start + BATCH_SIZE))));
    }
    return elevations;
  }

  private async fetchBatch(batch: readonly (readonly number[])[]): Promise<number[]> {
    const latitudes = batch.map((point) => point[1]).join(',');
    const longitudes = batch.map((point) => point[0]).join(',');
    const response = await fetch(`${ELEVATION_URL}?latitude=${latitudes}&longitude=${longitudes}`, {
      signal: AbortSignal.timeout(EXTERNAL_CALL_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Elevation lookup failed: ${response.status}`);
    }
    const body = (await response.json()) as { elevation?: unknown };
    const elevation = body.elevation;
    if (!Array.isArray(elevation) || elevation.length !== batch.length || !elevation.every((value) => typeof value === 'number')) {
      throw new Error('Unexpected elevation API response shape');
    }
    return elevation as number[];
  }
}

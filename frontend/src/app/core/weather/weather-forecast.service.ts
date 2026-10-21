import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { OpenMeteoForecastService } from './open-meteo-forecast.service';
import { WeatherForecast } from './weather-forecast';

/** A forecast younger than this is used as is, without a new request. */
export const FORECAST_FRESH_MS = 60 * 60_000;

/** Points this close (degrees, ~5 km) share one stored forecast: the model grid is coarser anyway. */
export const FORECAST_GRID_DEGREES = 0.05;

/** How many places keep their last known forecast on the device. */
export const FORECAST_CACHE_SIZE = 8;

const CACHE_KEY = 'lm2_weather_forecasts';

/**
 * What the UI gets: the forecast and whether it is the last known one because the refresh failed
 * (`stale`). `null`: nothing known for that place yet and no connection.
 */
export interface ForecastResult {
  readonly forecast: WeatherForecast;
  readonly stale: boolean;
}

interface CacheEntry {
  key: string;
  forecast: WeatherForecast;
}

/**
 * backlog/109 — the forecast for a point, with the last known one kept device-locally
 * (`@capacitor/preferences`, never an outbox row, never synced): FULL_OFFLINE shows that, with its age,
 * instead of an empty field. Requests for the same place are shared while one is running.
 */
@Injectable({ providedIn: 'root' })
export class WeatherForecastService {
  private readonly api = inject(OpenMeteoForecastService);
  private readonly running = new Map<string, Promise<ForecastResult | null>>();

  forecastFor(latitude: number, longitude: number, options: { force?: boolean } = {}): Promise<ForecastResult | null> {
    const key = gridKey(latitude, longitude);
    const pending = this.running.get(key);
    if (pending) {
      return pending;
    }
    const request = this.load(key, latitude, longitude, options.force ?? false).finally(() => this.running.delete(key));
    this.running.set(key, request);
    return request;
  }

  private async load(key: string, latitude: number, longitude: number, force: boolean): Promise<ForecastResult | null> {
    const entries = await this.readCache();
    const cached = entries.find((entry) => entry.key === key)?.forecast ?? null;
    if (cached && !force && Date.now() - cached.fetchedAtMs < FORECAST_FRESH_MS) {
      return { forecast: cached, stale: false };
    }
    try {
      const forecast = await this.api.fetchForecast(latitude, longitude);
      const kept = entries.filter((entry) => entry.key !== key).slice(0, FORECAST_CACHE_SIZE - 1);
      await this.writeCache([{ key, forecast }, ...kept]);
      return { forecast, stale: false };
    } catch {
      return cached ? { forecast: cached, stale: true } : null;
    }
  }

  /** A corrupt or foreign value reads as an empty cache, never as an error. */
  private async readCache(): Promise<CacheEntry[]> {
    try {
      const stored = await Preferences.get({ key: CACHE_KEY });
      const value = stored.value ? (JSON.parse(stored.value) as unknown) : null;
      return Array.isArray(value) ? value.filter(isCacheEntry) : [];
    } catch {
      return [];
    }
  }

  private async writeCache(entries: CacheEntry[]): Promise<void> {
    try {
      await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(entries) });
    } catch {
      // A full or unavailable store only costs the offline fallback, the fresh forecast is still shown.
    }
  }
}

export function gridKey(latitude: number, longitude: number): string {
  const snap = (value: number) => (Math.round(value / FORECAST_GRID_DEGREES) * FORECAST_GRID_DEGREES).toFixed(2);
  return `${snap(latitude)},${snap(longitude)}`;
}

function isCacheEntry(value: unknown): value is CacheEntry {
  const entry = value as CacheEntry | null;
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.key === 'string' &&
    typeof entry.forecast === 'object' &&
    entry.forecast !== null &&
    typeof entry.forecast.fetchedAtMs === 'number' &&
    Array.isArray(entry.forecast.hours) &&
    Array.isArray(entry.forecast.days)
  );
}

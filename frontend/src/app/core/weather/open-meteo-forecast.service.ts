import { Injectable } from '@angular/core';

import { EXTERNAL_CALL_TIMEOUT_MS } from '../geo/open-meteo-elevation.service';
import { WeatherForecast, parseOpenMeteoForecast } from './weather-forecast';

/**
 * backlog/109 — the free, key-less Open-Meteo forecast API (https://open-meteo.com/en/docs), called
 * **directly from the client** like the elevation API (Backend-offline first §13): it works in
 * `BACKEND_OFFLINE` as long as there is internet. The data is CC BY 4.0 — the UI names the source.
 */
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const HOURLY = 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m';
const DAILY =
  'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,sunrise,sunset';

/** A week ahead: a hike is planned a few days before, the last known forecast must still cover it offline. */
export const FORECAST_DAYS = 7;

@Injectable({ providedIn: 'root' })
export class OpenMeteoForecastService {
  /** Rejects on any network / timeout / shape error. */
  async fetchForecast(latitude: number, longitude: number): Promise<WeatherForecast> {
    const query = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      hourly: HOURLY,
      daily: DAILY,
      timezone: 'auto',
      timeformat: 'unixtime',
      forecast_days: String(FORECAST_DAYS),
    });
    const response = await fetch(`${FORECAST_URL}?${query.toString()}`, { signal: AbortSignal.timeout(EXTERNAL_CALL_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`Forecast lookup failed: ${response.status}`);
    }
    return parseOpenMeteoForecast(await response.json(), Date.now());
  }
}

import { WeatherForecast, weatherCondition } from './weather-forecast';

/**
 * backlog/109 — the "unfavourable weather" thresholds of the pre-start warning. Constants, not user
 * settings; a value the forecast does not know never triggers a warning.
 */
export const HEAVY_RAIN_MM_PER_HOUR = 4;
export const RAIN_PROBABILITY_PERCENT = 60;
export const STRONG_GUSTS_KMH = 50;
export const HEAT_APPARENT_C = 32;
export const COLD_APPARENT_C = -10;

/** In severity order: the warning list is sorted by this. */
export const WEATHER_WARNING_KINDS = ['THUNDERSTORM', 'HEAVY_RAIN', 'STRONG_WIND', 'SNOW', 'HEAT', 'COLD', 'RAIN', 'DARKNESS'] as const;
export type WeatherWarningKind = (typeof WEATHER_WARNING_KINDS)[number];

export interface WeatherWarning {
  readonly kind: WeatherWarningKind;
  /** When it first happens within the window (the sunset for `DARKNESS`). */
  readonly atMs: number;
  /** The worst value in the window: mm/h, %, km/h or °C by kind; `null` for the code-based kinds. */
  readonly value: number | null;
}

export interface WeatherWarningResult {
  readonly warnings: readonly WeatherWarning[];
  /** `false`: the forecast does not reach the start of the window, so "no warning" means nothing. */
  readonly covered: boolean;
}

const HOUR_MS = 60 * 60_000;

/**
 * The warnings for a hike from `startMs` to `endMs`. An hourly value covers the hour that starts at its
 * time; `DARKNESS` is a sunset inside the window (a start after dark is the walker's own choice).
 */
export function weatherWarnings(forecast: WeatherForecast, startMs: number, endMs: number): WeatherWarningResult {
  const hours = forecast.hours.filter((hour) => hour.timeMs + HOUR_MS > startMs && hour.timeMs < endMs);
  const covered = hours.length > 0;
  const found = new Map<WeatherWarningKind, WeatherWarning>();
  const note = (kind: WeatherWarningKind, atMs: number, value: number | null, worse: (a: number, b: number) => boolean) => {
    const known = found.get(kind);
    if (!known) {
      found.set(kind, { kind, atMs, value });
    } else if (value !== null && known.value !== null && worse(value, known.value)) {
      found.set(kind, { ...known, value });
    }
  };
  const higher = (a: number, b: number) => a > b;
  const lower = (a: number, b: number) => a < b;

  for (const hour of hours) {
    const condition = weatherCondition(hour.weatherCode);
    if (condition === 'THUNDERSTORM') {
      note('THUNDERSTORM', hour.timeMs, null, higher);
    }
    if (condition === 'SNOW') {
      note('SNOW', hour.timeMs, null, higher);
    }
    if (hour.precipitationMm !== null && hour.precipitationMm >= HEAVY_RAIN_MM_PER_HOUR) {
      note('HEAVY_RAIN', hour.timeMs, hour.precipitationMm, higher);
    }
    if (hour.precipitationProbability !== null && hour.precipitationProbability >= RAIN_PROBABILITY_PERCENT) {
      note('RAIN', hour.timeMs, hour.precipitationProbability, higher);
    }
    if (hour.windGustsKmh !== null && hour.windGustsKmh >= STRONG_GUSTS_KMH) {
      note('STRONG_WIND', hour.timeMs, hour.windGustsKmh, higher);
    }
    if (hour.apparentTemperatureC !== null && hour.apparentTemperatureC >= HEAT_APPARENT_C) {
      note('HEAT', hour.timeMs, hour.apparentTemperatureC, higher);
    }
    if (hour.apparentTemperatureC !== null && hour.apparentTemperatureC <= COLD_APPARENT_C) {
      note('COLD', hour.timeMs, hour.apparentTemperatureC, lower);
    }
  }
  // A plain rain warning says nothing more once heavy rain or a storm is already on the list.
  if (found.has('HEAVY_RAIN') || found.has('THUNDERSTORM')) {
    found.delete('RAIN');
  }
  const sunset = forecast.days.map((day) => day.sunsetMs).find((ms) => ms !== null && ms > startMs && ms < endMs);
  if (sunset !== undefined && sunset !== null) {
    found.set('DARKNESS', { kind: 'DARKNESS', atMs: sunset, value: null });
  }
  const warnings = WEATHER_WARNING_KINDS.map((kind) => found.get(kind)).filter((warning): warning is WeatherWarning => warning !== undefined);
  return { warnings, covered };
}

import { WeatherDay, WeatherForecast, WeatherHour } from './weather-forecast';
import { weatherWarnings } from './weather-warnings';

const HOUR = 60 * 60_000;
const T0 = Date.UTC(2026, 9, 24, 8, 0);

function hour(index: number, values: Partial<WeatherHour> = {}): WeatherHour {
  return {
    timeMs: T0 + index * HOUR,
    temperatureC: 12,
    apparentTemperatureC: 11,
    precipitationProbability: 5,
    precipitationMm: 0,
    weatherCode: 1,
    windSpeedKmh: 8,
    windGustsKmh: 20,
    ...values,
  };
}

function forecast(hours: WeatherHour[], sunsetMs: number | null = T0 + 9 * HOUR): WeatherForecast {
  const day: WeatherDay = {
    dateMs: T0 - 8 * HOUR,
    weatherCode: 1,
    temperatureMaxC: 14,
    temperatureMinC: 6,
    precipitationSumMm: 0,
    precipitationProbabilityMax: 5,
    windGustsMaxKmh: 20,
    sunriseMs: T0 - HOUR,
    sunsetMs,
  };
  return { latitude: 47.7, longitude: 18.9, utcOffsetSeconds: 7200, fetchedAtMs: T0, hours, days: [day] };
}

describe('weatherWarnings (backlog/109)', () => {
  it('a calm day inside the forecast: no warning, covered', () => {
    const result = weatherWarnings(forecast([hour(0), hour(1), hour(2)]), T0, T0 + 3 * HOUR);
    expect(result).toEqual({ warnings: [], covered: true });
  });

  it('storm, wind and rain within the window, in severity order with the worst value', () => {
    const hours = [
      hour(0, { precipitationProbability: 70 }),
      hour(1, { windGustsKmh: 55 }),
      hour(2, { windGustsKmh: 68, weatherCode: 95 }),
    ];
    const { warnings } = weatherWarnings(forecast(hours), T0, T0 + 3 * HOUR);

    expect(warnings.map((warning) => warning.kind)).toEqual(['THUNDERSTORM', 'STRONG_WIND']);
    expect(warnings[1]).toEqual({ kind: 'STRONG_WIND', atMs: T0 + HOUR, value: 68 });
  });

  it('a plain rain chance is a warning of its own', () => {
    const { warnings } = weatherWarnings(forecast([hour(0, { precipitationProbability: 60 }), hour(1, { precipitationProbability: 85 })]), T0, T0 + 2 * HOUR);
    expect(warnings).toEqual([{ kind: 'RAIN', atMs: T0, value: 85 }]);
  });

  it('heavy rain, heat and cold by their thresholds', () => {
    const hours = [hour(0, { precipitationMm: 4.5 }), hour(1, { apparentTemperatureC: 33 }), hour(2, { apparentTemperatureC: -12 })];
    const kinds = weatherWarnings(forecast(hours), T0, T0 + 3 * HOUR).warnings.map((warning) => warning.kind);
    expect(kinds).toEqual(['HEAVY_RAIN', 'HEAT', 'COLD']);
  });

  it('hours outside the window do not count; the hour already running does', () => {
    const hours = [hour(0, { weatherCode: 95 }), hour(1), hour(2, { weatherCode: 95 })];
    expect(weatherWarnings(forecast(hours), T0 + HOUR, T0 + 2 * HOUR).warnings).toEqual([]);
    expect(weatherWarnings(forecast(hours), T0 + 30 * 60_000, T0 + 2 * HOUR).warnings.length).toBe(1);
  });

  it('darkness: a sunset before the estimated end', () => {
    const hours = Array.from({ length: 12 }, (_, index) => hour(index));
    const sunset = T0 + 9 * HOUR;
    expect(weatherWarnings(forecast(hours, sunset), T0, T0 + 10 * HOUR).warnings).toEqual([{ kind: 'DARKNESS', atMs: sunset, value: null }]);
    expect(weatherWarnings(forecast(hours, sunset), T0, T0 + 8 * HOUR).warnings).toEqual([]);
  });

  it('a window past the forecast is not covered, so "no warning" means nothing', () => {
    expect(weatherWarnings(forecast([hour(0)]), T0 + 48 * HOUR, T0 + 50 * HOUR).covered).toBeFalse();
  });

  it('an unknown value never warns', () => {
    const hours = [hour(0, { windGustsKmh: null, precipitationProbability: null, apparentTemperatureC: null, weatherCode: null })];
    expect(weatherWarnings(forecast(hours, null), T0, T0 + HOUR).warnings).toEqual([]);
  });
});

import { parseOpenMeteoForecast, weatherCondition } from './weather-forecast';

/** backlog/109 — a trimmed real `timeformat=unixtime` response (two hours, one day). */
function openMeteoBody(overrides: { hourly?: Record<string, unknown>; daily?: Record<string, unknown> } = {}): unknown {
  return {
    latitude: 47.68412,
    longitude: 18.860565,
    utc_offset_seconds: 7200,
    timezone: 'Europe/Budapest',
    hourly: {
      time: [1792533600, 1792537200],
      temperature_2m: [8.4, 9.1],
      apparent_temperature: [6.0, 6.8],
      precipitation_probability: [10, 75],
      precipitation: [0, 1.2],
      weather_code: [2, 61],
      wind_speed_10m: [7.2, 11.5],
      wind_gusts_10m: [18.0, 31.3],
      ...overrides.hourly,
    },
    daily: {
      time: [1792533600],
      weather_code: [61],
      temperature_2m_max: [14.2],
      temperature_2m_min: [5.1],
      precipitation_sum: [3.4],
      precipitation_probability_max: [75],
      wind_gusts_10m_max: [40.7],
      sunrise: [1792560000],
      sunset: [1792598400],
      ...overrides.daily,
    },
  };
}

describe('weather-forecast (backlog/109)', () => {
  it('reads the hourly and daily series, times in milliseconds', () => {
    const forecast = parseOpenMeteoForecast(openMeteoBody(), 1_000);

    expect(forecast.fetchedAtMs).toBe(1_000);
    expect(forecast.utcOffsetSeconds).toBe(7200);
    expect(forecast.hours.length).toBe(2);
    expect(forecast.hours[1]).toEqual({
      timeMs: 1792537200_000,
      temperatureC: 9.1,
      apparentTemperatureC: 6.8,
      precipitationProbability: 75,
      precipitationMm: 1.2,
      weatherCode: 61,
      windSpeedKmh: 11.5,
      windGustsKmh: 31.3,
    });
    expect(forecast.days[0].sunsetMs).toBe(1792598400_000);
    expect(forecast.days[0].temperatureMaxC).toBe(14.2);
  });

  it('an unknown value stays unknown (null), never 0; a missing series is all unknown', () => {
    const body = openMeteoBody({ hourly: { precipitation_probability: [null, 40], wind_gusts_10m: undefined } });
    const forecast = parseOpenMeteoForecast(body, 0);

    expect(forecast.hours[0].precipitationProbability).toBeNull();
    expect(forecast.hours[1].precipitationProbability).toBe(40);
    expect(forecast.hours.every((hour) => hour.windGustsKmh === null)).toBeTrue();
  });

  it('a shape it cannot read is an error, not a half forecast', () => {
    expect(() => parseOpenMeteoForecast({ latitude: 47 }, 0)).toThrowError();
    expect(() => parseOpenMeteoForecast(openMeteoBody({ hourly: { time: 'x' } }), 0)).toThrowError();
    expect(() => parseOpenMeteoForecast(openMeteoBody({ hourly: { temperature_2m: [1] } }), 0)).toThrowError();
  });

  it('weatherCondition groups the WMO codes', () => {
    expect(weatherCondition(0)).toBe('CLEAR');
    expect(weatherCondition(2)).toBe('PARTLY_CLOUDY');
    expect(weatherCondition(3)).toBe('OVERCAST');
    expect(weatherCondition(48)).toBe('FOG');
    expect(weatherCondition(53)).toBe('DRIZZLE');
    expect(weatherCondition(81)).toBe('RAIN');
    expect(weatherCondition(86)).toBe('SNOW');
    expect(weatherCondition(95)).toBe('THUNDERSTORM');
    expect(weatherCondition(42)).toBeNull();
    expect(weatherCondition(null)).toBeNull();
  });
});

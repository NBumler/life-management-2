/**
 * backlog/109 — the hiking weather forecast as the app keeps it: hourly and daily values for one point,
 * from the Open-Meteo forecast API (`open-meteo-forecast.service.ts`). Times are epoch milliseconds; a
 * value the API does not know is `null`, never 0.
 */
export interface WeatherHour {
  readonly timeMs: number;
  readonly temperatureC: number | null;
  readonly apparentTemperatureC: number | null;
  readonly precipitationProbability: number | null;
  readonly precipitationMm: number | null;
  readonly weatherCode: number | null;
  readonly windSpeedKmh: number | null;
  readonly windGustsKmh: number | null;
}

export interface WeatherDay {
  /** Local midnight of the forecast point's time zone. */
  readonly dateMs: number;
  readonly weatherCode: number | null;
  readonly temperatureMaxC: number | null;
  readonly temperatureMinC: number | null;
  readonly precipitationSumMm: number | null;
  readonly precipitationProbabilityMax: number | null;
  readonly windGustsMaxKmh: number | null;
  readonly sunriseMs: number | null;
  readonly sunsetMs: number | null;
}

export interface WeatherForecast {
  readonly latitude: number;
  readonly longitude: number;
  readonly utcOffsetSeconds: number;
  readonly fetchedAtMs: number;
  readonly hours: readonly WeatherHour[];
  readonly days: readonly WeatherDay[];
}

/** The WMO weather code groups the UI names (`TURA.WEATHER.CONDITION_*`). */
export type WeatherCondition = 'CLEAR' | 'PARTLY_CLOUDY' | 'OVERCAST' | 'FOG' | 'DRIZZLE' | 'RAIN' | 'SNOW' | 'THUNDERSTORM';

/** WMO 4677 codes as Open-Meteo documents them; an unknown code has no condition. */
export function weatherCondition(code: number | null): WeatherCondition | null {
  if (code === null) {
    return null;
  }
  if (code === 0 || code === 1) {
    return 'CLEAR';
  }
  if (code === 2) {
    return 'PARTLY_CLOUDY';
  }
  if (code === 3) {
    return 'OVERCAST';
  }
  if (code === 45 || code === 48) {
    return 'FOG';
  }
  if (code >= 51 && code <= 57) {
    return 'DRIZZLE';
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return 'RAIN';
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'SNOW';
  }
  if (code >= 95 && code <= 99) {
    return 'THUNDERSTORM';
  }
  return null;
}

type Series = Record<string, unknown>;

/**
 * An Open-Meteo `timeformat=unixtime` response → `WeatherForecast`. Throws on a shape it cannot read
 * (missing time axis, series of the wrong length) — the caller then keeps the last known forecast.
 */
export function parseOpenMeteoForecast(body: unknown, fetchedAtMs: number): WeatherForecast {
  const root = body as { latitude?: unknown; longitude?: unknown; utc_offset_seconds?: unknown; hourly?: unknown; daily?: unknown } | null;
  if (typeof root !== 'object' || root === null || !isFiniteNumber(root.latitude) || !isFiniteNumber(root.longitude)) {
    throw new Error('Unexpected forecast API response shape');
  }
  const hourly = series(root.hourly);
  const daily = series(root.daily);
  const hourTimes = timeAxis(hourly);
  const dayTimes = timeAxis(daily);
  const hourValue = column(hourly, hourTimes.length);
  const dayValue = column(daily, dayTimes.length);
  const temperature = hourValue('temperature_2m');
  const apparent = hourValue('apparent_temperature');
  const probability = hourValue('precipitation_probability');
  const precipitation = hourValue('precipitation');
  const hourCode = hourValue('weather_code');
  const windSpeed = hourValue('wind_speed_10m');
  const windGusts = hourValue('wind_gusts_10m');
  const dayCode = dayValue('weather_code');
  const maxTemperature = dayValue('temperature_2m_max');
  const minTemperature = dayValue('temperature_2m_min');
  const precipitationSum = dayValue('precipitation_sum');
  const probabilityMax = dayValue('precipitation_probability_max');
  const gustsMax = dayValue('wind_gusts_10m_max');
  const sunrise = dayValue('sunrise');
  const sunset = dayValue('sunset');
  return {
    latitude: root.latitude,
    longitude: root.longitude,
    utcOffsetSeconds: isFiniteNumber(root.utc_offset_seconds) ? root.utc_offset_seconds : 0,
    fetchedAtMs,
    hours: hourTimes.map((seconds, index) => ({
      timeMs: seconds * 1000,
      temperatureC: temperature(index),
      apparentTemperatureC: apparent(index),
      precipitationProbability: probability(index),
      precipitationMm: precipitation(index),
      weatherCode: hourCode(index),
      windSpeedKmh: windSpeed(index),
      windGustsKmh: windGusts(index),
    })),
    days: dayTimes.map((seconds, index) => ({
      dateMs: seconds * 1000,
      weatherCode: dayCode(index),
      temperatureMaxC: maxTemperature(index),
      temperatureMinC: minTemperature(index),
      precipitationSumMm: precipitationSum(index),
      precipitationProbabilityMax: probabilityMax(index),
      windGustsMaxKmh: gustsMax(index),
      sunriseMs: millis(sunrise(index)),
      sunsetMs: millis(sunset(index)),
    })),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function series(value: unknown): Series {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Unexpected forecast API response shape');
  }
  return value as Series;
}

function timeAxis(values: Series): number[] {
  const time = values['time'];
  if (!Array.isArray(time) || !time.every(isFiniteNumber)) {
    throw new Error('Unexpected forecast API response shape');
  }
  return time;
}

/** A series the request asked for but the response left out reads as all-unknown; a wrong length is an error. */
function column(values: Series, length: number): (name: string) => (index: number) => number | null {
  return (name) => {
    const data = values[name];
    if (data === undefined) {
      return () => null;
    }
    if (!Array.isArray(data) || data.length !== length) {
      throw new Error(`Unexpected forecast API series: ${name}`);
    }
    return (index) => (isFiniteNumber(data[index]) ? data[index] : null);
  };
}

function millis(seconds: number | null): number | null {
  return seconds === null ? null : seconds * 1000;
}

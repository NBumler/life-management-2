import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { OpenMeteoForecastService } from './open-meteo-forecast.service';
import { WeatherForecast } from './weather-forecast';
import { FORECAST_CACHE_SIZE, FORECAST_FRESH_MS, WeatherForecastService, gridKey } from './weather-forecast.service';

const CACHE_KEY = 'lm2_weather_forecasts';

function forecastAt(fetchedAtMs: number, latitude = 47.7): WeatherForecast {
  return { latitude, longitude: 18.9, utcOffsetSeconds: 7200, fetchedAtMs, hours: [], days: [] };
}

/** backlog/109 */
describe('WeatherForecastService', () => {
  let service: WeatherForecastService;
  let fetchForecast: jasmine.Spy;

  beforeEach(async () => {
    fetchForecast = jasmine.createSpy('fetchForecast');
    TestBed.configureTestingModule({ providers: [{ provide: OpenMeteoForecastService, useValue: { fetchForecast } }] });
    service = TestBed.inject(WeatherForecastService);
    await Preferences.remove({ key: CACHE_KEY });
  });

  afterEach(async () => {
    await Preferences.remove({ key: CACHE_KEY });
  });

  it('fetches once, then a fresh forecast for the same place comes from the device', async () => {
    const fresh = forecastAt(Date.now());
    fetchForecast.and.resolveTo(fresh);

    expect(await service.forecastFor(47.7012, 18.9004)).toEqual({ forecast: fresh, stale: false });
    expect(await service.forecastFor(47.7101, 18.8999)).toEqual({ forecast: fresh, stale: false });
    expect(fetchForecast).toHaveBeenCalledTimes(1);
  });

  it('an old forecast is refreshed; force refreshes a fresh one too', async () => {
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify([{ key: gridKey(47.7, 18.9), forecast: forecastAt(Date.now() - FORECAST_FRESH_MS - 1) }]) });
    const fresh = forecastAt(Date.now());
    fetchForecast.and.resolveTo(fresh);

    expect((await service.forecastFor(47.7, 18.9))?.forecast).toEqual(fresh);
    await service.forecastFor(47.7, 18.9, { force: true });
    expect(fetchForecast).toHaveBeenCalledTimes(2);
  });

  it('offline: the last known forecast, marked stale; nothing known → null', async () => {
    const old = forecastAt(Date.now() - 5 * FORECAST_FRESH_MS);
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify([{ key: gridKey(47.7, 18.9), forecast: old }]) });
    fetchForecast.and.rejectWith(new Error('offline'));

    expect(await service.forecastFor(47.7, 18.9)).toEqual({ forecast: old, stale: true });
    expect(await service.forecastFor(46.1, 18.2)).toBeNull();
  });

  it('two calls for the same place while one runs share the request', async () => {
    fetchForecast.and.resolveTo(forecastAt(Date.now()));
    const [first, second] = await Promise.all([service.forecastFor(47.7, 18.9), service.forecastFor(47.7, 18.9)]);
    expect(first).toEqual(second);
    expect(fetchForecast).toHaveBeenCalledTimes(1);
  });

  it(`keeps the newest ${FORECAST_CACHE_SIZE} places only; a corrupt store reads as empty`, async () => {
    await Preferences.set({ key: CACHE_KEY, value: '{not json' });
    fetchForecast.and.callFake(async (latitude: number) => forecastAt(Date.now(), latitude));
    for (let index = 0; index <= FORECAST_CACHE_SIZE; index++) {
      await service.forecastFor(46 + index * 0.2, 18.9);
    }
    const stored = JSON.parse((await Preferences.get({ key: CACHE_KEY })).value ?? '[]') as { key: string }[];
    expect(stored.length).toBe(FORECAST_CACHE_SIZE);
    expect(stored[0].key).toBe(gridKey(46 + FORECAST_CACHE_SIZE * 0.2, 18.9));
    expect(stored.some((entry) => entry.key === gridKey(46, 18.9))).toBeFalse();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { WeatherForecast } from '../../../core/weather/weather-forecast';
import { ForecastResult, WeatherForecastService } from '../../../core/weather/weather-forecast.service';
import { RouteWeatherComponent } from './route-weather.component';

const HOUR = 60 * 60_000;

/** Today and tomorrow at the place, hourly from the current hour on. */
function forecast(fetchedAtMs = Date.now()): WeatherForecast {
	const start = Math.floor(Date.now() / HOUR) * HOUR;
	const midnight = start - 12 * HOUR;
	return {
		latitude: 47.7,
		longitude: 18.9,
		utcOffsetSeconds: 0,
		fetchedAtMs,
		hours: Array.from({ length: 60 }, (_, index) => ({
			timeMs: midnight + index * HOUR,
			temperatureC: 12.4,
			apparentTemperatureC: 11,
			precipitationProbability: 40,
			precipitationMm: 0.2,
			weatherCode: 61,
			windSpeedKmh: 10,
			windGustsKmh: 32.6,
		})),
		days: [0, 1].map((offset) => ({
			dateMs: midnight + offset * 24 * HOUR,
			weatherCode: offset === 0 ? 61 : 0,
			temperatureMaxC: 15,
			temperatureMinC: 6,
			precipitationSumMm: 3.4,
			precipitationProbabilityMax: 70,
			windGustsMaxKmh: 41,
			sunriseMs: midnight + offset * 24 * HOUR + 6 * HOUR,
			sunsetMs: midnight + offset * 24 * HOUR + 17 * HOUR,
		})),
	};
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('RouteWeatherComponent (backlog/109)', () => {
	let fixture: ComponentFixture<RouteWeatherComponent>;
	let forecastFor: jasmine.Spy;

	const element = () => fixture.nativeElement as HTMLElement;
	const text = () => element().textContent ?? '';

	async function render(places: number[][], result: ForecastResult | null): Promise<void> {
		forecastFor = jasmine.createSpy('forecastFor').and.resolveTo(result);
		TestBed.configureTestingModule({
			imports: [RouteWeatherComponent],
			providers: [provideTranslateService(), { provide: WeatherForecastService, useValue: { forecastFor } }],
		});
		fixture = TestBed.createComponent(RouteWeatherComponent);
		fixture.componentRef.setInput('places', places);
		fixture.detectChanges();
		await settle();
		fixture.detectChanges();
	}

	afterEach(() => fixture.destroy());

	it('asks the forecast for the start point, then shows the days, the selected day and its hours', async () => {
		await render([[18.9, 47.7]], { forecast: forecast(), stale: false });

		expect(forecastFor).toHaveBeenCalledOnceWith(47.7, 18.9, { force: false });
		expect(element().querySelectorAll('.weather-day').length).toBe(2);
		expect(text()).toContain('TURA.WEATHER.TODAY');
		expect(text()).toContain('15° / 6°');
		expect(text()).toContain('TURA.WEATHER.CONDITION_RAIN');
		expect(element().querySelectorAll('.weather-hour').length).toBeGreaterThan(0);
		expect(text()).toContain('33 km/h');
		expect(text()).toContain('TURA.WEATHER.SOURCE');
		expect(text()).not.toContain('TURA.WEATHER.STALE');
	});

	it('tapping another day selects it', async () => {
		await render([[18.9, 47.7]], { forecast: forecast(), stale: false });
		const days = element().querySelectorAll<HTMLButtonElement>('.weather-day');
		days[1].click();
		fixture.detectChanges();

		expect(days[1].classList).toContain('selected');
		expect(text()).toContain('TURA.WEATHER.CONDITION_CLEAR');
	});

	it('offline with a last known forecast: says so, with a refresh button', async () => {
		await render([[18.9, 47.7]], { forecast: forecast(Date.now() - 3 * HOUR), stale: true });

		expect(text()).toContain('TURA.WEATHER.STALE');
		expect(text()).toContain('TURA.WEATHER.REFRESH');
	});

	it('nothing known and no connection: a short explanation, no empty table', async () => {
		await render([[18.9, 47.7]], null);

		expect(text()).toContain('TURA.WEATHER.UNAVAILABLE');
		expect(element().querySelector('.weather-days')).toBeNull();
	});

	it('a multi-day route: one place per day start, the chosen one is asked for', async () => {
		await render(
			[
				[18.9, 47.7],
				[19.4, 47.9],
			],
			{ forecast: forecast(), stale: false },
		);
		const places = element().querySelectorAll<HTMLElement>('.weather-place');
		expect(places.length).toBe(2);

		places[1].click();
		fixture.detectChanges();
		await settle();
		expect(forecastFor).toHaveBeenCalledWith(47.9, 19.4, { force: false });
	});
});

import { WeatherDay, WeatherForecast, WeatherHour } from '../../../core/weather/weather-forecast';
import { dayHours, dayLabel, dayStartPoints, firstCurrentDay, forecastAgeText, localClock } from './weather-text';

const HOUR = 60 * 60_000;
const OFFSET = 7200;
/** 2026-10-24 00:00 Budapest (CEST). */
const MIDNIGHT = Date.UTC(2026, 9, 23, 22, 0);

function hour(timeMs: number): WeatherHour {
	return {
		timeMs,
		temperatureC: 10,
		apparentTemperatureC: 9,
		precipitationProbability: 0,
		precipitationMm: 0,
		weatherCode: 0,
		windSpeedKmh: 5,
		windGustsKmh: 10,
	};
}

function day(dateMs: number): WeatherDay {
	return {
		dateMs,
		weatherCode: 0,
		temperatureMaxC: 15,
		temperatureMinC: 5,
		precipitationSumMm: 0,
		precipitationProbabilityMax: 0,
		windGustsMaxKmh: 10,
		sunriseMs: null,
		sunsetMs: null,
	};
}

function twoDays(): WeatherForecast {
	return {
		latitude: 47.7,
		longitude: 18.9,
		utcOffsetSeconds: OFFSET,
		fetchedAtMs: MIDNIGHT,
		hours: Array.from({ length: 48 }, (_, index) => hour(MIDNIGHT + index * HOUR)),
		days: [day(MIDNIGHT), day(MIDNIGHT + 24 * HOUR)],
	};
}

describe('weather-text (backlog/109)', () => {
	it('localClock: the forecast place’s time, not the device’s', () => {
		expect(localClock(MIDNIGHT + 7 * HOUR + 5 * 60_000, OFFSET)).toBe('07:05');
		expect(localClock(MIDNIGHT, 0)).toBe('22:00');
	});

	it('dayLabel: short weekday and day in the active language', () => {
		expect(dayLabel(MIDNIGHT, OFFSET, 'en')).toBe('Sat 24');
		expect(dayLabel(MIDNIGHT, OFFSET, 'hu')).toBe('Szo 24.');
	});

	it('dayHours: daytime hours only, without the hours already gone', () => {
		const forecast = twoDays();
		const before = dayHours(forecast, 0, MIDNIGHT - HOUR);
		expect(before.length).toBe(18);
		expect(localClock(before[0].timeMs, OFFSET)).toBe('05:00');
		expect(localClock(before[before.length - 1].timeMs, OFFSET)).toBe('22:00');

		const midday = dayHours(forecast, 0, MIDNIGHT + 12 * HOUR + 30 * 60_000);
		expect(localClock(midday[0].timeMs, OFFSET)).toBe('12:00');
	});

	it('dayHours: late at night the remaining hours stay, so the strip is never empty', () => {
		const lateHours = dayHours(twoDays(), 0, MIDNIGHT + 23 * HOUR + 10 * 60_000);
		expect(lateHours.map((value) => localClock(value.timeMs, OFFSET))).toEqual(['23:00']);
	});

	it('firstCurrentDay: the first day not over yet', () => {
		expect(firstCurrentDay(twoDays(), MIDNIGHT + 3 * HOUR)).toBe(0);
		expect(firstCurrentDay(twoDays(), MIDNIGHT + 25 * HOUR)).toBe(1);
	});

	it('forecastAgeText: minutes, hours, days', () => {
		expect(forecastAgeText(5 * 60_000)).toEqual({ key: 'TURA.WEATHER.AGE_MINUTES', params: { minutes: 5 } });
		expect(forecastAgeText(3 * HOUR)).toEqual({ key: 'TURA.WEATHER.AGE_HOURS', params: { hours: 3 } });
		expect(forecastAgeText(50 * HOUR)).toEqual({ key: 'TURA.WEATHER.AGE_DAYS', params: { days: 2 } });
	});

	it('dayStartPoints: the line start, then each day break; invalid breaks are dropped', () => {
		const line = [
			[19.0, 47.5],
			[19.1, 47.6],
			[19.2, 47.7],
			[19.3, 47.8],
		];
		expect(dayStartPoints(line, [])).toEqual([[19.0, 47.5]]);
		expect(dayStartPoints(line, [2, 1])).toEqual([line[0], line[1], line[2]]);
		expect(dayStartPoints(line, [0, 3, 9])).toEqual([line[0]]);
		expect(dayStartPoints([], [1])).toEqual([]);
	});
});

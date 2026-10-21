import { ActiveLanguage } from '../../../core/config/language.service';
import { WeatherCondition, WeatherForecast, WeatherHour } from '../../../core/weather/weather-forecast';
import { TranslatedText } from './hike-text';

/** backlog/109 — az állapot-csoport ikonja; ismeretlen kódnál a felhő. */
export const CONDITION_ICONS: Record<WeatherCondition, string> = {
	CLEAR: 'sunny-outline',
	PARTLY_CLOUDY: 'partly-sunny-outline',
	OVERCAST: 'cloudy-outline',
	FOG: 'cloud-outline',
	DRIZZLE: 'rainy-outline',
	RAIN: 'rainy-outline',
	SNOW: 'snow-outline',
	THUNDERSTORM: 'thunderstorm-outline',
};

/** Az órás sáv csak a túrázásra számító órákat mutatja (helyi idő szerint). */
export const FIRST_SHOWN_HOUR = 5;
export const LAST_SHOWN_HOUR = 22;

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

/** Egy időpont az előrejelzés helyének idejében, órára és percre („07:05”); a készülék időzónájától független. */
export function localClock(ms: number, utcOffsetSeconds: number): string {
	const local = new Date(ms + utcOffsetSeconds * 1000);
	return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
}

const LOCALES: Record<ActiveLanguage, string> = { hu: 'hu-HU', en: 'en-US' };

/**
 * A nap rövid neve a hely idejében, előbb a hét napja: „Szo 24.” / „Sat 24”. Az `Intl` magyarul
 * „24., Szo” sorrendet adna, ezért a részekből rakjuk össze.
 */
export function dayLabel(dateMs: number, utcOffsetSeconds: number, language: ActiveLanguage): string {
	const date = new Date(dateMs + utcOffsetSeconds * 1000);
	const weekday = new Intl.DateTimeFormat(LOCALES[language], { weekday: 'short', timeZone: 'UTC' }).format(date).replace(/\.$/, '');
	const day = date.getUTCDate();
	return language === 'hu' ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}.` : `${weekday} ${day}`;
}

/**
 * Az órás sáv egy napra: a nap órái `FIRST_SHOWN_HOUR`–`LAST_SHOWN_HOUR` között, a már elmúlt órák nélkül.
 * Késő este a mai napra a hátralévő órák maradnak, hogy a sáv ne legyen üres.
 */
export function dayHours(forecast: WeatherForecast, dayIndex: number, nowMs: number): WeatherHour[] {
	const day = forecast.days[dayIndex];
	if (!day) {
		return [];
	}
	const dayEnd = forecast.days[dayIndex + 1]?.dateMs ?? day.dateMs + DAY_MS;
	const upcoming = forecast.hours.filter((hour) => hour.timeMs >= day.dateMs && hour.timeMs < dayEnd && hour.timeMs + HOUR_MS > nowMs);
	const daytime = upcoming.filter((hour) => {
		const localHour = new Date(hour.timeMs + forecast.utcOffsetSeconds * 1000).getUTCHours();
		return localHour >= FIRST_SHOWN_HOUR && localHour <= LAST_SHOWN_HOUR;
	});
	return daytime.length > 0 ? daytime : upcoming;
}

/** Az első nap, ami még nem ért véget — a lap ezzel nyílik. */
export function firstCurrentDay(forecast: WeatherForecast, nowMs: number): number {
	const index = forecast.days.findIndex((day, position) => (forecast.days[position + 1]?.dateMs ?? day.dateMs + DAY_MS) > nowMs);
	return Math.max(0, index);
}

/** Az utolsó ismert előrejelzés kora: percben egy óráig, órában egy napig, utána napban. */
export function forecastAgeText(ageMs: number): TranslatedText {
	const minutes = Math.max(0, Math.floor(ageMs / 60_000));
	if (minutes < 60) {
		return { key: 'TURA.WEATHER.AGE_MINUTES', params: { minutes } };
	}
	const hours = Math.floor(minutes / 60);
	return hours < 24 ? { key: 'TURA.WEATHER.AGE_HOURS', params: { hours } } : { key: 'TURA.WEATHER.AGE_DAYS', params: { days: Math.floor(hours / 24) } };
}

/**
 * backlog/109 — a napok kezdőpontjai `[lon, lat]`-ként: az első nap a vonal eleje, a többi az előző nap
 * végpontja (`HikeRouteDay.endWaypointIndex` / a piszkozat napváltó-indexe). Érvénytelen index kimarad.
 */
export function dayStartPoints(coordinates: readonly (readonly number[])[], breakIndexes: readonly number[]): (readonly number[])[] {
	if (coordinates.length === 0) {
		return [];
	}
	const indexes = [0, ...[...breakIndexes].sort((a, b) => a - b).filter((index) => index > 0 && index < coordinates.length - 1)];
	return [...new Set(indexes)].map((index) => coordinates[index]);
}

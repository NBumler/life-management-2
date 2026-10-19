import { ActiveLanguage } from '../../../core/config/language.service';

/** Egy fordítási kulcs a paramétereivel — a sablon `translate` pipe-ja oldja fel, így nyelvváltáskor is frissül. */
export interface TranslatedText {
	key: string;
	params?: Record<string, number>;
}

/**
 * backlog/185 — a becsült időtartam az aktív nyelv egységeivel („1 ó 31 p” / „1 h 31 min”).
 * `null` = nem számolható → `~`, soha nem `0` (Backend-offline first §14).
 */
export function durationText(minutes: number | null | undefined): TranslatedText {
	if (minutes == null) {
		return { key: 'TURA.DURATION.UNKNOWN' };
	}
	const totalMinutes = Math.round(minutes);
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return hours > 0
		? { key: 'TURA.DURATION.HOURS_MINUTES', params: { hours, minutes: mins } }
		: { key: 'TURA.DURATION.MINUTES', params: { minutes: mins } };
}

/** backlog/186 — a `_ONE` / `_MANY` minta (lásd `NOTIFICATIONS.HOUSEHOLD_TASK_DUE.BODY_ONE`): „1 day” / „N days”. */
export function daySummaryText(count: number): TranslatedText {
	return { key: count === 1 ? 'TURA.DAYS.SUMMARY_ONE' : 'TURA.DAYS.SUMMARY_MANY', params: { count } };
}

/** backlog/220 — a túra oldal számai az aktív nyelv szerint („2,9 km” / „2.9 km”); a `LOCALE_ID`-tól (#014) független. */
const NUMBER_LOCALES: Record<ActiveLanguage, string> = { hu: 'hu-HU', en: 'en-US' };
const oneDecimalFormats = new Map<ActiveLanguage, Intl.NumberFormat>();
const integerFormats = new Map<ActiveLanguage, Intl.NumberFormat>();

function oneDecimal(language: ActiveLanguage): Intl.NumberFormat {
	let format = oneDecimalFormats.get(language);
	if (!format) {
		format = new Intl.NumberFormat(NUMBER_LOCALES[language], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
		oneDecimalFormats.set(language, format);
	}
	return format;
}

function integer(language: ActiveLanguage): Intl.NumberFormat {
	let format = integerFormats.get(language);
	if (!format) {
		format = new Intl.NumberFormat(NUMBER_LOCALES[language], { maximumFractionDigits: 0 });
		integerFormats.set(language, format);
	}
	return format;
}

/** backlog/151 — `null` = nem számolható (pl. internet nélkül nincs magassági adat) → `~`, soha nem `0` (Backend-offline first §14). */
export function distanceText(meters: number | null | undefined, language: ActiveLanguage): string {
	return meters == null ? '~' : `${oneDecimal(language).format(meters / 1000)} km`;
}

export function elevationText(meters: number | null | undefined, language: ActiveLanguage): string {
	return meters == null ? '~' : `${integer(language).format(Math.round(meters))} m`;
}

export function megabytesText(bytes: number, language: ActiveLanguage): string {
	return `${oneDecimal(language).format(bytes / (1024 * 1024))} MB`;
}

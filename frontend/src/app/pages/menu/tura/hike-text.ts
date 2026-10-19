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

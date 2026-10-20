import { trailSegmentMarkingColorName } from './trail-segment-symbol-color';

/** backlog/201 — a jelzés-kód alakzat-tagjai (scripts/import-hiking-trails.mjs `SHAPE_WORDS` / `LOCAL_SHAPE_TOKENS`). */
const KNOWN_SHAPES = new Set(['SAV', 'KERESZT', 'HAROMSZOG', 'KOR', 'NEGYSZOG', 'PONT', 'OMEGA', 'ROM', 'KILATO', 'TEMPLOM', 'EMLEKMU', 'HAZ']);
/** Egy betűjeles jelzés (pl. `ZOLD_T` tanösvény, `LILA_M` Mária út) betűje így írható ki. */
const MAX_LETTER_LENGTH = 3;

/**
 * backlog/201 — a turistajelzés neve egy vonalra koppintva: „Kék sáv”, „Zöld T”; ha az alakzat nem
 * ismert, „Kék jelzés”; szín nélkül „Jelzés nélküli turistaút”. A `translate` a TranslateService
 * `instant`-ja (a sablonon kívül, egy koppintás pillanatában épül).
 */
export function trailSymbolLabel(symbol: string, translate: (key: string, params?: Record<string, string>) => string): string {
	const colorName = trailSegmentMarkingColorName(symbol);
	if (colorName === null) {
		return translate('TURA.LEGEND.UNMARKED');
	}
	const suffix = symbol.slice(colorName.length + 1);
	const color = translate(`TURA.TRAIL.COLOR.${colorName}`);
	if (KNOWN_SHAPES.has(suffix)) {
		return translate('TURA.TRAIL.NAME', { color, shape: translate(`TURA.TRAIL.SHAPE.${suffix}`) });
	}
	if (suffix !== '' && suffix !== 'JEL' && suffix.length <= MAX_LETTER_LENGTH) {
		return translate('TURA.TRAIL.NAME', { color, shape: suffix });
	}
	return translate(`TURA.LEGEND.MARKING.${colorName}`);
}

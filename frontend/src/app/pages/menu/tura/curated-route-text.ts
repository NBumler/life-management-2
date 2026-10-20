import { CuratedRoute } from '../../../api/model/curatedRoute';
import { matchesSearch } from '../../../shared/text-search';
import { MARKING_COLORS, trailSegmentCasingColor, trailSegmentMarkingColorName } from './trail-segment-symbol-color';

/**
 * backlog/216 — az OSM-nevek eleji jelzés-rövidítés betűje színenként („P (Dömös – Budaörs)”,
 * „K, OKT 16. (…)”, „K+ (…)”). Csak ha a túra jelzés-kódja ugyanezt a színt mondja, így egy
 * „K”-val kezdődő helynév nem csonkul.
 */
const PREFIX_LETTERS: Readonly<Record<string, string>> = { PIROS: 'P', KEK: 'K', ZOLD: 'Z', SARGA: 'S', LILA: 'L' };
/** A betű után legfeljebb két alakzat-karakter (`+`, `▲`, `●`, `Ω`, …), majd vessző vagy egy zárójeles útvonal. */
const PREFIX_SUFFIX = String.raw`(?:[^\s,(\p{L}\d]|Ω){0,2}(?:,\s*|\s+(?=\())`;
const WRAPPED = /^\((.+)\)$/u;
/** Néhány OSM-névből a záró zárójel hiányzik („Z (Petőfiszállás - madármegfigyelő”). */
const UNCLOSED = /^\(([^)]+)$/u;

/** A jelzés-alakzat jele az ikonon; `null` = sáv (a jelzés színes csíkja). */
const SHAPE_GLYPHS: Readonly<Record<string, string | null>> = {
	SAV: null,
	KERESZT: '+',
	HAROMSZOG: '▲',
	KOR: '●',
	NEGYSZOG: '■',
	PONT: '•',
	OMEGA: 'Ω',
	ROM: 'L',
	KILATO: '♟',
	TEMPLOM: '✞',
	EMLEKMU: '♜',
	HAZ: '⌂',
};
/** Egy betűjeles jelzés (pl. `LILA_M` Mária út) betűje ennyi karakterig kerül az ikonra. */
const MAX_LETTER_LENGTH = 3;

export type CatalogSort = 'name' | 'distance';

export interface MarkingBadge {
	color: string;
	casing: string;
	/** `null`: sáv-jelzés, az ikon egy színes csík. */
	glyph: string | null;
}

/**
 * backlog/216 — a katalógus-túra címe a név eleji jelzés-rövidítés nélkül: „P (Dömös – Budaörs)” →
 * „Dömös – Budaörs”, „K, OKT 16. (…)” → „OKT 16. (…)”. A jelzést a {@link markingBadge} ikonja mutatja.
 */
export function curatedRouteTitle(name: string, symbol: string | null | undefined): string {
	const colorName = symbol ? trailSegmentMarkingColorName(symbol) : null;
	const letter = colorName === null ? undefined : PREFIX_LETTERS[colorName];
	if (letter === undefined) {
		return name;
	}
	const stripped = name.replace(new RegExp(`^${letter}${PREFIX_SUFFIX}`, 'u'), '');
	if (stripped === name) {
		return name;
	}
	const unwrapped = (WRAPPED.exec(stripped)?.[1] ?? UNCLOSED.exec(stripped)?.[1] ?? stripped).trim();
	return unwrapped === '' ? name : unwrapped;
}

/** backlog/216 — a jelzés ikonja a katalógus-sorban; `null`, ha a túrának nincs színes jelzése. */
export function markingBadge(symbol: string | null | undefined): MarkingBadge | null {
	const colorName = symbol ? trailSegmentMarkingColorName(symbol) : null;
	if (!symbol || colorName === null) {
		return null;
	}
	const suffix = symbol.slice(colorName.length + 1);
	let glyph: string | null = null;
	if (suffix in SHAPE_GLYPHS) {
		glyph = SHAPE_GLYPHS[suffix];
	} else if (suffix !== '' && suffix !== 'JEL' && suffix.length <= MAX_LETTER_LENGTH) {
		glyph = suffix;
	}
	return { color: MARKING_COLORS[colorName], casing: trailSegmentCasingColor(symbol), glyph };
}

/**
 * backlog/216 — a katalógus-lista: a keresés a teljes OSM-nevre illeszt (ékezet- és kisbetű-függetlenül,
 * shared/text-search), a rendezés a cím szerint (a nyelv ábécéjével, a számokat értékük szerint:
 * „OKT 2.” a „OKT 10.” előtt) vagy táv szerint növekvő.
 */
export function visibleCuratedRoutes(
	routes: readonly CuratedRoute[],
	query: string,
	sort: CatalogSort,
	language: string,
): CuratedRoute[] {
	const matching = routes.filter((route) => matchesSearch(query, route.name));
	if (sort === 'distance') {
		return matching.sort((a, b) => a.distanceMeters - b.distanceMeters);
	}
	const collator = new Intl.Collator(language, { numeric: true, sensitivity: 'base' });
	const titles = new Map(matching.map((route) => [route.id, curatedRouteTitle(route.name, route.symbol)]));
	return matching.sort((a, b) => collator.compare(titles.get(a.id) ?? a.name, titles.get(b.id) ?? b.name));
}

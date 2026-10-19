/**
 * backlog/tura-utvonaltervezo/103-..., backlog/198 — MTSZ turistajelzés-szín a jelzés-típusból
 * (TrailSegment.symbol). A kód `<SZÍN>_<ALAKZAT>` szerkezetű (`PIROS_SAV`, `KEK_PONT`, `LILA_M`, …);
 * a vonal színe csak a szín-előtagból adódik, az alakzat a jelmagyarázatban és a kártyán látszik.
 * Szín nélküli (`EGYEB`) vagy ismeretlen jelzés: jelzés nélküli út — vékony, halvány vonal, sosem tűnik el.
 */
export const MARKING_COLORS: Readonly<Record<string, string>> = {
	PIROS: '#d32f2f',
	KEK: '#1565c0',
	ZOLD: '#2e7d32',
	SARGA: '#f9a825',
	LILA: '#6a1b9a',
	NARANCS: '#ef6c00',
	FEKETE: '#212121',
	BARNA: '#6d4c41',
	FEHER: '#ffffff',
};

export const UNMARKED_TRAIL_COLOR = '#757575';

/** A jelzés szín-előtagja (`PIROS`, `KEK`, …), vagy `null`, ha a kódból nem olvasható ki szín. */
export function trailSegmentMarkingColorName(symbol: string): string | null {
	const prefix = symbol.split('_')[0];
	return prefix in MARKING_COLORS ? prefix : null;
}

/** A szakasz vonalszíne; jelzés nélküli útra a halvány szürke. */
export function trailSegmentSymbolColor(symbol: string): string {
	const name = trailSegmentMarkingColorName(symbol);
	return name === null ? UNMARKED_TRAIL_COLOR : MARKING_COLORS[name];
}

/** A vonal kontúrja: fehér, hogy a jelzés a szatellitképen is kiemelkedjen — a fehér jelzésé sötét. */
export function trailSegmentCasingColor(symbol: string): string {
	return trailSegmentMarkingColorName(symbol) === 'FEHER' ? '#616161' : '#ffffff';
}

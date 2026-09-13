/**
 * backlog/tura-utvonaltervezo/103-... — MTSZ turistajelzés-szín, a jelzés-típus (TrailSegment.symbol)
 * alapján. Ismeretlen/egyéb jelzés szürke — sosem tűnik el a rétegről, csak nem kap sáv-színt.
 */
const SYMBOL_COLORS: Readonly<Record<string, string>> = {
	PIROS_SAV: '#d32f2f',
	KEK_SAV: '#1565c0',
	ZOLD_SAV: '#2e7d32',
	SARGA_SAV: '#f9a825',
	PIROS_KERESZT: '#d32f2f',
	KEK_HAROMSZOG: '#1565c0',
};

export function trailSegmentSymbolColor(symbol: string): string {
	return SYMBOL_COLORS[symbol] ?? '#757575';
}

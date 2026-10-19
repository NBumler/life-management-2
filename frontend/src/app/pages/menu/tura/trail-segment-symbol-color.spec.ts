import { trailSegmentCasingColor, trailSegmentMarkingColorName, trailSegmentSymbolColor } from './trail-segment-symbol-color';

describe('trailSegmentSymbolColor', () => {
	it('returns the MTSZ color for a known symbol', () => {
		expect(trailSegmentSymbolColor('PIROS_SAV')).toBe('#d32f2f');
		expect(trailSegmentSymbolColor('KEK_SAV')).toBe('#1565c0');
	});

	it('takes the color from the <SZÍN>_<ALAKZAT> prefix, whatever the shape (backlog/198)', () => {
		expect(trailSegmentSymbolColor('PIROS_PONT')).toBe('#d32f2f');
		expect(trailSegmentSymbolColor('KEK_KERESZT')).toBe('#1565c0');
		expect(trailSegmentSymbolColor('ZOLD_OMEGA')).toBe('#2e7d32');
		expect(trailSegmentSymbolColor('SARGA_KERESZT')).toBe('#f9a825');
		expect(trailSegmentSymbolColor('LILA_M')).toBe('#6a1b9a');
		expect(trailSegmentSymbolColor('FEKETE_T')).toBe('#212121');
		expect(trailSegmentMarkingColorName('NARANCS_SAV')).toBe('NARANCS');
	});

	it('returns a gray fallback for an unknown symbol, never throwing', () => {
		expect(trailSegmentSymbolColor('EGYEB')).toBe('#757575');
		expect(trailSegmentSymbolColor('anything-else')).toBe('#757575');
		expect(trailSegmentSymbolColor('')).toBe('#757575');
		expect(trailSegmentMarkingColorName('EGYEB')).toBeNull();
	});

	it('a white marking gets a dark casing so it shows on a light map', () => {
		expect(trailSegmentCasingColor('FEHER_SAV')).toBe('#616161');
		expect(trailSegmentCasingColor('KEK_SAV')).toBe('#ffffff');
	});
});

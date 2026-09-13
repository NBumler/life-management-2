import { trailSegmentSymbolColor } from './trail-segment-symbol-color';

describe('trailSegmentSymbolColor', () => {
	it('returns the MTSZ color for a known symbol', () => {
		expect(trailSegmentSymbolColor('PIROS_SAV')).toBe('#d32f2f');
		expect(trailSegmentSymbolColor('KEK_SAV')).toBe('#1565c0');
	});

	it('returns a gray fallback for an unknown symbol, never throwing', () => {
		expect(trailSegmentSymbolColor('EGYEB')).toBe('#757575');
		expect(trailSegmentSymbolColor('anything-else')).toBe('#757575');
	});
});

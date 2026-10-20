import { trailSymbolLabel } from './trail-symbol-text';

describe('trailSymbolLabel (backlog/201)', () => {
	// A kulcs és a paraméterek látszanak a kimenetben, így a választott kulcs ellenőrizhető.
	const translate = (key: string, params?: Record<string, string>) => (params ? `${key}(${params['color']}|${params['shape']})` : key);

	it('names a known shape with its colour', () => {
		expect(trailSymbolLabel('KEK_SAV', translate)).toBe('TURA.TRAIL.NAME(TURA.TRAIL.COLOR.KEK|TURA.TRAIL.SHAPE.SAV)');
		expect(trailSymbolLabel('ZOLD_OMEGA', translate)).toBe('TURA.TRAIL.NAME(TURA.TRAIL.COLOR.ZOLD|TURA.TRAIL.SHAPE.OMEGA)');
	});

	it('writes a letter marking out as the letter', () => {
		expect(trailSymbolLabel('LILA_M', translate)).toBe('TURA.TRAIL.NAME(TURA.TRAIL.COLOR.LILA|M)');
	});

	it('falls back to the colour-only marking for JEL and longer codes', () => {
		expect(trailSymbolLabel('PIROS_JEL', translate)).toBe('TURA.LEGEND.MARKING.PIROS');
		expect(trailSymbolLabel('SARGA_MARIA_UT', translate)).toBe('TURA.LEGEND.MARKING.SARGA');
	});

	it('calls a symbol without a colour an unmarked trail', () => {
		expect(trailSymbolLabel('EGYEB', translate)).toBe('TURA.LEGEND.UNMARKED');
	});
});

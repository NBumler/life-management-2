import { TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import hu from '../../../../assets/i18n/hu.json';
import { TranslatedText, dateText, daySummaryText, distanceText, durationText, elevationText, megabytesText } from './hike-text';

describe('hike-text', () => {
	let translate: TranslateService;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideTranslateService()] });
		translate = TestBed.inject(TranslateService);
		translate.setTranslation('en', en);
		translate.setTranslation('hu', hu);
	});

	function render(language: 'en' | 'hu', text: TranslatedText): string {
		translate.use(language);
		return translate.instant(text.key, text.params);
	}

	describe('durationText (backlog/185)', () => {
		it('hours and minutes in the active language', () => {
			expect(render('en', durationText(91))).toBe('1 h 31 min');
			expect(render('hu', durationText(91))).toBe('1 ó 31 p');
		});

		it('minutes only under an hour', () => {
			expect(render('en', durationText(45))).toBe('45 min');
			expect(render('hu', durationText(45))).toBe('45 p');
		});

		it('rounds to whole minutes before splitting', () => {
			expect(durationText(59.6)).toEqual({ key: 'TURA.DURATION.HOURS_MINUTES', params: { hours: 1, minutes: 0 } });
		});

		it('unknown duration is "~", never 0', () => {
			expect(render('en', durationText(null))).toBe('~');
			expect(render('hu', durationText(undefined))).toBe('~');
		});
	});

	describe('daySummaryText (backlog/186)', () => {
		it('singular for one day in English, plural otherwise', () => {
			expect(render('en', daySummaryText(1))).toBe('1 day');
			expect(render('en', daySummaryText(2))).toBe('2 days');
		});

		it('Hungarian has one form', () => {
			expect(render('hu', daySummaryText(1))).toBe('1 nap');
			expect(render('hu', daySummaryText(3))).toBe('3 nap');
		});
	});

	describe('number formatting (backlog/220)', () => {
		it('decimal comma in Hungarian, decimal point in English', () => {
			expect(distanceText(2940, 'hu')).toBe('2,9 km');
			expect(distanceText(2940, 'en')).toBe('2.9 km');
			expect(distanceText(12000, 'hu')).toBe('12,0 km');
			expect(megabytesText(3.25 * 1024 * 1024, 'hu')).toBe('3,3 MB');
			expect(megabytesText(3.25 * 1024 * 1024, 'en')).toBe('3.3 MB');
		});

		it('elevation is a whole number with the language grouping', () => {
			expect(elevationText(412.6, 'hu')).toBe('413 m');
			expect(elevationText(1234, 'en')).toBe('1,234 m');
			expect(elevationText(12345, 'hu')).toBe('12 345 m');
		});

		it('a value that cannot be computed is ~, never 0', () => {
			expect(distanceText(null, 'hu')).toBe('~');
			expect(elevationText(undefined, 'en')).toBe('~');
		});
	});

	describe('dateText (backlog/212)', () => {
		it('a saved route date in the active language', () => {
			const iso = '2026-10-20T10:00:00Z';
			expect(dateText(iso, 'hu')).toContain('2026');
			expect(dateText(iso, 'hu')).toContain('okt');
			expect(dateText(iso, 'en')).toContain('Oct');
		});
	});
});

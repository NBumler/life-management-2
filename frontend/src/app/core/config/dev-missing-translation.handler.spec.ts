import { TestBed } from '@angular/core/testing';
import { TranslateService, provideMissingTranslationHandler, provideTranslateService } from '@ngx-translate/core';

import { DevMissingTranslationHandler } from './dev-missing-translation.handler';

describe('DevMissingTranslationHandler (backlog/015)', () => {
  let translate: TranslateService;
  let warnSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService({
          lang: 'hu',
          fallbackLang: 'hu',
          missingTranslationHandler: provideMissingTranslationHandler(DevMissingTranslationHandler),
        }),
      ],
    });
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('hu', { COMMON: { SAVE: 'Mentés' } });
    translate.use('hu');
    warnSpy = spyOn(console, 'warn');
  });

  it('renders the raw key for a missing translation and warns once per key in dev mode', () => {
    expect(translate.instant('COMMON.NOPE')).toBe('COMMON.NOPE');
    expect(translate.instant('COMMON.NOPE')).toBe('COMMON.NOPE');
    expect(warnSpy).toHaveBeenCalledOnceWith('[i18n] Missing translation key: COMMON.NOPE');
  });

  it('stays silent for a key that exists', () => {
    expect(translate.instant('COMMON.SAVE')).toBe('Mentés');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

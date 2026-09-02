import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { LanguageService } from './language.service';

/**
 * documentation/Features/Nyelv választás.md "Három állapot": Rendszer módban a készülék nyelve,
 * ha hu vagy en; egyébként hu (a magyar a fallback, nem az angol).
 */
describe('LanguageService', () => {
  let service: LanguageService;
  const originalLanguage = navigator.language;

  function setNavigatorLanguage(value: string): void {
    Object.defineProperty(navigator, 'language', { value, configurable: true });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LanguageService, { provide: TranslateService, useValue: { use: jasmine.createSpy('use') } }],
    });
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    setNavigatorLanguage(originalLanguage);
  });

  it('resolves system mode to en for an English device locale', () => {
    setNavigatorLanguage('en-US');
    expect(service.activeLanguage()).toBe('en');
  });

  it('resolves system mode to hu for a Hungarian device locale', () => {
    setNavigatorLanguage('hu-HU');
    expect(service.activeLanguage()).toBe('hu');
  });

  it('falls back to hu for an unsupported device locale, not en', () => {
    setNavigatorLanguage('de-DE');
    expect(service.activeLanguage()).toBe('hu');
  });

  it('honours a fixed mode regardless of the device locale', () => {
    setNavigatorLanguage('de-DE');
    service.mode.set('en');
    expect(service.activeLanguage()).toBe('en');
    service.mode.set('hu');
    expect(service.activeLanguage()).toBe('hu');
  });
});

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ActiveLanguage, LanguageService } from '../config/language.service';
import { SpeechGateway } from './speech.gateway';
import { SpeechService } from './speech.service';

describe('SpeechService (backlog/106)', () => {
  let gateway: jasmine.SpyObj<SpeechGateway>;
  let language: ReturnType<typeof signal<ActiveLanguage>>;
  let service: SpeechService;

  beforeEach(() => {
    gateway = jasmine.createSpyObj('SpeechGateway', ['speak', 'isLanguageSupported', 'stop']);
    gateway.speak.and.resolveTo();
    gateway.isLanguageSupported.and.resolveTo(true);
    gateway.stop.and.resolveTo();
    language = signal<ActiveLanguage>('hu');
    TestBed.configureTestingModule({
      providers: [
        { provide: SpeechGateway, useValue: gateway },
        { provide: LanguageService, useValue: { activeLanguage: language } },
      ],
    });
    service = TestBed.inject(SpeechService);
  });

  it('speaks in the app language', async () => {
    await service.speak('Most fordulj balra');
    language.set('en');
    await service.speak('Now turn left');

    expect(gateway.speak.calls.allArgs()).toEqual([
      ['Most fordulj balra', 'hu-HU'],
      ['Now turn left', 'en-US'],
    ]);
  });

  it('asks the engine about a language once', async () => {
    await service.speak('a');
    await service.speak('b');

    expect(gateway.isLanguageSupported).toHaveBeenCalledTimes(1);
  });

  it('stays silent without a voice for the language, or without an engine', async () => {
    gateway.isLanguageSupported.and.resolveTo(false);
    await service.speak('a');
    expect(gateway.speak).not.toHaveBeenCalled();

    language.set('en');
    gateway.isLanguageSupported.and.rejectWith(new Error('no engine'));
    await expectAsync(service.speak('b')).toBeResolved();
    expect(gateway.speak).not.toHaveBeenCalled();
  });

  it('a speak error never reaches the caller', async () => {
    gateway.speak.and.rejectWith(new Error('busy'));
    await expectAsync(service.speak('a')).toBeResolved();
  });
});

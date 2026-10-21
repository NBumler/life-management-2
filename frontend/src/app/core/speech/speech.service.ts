import { Injectable, inject } from '@angular/core';

import { ActiveLanguage, LanguageService } from '../config/language.service';
import { SpeechGateway } from './speech.gateway';

const SPEECH_LANGUAGE: Readonly<Record<ActiveLanguage, string>> = { hu: 'hu-HU', en: 'en-US' };

/**
 * backlog/106 — spoken announcements in the app's language. Best effort: a device without a TTS
 * engine or without a voice for the language stays silent (navigation still vibrates and notifies),
 * and an error never reaches the caller.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly gateway = inject(SpeechGateway);
  private readonly language = inject(LanguageService);
  /** Per language: whether the engine has a voice for it, asked once. */
  private readonly supported = new Map<string, Promise<boolean>>();

  async speak(text: string): Promise<void> {
    const lang = SPEECH_LANGUAGE[this.language.activeLanguage()];
    try {
      if (!(await this.isSupported(lang))) {
        return;
      }
      await this.gateway.speak(text, lang);
    } catch {
      // no TTS engine: silent
    }
  }

  async stop(): Promise<void> {
    try {
      await this.gateway.stop();
    } catch {
      // nothing being spoken
    }
  }

  private isSupported(lang: string): Promise<boolean> {
    let answer = this.supported.get(lang);
    if (answer === undefined) {
      answer = this.gateway.isLanguageSupported(lang).catch(() => false);
      this.supported.set(lang, answer);
    }
    return answer;
  }
}

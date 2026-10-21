import { Injectable } from '@angular/core';
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech';

/**
 * Thin injectable wrapper over `@capacitor-community/text-to-speech` (Android: the system TTS engine,
 * offline; web: the browser's `speechSynthesis`). Exists for the same reason as
 * `LocalNotificationsGateway`: Capacitor's `registerPlugin` returns a Proxy whose methods can't be
 * `spyOn`-ed. No logic here — every method forwards straight to the plugin.
 */
@Injectable({ providedIn: 'root' })
export class SpeechGateway {
  /** A newer announcement replaces the one still being spoken (`Flush`) — only the latest is relevant. */
  speak(text: string, lang: string): Promise<void> {
    return TextToSpeech.speak({ text, lang, queueStrategy: QueueStrategy.Flush });
  }

  isLanguageSupported(lang: string): Promise<boolean> {
    return TextToSpeech.isLanguageSupported({ lang }).then((result) => result.supported);
  }

  stop(): Promise<void> {
    return TextToSpeech.stop();
  }
}

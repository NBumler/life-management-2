import { Injectable, computed, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

const PREFERENCES_KEY = 'lm2_language';

export type LanguageMode = 'system' | 'hu' | 'en';
export type ActiveLanguage = 'hu' | 'en';

/** documentation/Subfeatures/Nyelv választás.md: device-local, drives ngx-translate. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly mode = signal<LanguageMode>('system');
  readonly activeLanguage = computed<ActiveLanguage>(() => (this.mode() === 'system' ? systemLanguage() : this.mode()) as ActiveLanguage);

  /** Cold start step 2. */
  async init(): Promise<void> {
    const stored = await Preferences.get({ key: PREFERENCES_KEY });
    if (isLanguageMode(stored.value)) {
      this.mode.set(stored.value);
    }
    this.translate.use(this.activeLanguage());
  }

  async setMode(mode: LanguageMode): Promise<void> {
    this.mode.set(mode);
    this.translate.use(this.activeLanguage());
    await Preferences.set({ key: PREFERENCES_KEY, value: mode });
  }
}

function systemLanguage(): ActiveLanguage {
  return navigator.language.toLowerCase().startsWith('hu') ? 'hu' : 'en';
}

function isLanguageMode(value: string | null): value is LanguageMode {
  return value === 'system' || value === 'hu' || value === 'en';
}

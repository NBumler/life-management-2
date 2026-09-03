import { Injectable, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Style, StatusBar } from '@capacitor/status-bar';

const PREFERENCES_KEY = 'lm2_theme';

export type ThemeMode = 'system' | 'light' | 'dark';

/** documentation/Subfeatures/Dark&Light mode.md: device-local, Ionic's `ion-palette-dark` class strategy. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  /** Mirrors `media.matches` as a signal so `isDark` recomputes on a live OS scheme change, not just on `mode` changes. */
  private readonly systemDark = signal(this.media.matches);

  readonly mode = signal<ThemeMode>('system');
  readonly isDark = computed(() => this.mode() === 'dark' || (this.mode() === 'system' && this.systemDark()));

  constructor() {
    this.media.addEventListener('change', () => {
      this.systemDark.set(this.media.matches);
      if (this.mode() === 'system') {
        this.apply();
      }
    });
  }

  /** Cold start step 2 — synchronous-feeling but reads Preferences, so callers should await it before first paint. */
  async init(): Promise<void> {
    const stored = await Preferences.get({ key: PREFERENCES_KEY });
    if (isThemeMode(stored.value)) {
      this.mode.set(stored.value);
    }
    this.apply();
  }

  async setMode(mode: ThemeMode): Promise<void> {
    this.mode.set(mode);
    this.apply();
    await Preferences.set({ key: PREFERENCES_KEY, value: mode });
  }

  private apply(): void {
    const dark = this.isDark();
    document.documentElement.classList.toggle('ion-palette-dark', dark);
    if (Capacitor.isNativePlatform()) {
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    }
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { ThemeService } from './theme.service';

const PREFERENCES_KEY = 'lm2_theme';

/**
 * documentation/Subfeatures/Dark&Light mode.md "Három állapot": system / light / dark, device-local
 * via @capacitor/preferences; `system` follows `prefers-color-scheme`. `isDark` drives the
 * `ion-palette-dark` class on <html>.
 */
describe('ThemeService', () => {
  let mediaMatches: boolean;
  let mediaChangeHandler: (() => void) | null;

  function createService(): ThemeService {
    mediaChangeHandler = null;
    const fakeMedia = {
      get matches() {
        return mediaMatches;
      },
      addEventListener: (_type: string, cb: () => void) => {
        mediaChangeHandler = cb;
      },
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(fakeMedia);

    TestBed.configureTestingModule({ providers: [ThemeService] });
    return TestBed.inject(ThemeService);
  }

  beforeEach(async () => {
    mediaMatches = false;
    await Preferences.remove({ key: PREFERENCES_KEY });
    document.documentElement.classList.remove('ion-palette-dark');
  });

  afterEach(async () => {
    await Preferences.remove({ key: PREFERENCES_KEY });
    document.documentElement.classList.remove('ion-palette-dark');
  });

  it('defaults to system mode and, on a light device, resolves to not-dark', async () => {
    const service = createService();
    await service.init();

    expect(service.mode()).toBe('system');
    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeFalse();
  });

  it('system mode follows prefers-color-scheme: dark', async () => {
    mediaMatches = true;
    const service = createService();
    await service.init();

    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTrue();
  });

  it('init() restores a stored explicit mode', async () => {
    await Preferences.set({ key: PREFERENCES_KEY, value: 'dark' });
    const service = createService();
    await service.init();

    expect(service.mode()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTrue();
  });

  it('init() ignores a corrupt stored value and stays in system mode', async () => {
    await Preferences.set({ key: PREFERENCES_KEY, value: 'sepia' });
    const service = createService();
    await service.init();

    expect(service.mode()).toBe('system');
  });

  it('an explicit dark mode overrides a light device', async () => {
    mediaMatches = false;
    const service = createService();
    await service.init();

    await service.setMode('dark');

    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTrue();
    expect((await Preferences.get({ key: PREFERENCES_KEY })).value).toBe('dark');
  });

  it('an explicit light mode overrides a dark device', async () => {
    mediaMatches = true;
    const service = createService();
    await service.init();

    await service.setMode('light');

    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeFalse();
    expect((await Preferences.get({ key: PREFERENCES_KEY })).value).toBe('light');
  });

  it('reacts to an OS scheme change while in system mode', async () => {
    const service = createService();
    await service.init();
    expect(service.isDark()).toBeFalse();

    mediaMatches = true;
    mediaChangeHandler?.();

    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeTrue();
  });

  it('ignores an OS scheme change once a fixed mode is chosen', async () => {
    const service = createService();
    await service.init();
    await service.setMode('light');

    mediaMatches = true;
    mediaChangeHandler?.();

    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBeFalse();
  });
});

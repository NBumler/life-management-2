import { Injectable, isDevMode } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';

/**
 * documentation/Features/Nyelv választás.md "Hiányzó kulcs" (backlog/015) — reached only when a key is
 * missing from the current language AND the `hu` fallback. Keeps the library default (the raw key is
 * rendered, never an empty string); in a dev build it also logs one `console.warn` per key, so a typo or
 * a dynamically built key (`'SYNC.STATE_' + state`) that `npm run verify:i18n` can't see statically
 * shows up while clicking through the app. Production builds stay silent.
 */
@Injectable()
export class DevMissingTranslationHandler implements MissingTranslationHandler {
  private readonly warned = new Set<string>();

  handle(params: MissingTranslationHandlerParams): string {
    if (isDevMode() && !this.warned.has(params.key)) {
      this.warned.add(params.key);
      console.warn(`[i18n] Missing translation key: ${params.key}`);
    }
    return params.key;
  }
}

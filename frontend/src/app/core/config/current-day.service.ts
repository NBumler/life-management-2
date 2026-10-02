import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import { today } from '../../shared/local-date';

/** How often a long-open screen re-checks the calendar day (cheap — the signal only fires on change). */
const CHECK_INTERVAL_MS = 60_000;

/**
 * backlog/144 — "ma" as a signal: the client calendar day (`today()`), re-read when the app comes back
 * to the foreground (`visibilitychange` — also fires on a native resume inside the WebView) and once a
 * minute, so a screen left open over midnight (forecast, load warnings) moves on to the new day.
 */
@Injectable({ providedIn: 'root' })
export class CurrentDayService {
  private readonly current = signal(today());
  readonly day = this.current.asReadonly();

  constructor() {
    const refresh = () => this.refresh();
    document.addEventListener('visibilitychange', refresh);
    const handle = setInterval(refresh, CHECK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(handle);
    });
  }

  /** Re-reads the calendar day; a no-op for the signal's readers while the day is unchanged. */
  refresh(): void {
    this.current.set(today());
  }
}

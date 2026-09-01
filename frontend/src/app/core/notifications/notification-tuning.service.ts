import { Injectable, Signal, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { DEFAULT_TUNING, NotificationTuning, sanitizeTuning } from './notification-tuning';

// Re-exported for existing importers; the source of truth is the Angular-free `./notification-tuning`.
export { DEFAULT_TUNING, TUNING_BOUNDS } from './notification-tuning';
export type { NotificationTuning } from './notification-tuning';

const PREFERENCES_KEY = 'lm2_notifTuning';

/**
 * Device-local store for {@link NotificationTuning}. Same shape as
 * {@link NotificationSettingsService} — a `@capacitor/preferences` JSON blob read once at cold start,
 * not synced, not a feature flag. The scheduler reacts to {@link tuning} via an `effect`. The pure
 * contract (defaults, bounds, clamp) lives in `./notification-tuning`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationTuningService {
  private readonly state = signal<NotificationTuning>({ ...DEFAULT_TUNING });

  /** Reactive snapshot of every threshold. */
  readonly tuning: Signal<NotificationTuning> = this.state.asReadonly();

  /** Cold-start sibling of {@link NotificationSettingsService.init}. Missing / bad fields keep their default. */
  async init(): Promise<void> {
    const stored = (await Preferences.get({ key: PREFERENCES_KEY })).value;
    if (stored === null) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Partial<Record<keyof NotificationTuning, unknown>>;
      this.state.set(sanitizeTuning(parsed, DEFAULT_TUNING));
    } catch {
      // Corrupt blob — keep defaults, the next set() rewrites it clean.
    }
  }

  /** Merge a partial edit, clamp every field, persist. A non-finite patch field keeps the current stored value. */
  async set(patch: Partial<NotificationTuning>): Promise<void> {
    this.state.set(sanitizeTuning(patch, this.state()));
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.state()) });
  }

  /** Back to the spec defaults. */
  async reset(): Promise<void> {
    this.state.set({ ...DEFAULT_TUNING });
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.state()) });
  }
}

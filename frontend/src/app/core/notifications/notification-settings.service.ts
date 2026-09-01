import { Injectable, Signal, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { NOTIFICATION_TYPES, NotificationType } from './notification-types';

const PREFERENCES_KEY = 'lm2_notifications';

export type NotificationEnabledMap = Record<NotificationType, boolean>;

/**
 * documentation/Features/Értesítések.md "Beállítások UI" + documentation/Architektúra/Frontend.md:
 * per-type on/off switches, **device-local** (not synced, not a feature flag). Same shape as
 * {@link ThemeService} / {@link LanguageService} — a `@capacitor/preferences` JSON blob read once at
 * cold start. Every type defaults to **on** (the spec's round-one "aktív típusok").
 *
 * Deliberately does not depend on the scheduler (that would be a DI cycle): callers persist through
 * here and the scheduler reacts to {@link enabled} via an `effect`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSettingsService {
  private readonly map = signal<NotificationEnabledMap>(allEnabled());

  /** Reactive snapshot of every type's on/off state. */
  readonly enabled: Signal<NotificationEnabledMap> = this.map.asReadonly();

  isEnabled(type: NotificationType): boolean {
    return this.map()[type];
  }

  /** Cold-start step 2 sibling — reads Preferences, unknown/missing keys stay at their default (on). */
  async init(): Promise<void> {
    const stored = (await Preferences.get({ key: PREFERENCES_KEY })).value;
    if (stored === null) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Partial<Record<string, unknown>>;
      const next = allEnabled();
      for (const type of NOTIFICATION_TYPES) {
        if (typeof parsed[type] === 'boolean') {
          next[type] = parsed[type] as boolean;
        }
      }
      this.map.set(next);
    } catch {
      // Corrupt blob — keep defaults, next setEnabled() rewrites it clean.
    }
  }

  async setEnabled(type: NotificationType, value: boolean): Promise<void> {
    this.map.update((current) => ({ ...current, [type]: value }));
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.map()) });
  }
}

function allEnabled(): NotificationEnabledMap {
  const map = {} as NotificationEnabledMap;
  for (const type of NOTIFICATION_TYPES) {
    map[type] = true;
  }
  return map;
}

import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { addDaysIso } from '../../shared/local-date';
import { LIFETIME_DEDUPE_TYPES, NotificationType } from './notification-types';

const PREFERENCES_KEY = 'lm2_notifDedupe';
const RETENTION_DAYS = 35;

interface DedupeEntry {
  type: NotificationType;
  key: string;
  /** Calendar day the entry was recorded (client TZ) — only used for retention pruning. */
  day: string;
}

/**
 * documentation/Features/Értesítések.md "Ismétlés-védelem (deduplikáció)": a local "already sent"
 * log so an OS/app restart or a repeated scheduler run never re-fires the same logical notification.
 * Keyed by `type` + `key` (the `DesiredNotification.key`, which already embeds the calendar day for
 * every daily type and omits it for the once-per-lifetime `FOOD_SPOILED_ONCE`).
 *
 * documentation/Features/Értesítések.md "Nyelvváltás → újraütemezés": the log is **not** cleared on a
 * language change — what already went out today must not go out again in another language.
 */
@Injectable({ providedIn: 'root' })
export class NotificationDedupeStore {
  private entries: DedupeEntry[] | null = null;

  private async all(): Promise<DedupeEntry[]> {
    if (this.entries === null) {
      const raw = (await Preferences.get({ key: PREFERENCES_KEY })).value;
      this.entries = raw === null ? [] : safeParse(raw);
    }
    return this.entries;
  }

  async has(type: NotificationType, key: string): Promise<boolean> {
    return (await this.all()).some((entry) => entry.type === type && entry.key === key);
  }

  async record(type: NotificationType, key: string, todayIso: string): Promise<void> {
    const entries = await this.all();
    if (entries.some((entry) => entry.type === type && entry.key === key)) {
      return;
    }
    entries.push({ type, key, day: todayIso });
    await this.persist();
  }

  /**
   * Drop entries older than the retention window so the blob can't grow without bound —
   * **except** {@link LIFETIME_DEDUPE_TYPES}, whose "1 / élettartam" guarantee (spec
   * "Ismétlés-védelem") would otherwise be lost once its entry aged past the window and let the
   * same once-per-lifetime notification fire again.
   */
  async prune(todayIso: string): Promise<void> {
    const cutoff = addDaysIso(todayIso, -RETENTION_DAYS);
    const entries = await this.all();
    const kept = entries.filter((entry) => LIFETIME_DEDUPE_TYPES.has(entry.type) || entry.day >= cutoff);
    if (kept.length !== entries.length) {
      this.entries = kept;
      await this.persist();
    }
  }

  private async persist(): Promise<void> {
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.entries ?? []) });
  }
}

function safeParse(raw: string): DedupeEntry[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is DedupeEntry =>
        typeof entry === 'object' && entry !== null && 'type' in entry && 'key' in entry && 'day' in entry,
    );
  } catch {
    return [];
  }
}

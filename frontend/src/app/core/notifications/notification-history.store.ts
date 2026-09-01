import { Injectable, Signal, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { NotificationType } from './notification-types';

const PREFERENCES_KEY = 'lm2_notifHistory';
/** Keep the blob bounded — a read-only log, oldest entries fall off the end. */
const MAX_ENTRIES = 60;

export interface NotificationHistoryEntry {
  type: NotificationType;
  /** The `DesiredNotification.key` — used to de-duplicate a re-inferred delivery of the same banner. */
  key: string;
  /** Rendered (already translated) text at delivery time — the log never re-renders on a later language change. */
  title: string;
  body: string;
  /** Router URL the banner opened; the history row re-uses it so a tap still lands on the right screen. */
  route: string;
  /** Epoch ms the banner actually went out (or the scheduler inferred it had). */
  firedAt: number;
}

/**
 * documentation/Features/Értesítések.md "Értesítés-előzmény lista" — a read-only log of the banners
 * that actually went out, newest first. Device-local (`@capacitor/preferences`), not synced, not a
 * feature flag — same shape as {@link NotificationSettingsService}.
 *
 * The scheduler ({@link NotificationSchedulerService}) is the only writer: it appends here at the
 * same three points it records dedupe — an immediate past-due fire, a scheduled notification whose
 * delivery it infers on the next reconcile, and a banner the native background worker fired while the
 * app was closed. A `(type, key)` pair is logged at most once (the key already embeds the calendar
 * day for every daily type), so a repeated reconcile never double-adds.
 */
@Injectable({ providedIn: 'root' })
export class NotificationHistoryStore {
  private readonly list = signal<NotificationHistoryEntry[]>([]);
  /**
   * Guards {@link record} against racing ahead of {@link init}: `list` starts `[]`, and
   * {@link persist} writes it unconditionally, so a `record()` before the cold-start load would
   * otherwise overwrite the persisted log with a single entry. Set by both `init()` and the lazy
   * load in `ensureLoaded()`.
   */
  private loaded = false;

  /** Reactive snapshot, newest first. */
  readonly entries: Signal<readonly NotificationHistoryEntry[]> = this.list.asReadonly();

  /** Cold-start sibling of {@link NotificationSettingsService.init} — (re-)reads Preferences. */
  async init(): Promise<void> {
    const raw = (await Preferences.get({ key: PREFERENCES_KEY })).value;
    this.list.set(raw === null ? [] : safeParse(raw));
    this.loaded = true;
  }

  /**
   * Append one delivered banner. A no-op when `(type, key)` is already logged — a reconcile can
   * re-infer the same delivery across restarts and must not stack duplicate rows.
   */
  async record(entry: NotificationHistoryEntry): Promise<void> {
    await this.ensureLoaded();
    if (this.list().some((e) => e.type === entry.type && e.key === entry.key)) {
      return;
    }
    const next = [entry, ...this.list()]
      .sort((a, b) => b.firedAt - a.firedAt)
      .slice(0, MAX_ENTRIES);
    this.list.set(next);
    await this.persist();
  }

  async clear(): Promise<void> {
    this.loaded = true; // an explicit wipe is authoritative — no need to load first
    this.list.set([]);
    await this.persist();
  }

  /** Load the persisted log on the first write that beats {@link init} (main.ts reorder, extra caller). */
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.init();
    }
  }

  private async persist(): Promise<void> {
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.list()) });
  }
}

function safeParse(raw: string): NotificationHistoryEntry[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (e): e is NotificationHistoryEntry =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as NotificationHistoryEntry).type === 'string' &&
          typeof (e as NotificationHistoryEntry).key === 'string' &&
          typeof (e as NotificationHistoryEntry).firedAt === 'number',
      )
      .map((e) => ({
        type: e.type,
        key: e.key,
        title: typeof e.title === 'string' ? e.title : '',
        body: typeof e.body === 'string' ? e.body : '',
        route: typeof e.route === 'string' ? e.route : '',
        firedAt: e.firedAt,
      }))
      .sort((a, b) => b.firedAt - a.firedAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

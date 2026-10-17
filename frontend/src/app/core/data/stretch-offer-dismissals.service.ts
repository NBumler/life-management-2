import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { today } from '../../shared/local-date';

interface StoredDismissals {
  date: string;
  workoutSessionIds: string[];
}

const PREFERENCES_KEY = 'lm2_stretch_offer_dismissed';

/**
 * documentation/Subfeatures/Heti terv.md "Csatolt nyújtás" (backlog/170) — the strength sessions whose
 * "Nyújtás indítása" card was hidden (×) today. Device-local display state only (whether a stretch is
 * still pending comes from `StretchSession.workoutSessionId`); a new day starts with an empty list.
 */
@Injectable({ providedIn: 'root' })
export class StretchOfferDismissalsService {
  private readonly stored = signal<StoredDismissals>({ date: today(), workoutSessionIds: [] });

  /** Today's dismissed workout-session ids (an older day's list reads as empty). */
  readonly dismissed = computed<ReadonlySet<string>>(() => {
    const value = this.stored();
    return new Set(value.date === today() ? value.workoutSessionIds : []);
  });

  async refresh(): Promise<void> {
    try {
      const raw = (await Preferences.get({ key: PREFERENCES_KEY })).value;
      const parsed = raw ? (JSON.parse(raw) as StoredDismissals) : null;
      this.stored.set(parsed && parsed.date === today() ? parsed : { date: today(), workoutSessionIds: [] });
    } catch {
      this.stored.set({ date: today(), workoutSessionIds: [] });
    }
  }

  async dismiss(workoutSessionId: string): Promise<void> {
    const ids = [...this.dismissed(), workoutSessionId];
    const next: StoredDismissals = { date: today(), workoutSessionIds: [...new Set(ids)] };
    this.stored.set(next);
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(next) });
  }
}

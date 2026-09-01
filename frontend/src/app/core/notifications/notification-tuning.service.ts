import { Injectable, Signal, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const PREFERENCES_KEY = 'lm2_notifTuning';

/**
 * documentation/Features/Értesítések.md "Lead-time szerkesztő" — the notification thresholds that
 * used to be fixed constants in {@link notification-rules}, made device-local and editable. The fixed
 * 09:00 / 20:00 fire times stay hard-coded (they're wired to the native AlarmManager slots), as does
 * the structural `> 5 nap` catalog split and the 5-day calorie-streak length.
 */
export interface NotificationTuning {
  /** `FOOD_EXPIRING_DAILY` lead window when the catalog shelf-life for the location is > 5 days (spec default 3). */
  foodExpiringLeadDaysLong: number;
  /** `FOOD_EXPIRING_DAILY` lead window for short / unknown shelf-life (spec default 2). */
  foodExpiringLeadDaysShort: number;
  /** `STEPS_LOW` fires at 20:00 when today's steps are below this (spec default 2000). */
  stepsLowThreshold: number;
  /** `CALORIE_STREAK` counts a day only when `intake > allowance + this` (spec default 750). */
  calorieStreakMarginKcal: number;
}

export const DEFAULT_TUNING: Readonly<NotificationTuning> = {
  foodExpiringLeadDaysLong: 3,
  foodExpiringLeadDaysShort: 2,
  stepsLowThreshold: 2000,
  calorieStreakMarginKcal: 750,
};

/** Inclusive min/max each field is clamped to before it's stored or handed to the rules. */
export const TUNING_BOUNDS: Readonly<Record<keyof NotificationTuning, { min: number; max: number }>> = {
  foodExpiringLeadDaysLong: { min: 1, max: 30 },
  foodExpiringLeadDaysShort: { min: 1, max: 30 },
  stepsLowThreshold: { min: 0, max: 20000 },
  calorieStreakMarginKcal: { min: 0, max: 5000 },
};

/**
 * Device-local store for {@link NotificationTuning}. Same shape as
 * {@link NotificationSettingsService} — a `@capacitor/preferences` JSON blob read once at cold start,
 * not synced, not a feature flag. The scheduler reacts to {@link tuning} via an `effect`.
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
      this.state.set(sanitize(parsed));
    } catch {
      // Corrupt blob — keep defaults, the next set() rewrites it clean.
    }
  }

  /** Merge a partial edit, clamp every field, persist. */
  async set(patch: Partial<NotificationTuning>): Promise<void> {
    this.state.set(sanitize({ ...this.state(), ...patch }));
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.state()) });
  }

  /** Back to the spec defaults. */
  async reset(): Promise<void> {
    this.state.set({ ...DEFAULT_TUNING });
    await Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(this.state()) });
  }
}

function sanitize(raw: Partial<Record<keyof NotificationTuning, unknown>>): NotificationTuning {
  const out = { ...DEFAULT_TUNING };
  for (const key of Object.keys(DEFAULT_TUNING) as (keyof NotificationTuning)[]) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const { min, max } = TUNING_BOUNDS[key];
      out[key] = Math.min(max, Math.max(min, Math.round(value)));
    }
  }
  return out;
}

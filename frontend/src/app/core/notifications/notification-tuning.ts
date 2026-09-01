/**
 * documentation/Features/Értesítések.md "Lead-time szerkesztő" — the pure tuning contract: the
 * threshold shape, the spec defaults, the clamp bounds and the sanitizer. No Angular / Capacitor
 * import, so both {@link NotificationTuningService} (the device-local store) and the Angular-free
 * {@link buildBackgroundPlan} / {@link notification-rules} can depend on it without pulling the DI
 * layer into their graph.
 *
 * These four values used to be fixed constants in {@link notification-rules}; the editor makes them
 * device-local overrides. The fixed 09:00 / 20:00 fire times stay hard-coded (wired to the native
 * AlarmManager slots), as does the structural `> 5 nap` catalog split and the 5-day
 * calorie-streak length.
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
 * Clamp + round every field of `raw` that is a finite number; a field that is missing or not a
 * finite number falls back to `base`. `init()` passes {@link DEFAULT_TUNING} as `base` (a bad blob
 * field → spec default); `set()` passes the current state (a bad patch field → keep the user's
 * stored value, never silently snap it back to the default).
 */
export function sanitizeTuning(
  raw: Partial<Record<keyof NotificationTuning, unknown>>,
  base: NotificationTuning = DEFAULT_TUNING,
): NotificationTuning {
  const out = { ...base };
  for (const key of Object.keys(DEFAULT_TUNING) as (keyof NotificationTuning)[]) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const { min, max } = TUNING_BOUNDS[key];
      out[key] = Math.min(max, Math.max(min, Math.round(value)));
    }
  }
  return out;
}

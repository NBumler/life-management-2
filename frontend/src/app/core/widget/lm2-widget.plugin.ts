import { registerPlugin } from '@capacitor/core';

/**
 * documentation/Features/Android kezdőképernyő widget.md — TypeScript contract for the app-local
 * Android module registered as `Lm2Widget` (`android/.../widget/Lm2WidgetPlugin.kt`, registered by
 * hand in `MainActivity`, like `BackgroundReminders` / `HealthConnectSteps`).
 *
 * The native side owns four `AppWidgetProvider`s that render from the `lm2_widgetSnapshot`
 * `@capacitor/preferences` blob. `refresh()` redraws them now; `ensureBackgroundRefresh()` arms a
 * ~30-minute `PeriodicWorkRequest` that re-reads today's step count from Health Connect and patches
 * the snapshot while the app is closed. No web / iOS implementation — the proxy rejects there and the
 * single caller (`WidgetSnapshotService`) ignores the rejection.
 */
export interface Lm2WidgetPlugin {
  /** Redraw every home-screen widget from the current `lm2_widgetSnapshot`. Idempotent. */
  refresh(): Promise<void>;
  /** (Re-)arm the periodic background step-patch worker. Idempotent. */
  ensureBackgroundRefresh(): Promise<void>;
}

export const Lm2Widget = registerPlugin<Lm2WidgetPlugin>('Lm2Widget');

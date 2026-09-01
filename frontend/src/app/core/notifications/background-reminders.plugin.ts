import { registerPlugin } from '@capacitor/core';

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — TypeScript contract
 * for the app-local Android module registered as `BackgroundReminders`
 * (`android/.../notifications/BackgroundRemindersPlugin.kt`, registered in `MainActivity`).
 *
 * The native side owns two inexact daily `AlarmManager` alarms (~08:00 / ~20:00, device-local) that
 * run a background worker; this call just (re-)arms them. There is no web / iOS implementation — the
 * proxy rejects there and the single caller (`NotificationSchedulerService.init`) ignores the
 * rejection.
 */
export interface BackgroundRemindersPlugin {
  /** (Re-)arm the two daily reminder alarms. Idempotent. */
  ensureScheduled(): Promise<void>;
}

export const BackgroundReminders = registerPlugin<BackgroundRemindersPlugin>('BackgroundReminders');

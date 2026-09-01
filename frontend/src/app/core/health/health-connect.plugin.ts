import { registerPlugin } from '@capacitor/core';

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md — the Capacitor
 * bridge to Android Health Connect (Samsung Health is a data source behind it). The Health Connect
 * call goes straight from the client; there is no backend proxy.
 *
 * This is the TypeScript contract. The Android side is an app-local native module registered under
 * the name `HealthConnectSteps` (`android/.../health/HealthConnectStepsPlugin.kt`, registered in
 * `MainActivity`). On a device with no Health Connect provider the methods report
 * `available: false` / reject, and {@link HealthConnectStepSource} treats every failure as "no
 * data" so the manual entry path keeps working unchanged.
 *
 * iOS is a later scope (documentation/Features/Lépésszám követés.md "Megjegyzések"): there is no
 * native module for it, so the same "no data" fallback applies.
 */
export interface HealthConnectStepsPlugin {
  /** Whether Health Connect is installed and this device can serve step data at all. */
  isAvailable(): Promise<{ available: boolean }>;

  /** Current READ_STEPS grant, without prompting. */
  checkPermission(): Promise<{ granted: boolean }>;

  /** Prompt for the READ_STEPS permission; resolves with the grant the user chose. */
  requestPermission(): Promise<{ granted: boolean }>;

  /**
   * Total steps for a single client-local calendar day (`YYYY-MM-DD`). Implementations sum the
   * Health Connect `StepsRecord` buckets that fall within that day in the device's own timezone.
   */
  readDailySteps(options: { date: string }): Promise<{ date: string; steps: number }>;
}

export const HealthConnectSteps = registerPlugin<HealthConnectStepsPlugin>('HealthConnectSteps');

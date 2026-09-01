import { registerPlugin } from '@capacitor/core';

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md — the Capacitor
 * bridge to Android Health Connect (Samsung Health is a data source behind it). The Health Connect
 * call goes straight from the client; there is no backend proxy.
 *
 * This is only the TypeScript contract. The Android side is a native module registered under the
 * name `HealthConnectSteps` — same shape as the barcode scanner slice, where the JS wrapper shipped
 * before its on-device module (see food-barcode-scanner.service.ts). Until that module is present
 * the plugin methods reject / report `available: false`, and {@link HealthConnectStepSource} treats
 * every failure as "no data" so the manual entry path keeps working unchanged.
 *
 * iOS is a later scope (documentation/Features/Lépésszám követés.md "Megjegyzések").
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

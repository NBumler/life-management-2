import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { HealthConnectSteps } from './health-connect.plugin';

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md — thin, error-
 * swallowing wrapper over the Health Connect plugin, isolated in its own injectable so
 * {@link ActivityStepSyncService}'s tests can mock the whole device flow.
 *
 * Not unit-tested beyond this file's callers: `registerPlugin` returns a Proxy that `spyOn` can't
 * intercept (see food-barcode-scanner.service.ts for the same note) — the native path
 * (`HealthConnectStepsPlugin.kt`) needs on-device verification. Non-native platforms (the web
 * build) short-circuit to "unavailable".
 */
@Injectable({ providedIn: 'root' })
export class HealthConnectStepSource {
  private readonly native = Capacitor.isNativePlatform();

  async isAvailable(): Promise<boolean> {
    if (!this.native) {
      return false;
    }
    try {
      return (await HealthConnectSteps.isAvailable()).available;
    } catch {
      return false;
    }
  }

  async hasPermission(): Promise<boolean> {
    if (!this.native) {
      return false;
    }
    try {
      return (await HealthConnectSteps.checkPermission()).granted;
    } catch {
      return false;
    }
  }

  /** Prompts for READ_STEPS. Returns the resulting grant; false on any error / non-native. */
  async requestPermission(): Promise<boolean> {
    if (!this.native) {
      return false;
    }
    try {
      return (await HealthConnectSteps.requestPermission()).granted;
    } catch {
      return false;
    }
  }

  /** Total steps for `date` (`YYYY-MM-DD`, device TZ), or null when Health Connect can't answer. */
  async readDailySteps(date: string): Promise<number | null> {
    if (!this.native) {
      return null;
    }
    try {
      const { steps } = await HealthConnectSteps.readDailySteps({ date });
      return Number.isFinite(steps) && steps >= 0 ? Math.round(steps) : null;
    } catch {
      return null;
    }
  }
}

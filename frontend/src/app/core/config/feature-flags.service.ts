import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import featuresConfig from '../../../assets/config/features.json';

// SSOT: documentation/Architektúra/Frontend.md "Flag registry".
export type FeatureFlagKey =
  | 'tab.kaja'
  | 'kaja.recept'
  | 'kaja.statisztika'
  | 'tab.edzes'
  | 'edzes.hetiTerv'
  | 'edzes.maszonaplo'
  | 'edzes.uszas'
  | 'edzes.bicikli'
  | 'tab.feladatok'
  | 'feladatok.eletTervek'
  | 'feladatok.naptar'
  | 'feladatok.esemenyek'
  | 'feladatok.googleExport'
  | 'menu.bevasarlas'
  | 'menu.lepesszam'
  | 'menu.ertesitesek'
  | 'menu.penzugyek'
  | 'menu.aycm'
  | 'menu.gearcheck';

const FEATURE_FLAG_KEYS: readonly FeatureFlagKey[] = [
  'tab.kaja',
  'kaja.recept',
  'kaja.statisztika',
  'tab.edzes',
  'edzes.hetiTerv',
  'edzes.maszonaplo',
  'edzes.uszas',
  'edzes.bicikli',
  'tab.feladatok',
  'feladatok.eletTervek',
  'feladatok.naptar',
  'feladatok.esemenyek',
  'feladatok.googleExport',
  'menu.bevasarlas',
  'menu.lepesszam',
  'menu.ertesitesek',
  'menu.penzugyek',
  'menu.aycm',
  'menu.gearcheck',
];

/**
 * Build-time ship config (documentation/Architektúra/Frontend.md "Feature flag-ek").
 * Read synchronously at import time — not fetched — so it is available before the
 * first render and works in FULL_OFFLINE. Missing/unknown keys are a dev build error
 * and silently `false` in production, per spec.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly flags = FeatureFlagsService.loadAndValidate();

  isEnabled(key: FeatureFlagKey): boolean {
    return this.flags.get(key) ?? false;
  }

  private static loadAndValidate(): ReadonlyMap<FeatureFlagKey, boolean> {
    const raw = featuresConfig as Record<string, unknown>;
    const flags = new Map<FeatureFlagKey, boolean>();

    for (const key of FEATURE_FLAG_KEYS) {
      const value = raw[key];
      if (typeof value !== 'boolean') {
        if (!environment.production) {
          throw new Error(`features.json is missing required key "${key}"`);
        }
        flags.set(key, false);
        continue;
      }
      flags.set(key, value);
    }

    if (!environment.production) {
      const known = new Set<string>(FEATURE_FLAG_KEYS);
      for (const key of Object.keys(raw)) {
        if (!known.has(key)) {
          throw new Error(`features.json has an unknown key "${key}"`);
        }
      }
    }

    return flags;
  }
}

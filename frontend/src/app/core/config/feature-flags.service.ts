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

// documentation/Architektúra/Frontend.md "Függőségek": "Ha be van kapcsolva → Akkor kötelező".
// Validated at load time (dev: hard error; the spec's "build-time validált, szabálysértés
// fordítási hiba" intent, approximated here since the config is a runtime asset — see class doc).
const FEATURE_FLAG_DEPENDENCIES: ReadonlyMap<FeatureFlagKey, FeatureFlagKey> = new Map([
  ['kaja.recept', 'tab.kaja'],
  ['kaja.statisztika', 'tab.kaja'],
  ['edzes.hetiTerv', 'tab.edzes'],
  ['edzes.maszonaplo', 'tab.edzes'],
  ['edzes.uszas', 'tab.edzes'],
  ['edzes.bicikli', 'tab.edzes'],
  ['feladatok.eletTervek', 'tab.feladatok'],
  ['feladatok.naptar', 'tab.feladatok'],
  ['feladatok.esemenyek', 'tab.feladatok'],
  ['menu.bevasarlas', 'tab.kaja'],
  ['feladatok.googleExport', 'feladatok.esemenyek'],
]);

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
  private readonly flags = validateFeatureFlags(featuresConfig as Record<string, unknown>, environment.production);

  isEnabled(key: FeatureFlagKey): boolean {
    return this.flags.get(key) ?? false;
  }
}

/**
 * Pure validation, extracted so it can be unit-tested against synthetic config objects — the real
 * config is a build-time JSON asset imported statically, so the class itself can only ever be
 * exercised against whatever `features.json` currently contains.
 */
export function validateFeatureFlags(raw: Record<string, unknown>, production: boolean): ReadonlyMap<FeatureFlagKey, boolean> {
  const flags = new Map<FeatureFlagKey, boolean>();

  for (const key of FEATURE_FLAG_KEYS) {
    const value = raw[key];
    if (typeof value !== 'boolean') {
      if (!production) {
        throw new Error(`features.json is missing required key "${key}"`);
      }
      flags.set(key, false);
      continue;
    }
    flags.set(key, value);
  }

  if (!production) {
    const known = new Set<string>(FEATURE_FLAG_KEYS);
    for (const key of Object.keys(raw)) {
      if (!known.has(key)) {
        throw new Error(`features.json has an unknown key "${key}"`);
      }
    }
    for (const [dependent, required] of FEATURE_FLAG_DEPENDENCIES) {
      if (flags.get(dependent) === true && flags.get(required) !== true) {
        throw new Error(`features.json: "${dependent}" is enabled but requires "${required}" to also be enabled`);
      }
    }
  }

  return flags;
}

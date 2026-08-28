import { TestBed } from '@angular/core/testing';

import { FeatureFlagKey, FeatureFlagsService, validateFeatureFlags } from './feature-flags.service';

// documentation/Architektúra/Frontend.md "Feature flag-ek" — flag registry + dependency table.
const ALL_KEYS: FeatureFlagKey[] = [
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

function allFalseConfig(): Record<string, boolean> {
  const config: Record<string, boolean> = {};
  for (const key of ALL_KEYS) {
    config[key] = false;
  }
  return config;
}

describe('validateFeatureFlags', () => {
  it('accepts a config with every known key present and returns the values as-is', () => {
    const raw = { ...allFalseConfig(), 'menu.lepesszam': true };

    const flags = validateFeatureFlags(raw, false);

    expect(flags.get('menu.lepesszam')).toBe(true);
    expect(flags.get('tab.kaja')).toBe(false);
  });

  it('dev mode: throws when a known key is missing', () => {
    const raw = allFalseConfig();
    delete (raw as Record<string, unknown>)['menu.gearcheck'];

    expect(() => validateFeatureFlags(raw, false)).toThrowError(/missing required key "menu.gearcheck"/);
  });

  it('dev mode: throws when the config contains an unknown key', () => {
    const raw = { ...allFalseConfig(), 'totally.unknown.flag': true };

    expect(() => validateFeatureFlags(raw, false)).toThrowError(/unknown key "totally.unknown.flag"/);
  });

  it('prod mode: a missing key silently becomes false instead of throwing', () => {
    const raw = allFalseConfig();
    delete (raw as Record<string, unknown>)['menu.gearcheck'];

    const flags = validateFeatureFlags(raw, true);

    expect(flags.get('menu.gearcheck')).toBe(false);
  });

  it('prod mode: an unknown key is silently ignored instead of throwing', () => {
    const raw = { ...allFalseConfig(), 'totally.unknown.flag': true };

    expect(() => validateFeatureFlags(raw, true)).not.toThrow();
  });

  describe('dependency validation (Frontend.md "Függőségek")', () => {
    const cases: Array<[FeatureFlagKey, FeatureFlagKey]> = [
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
    ];

    for (const [dependent, required] of cases) {
      it(`dev mode: throws when "${dependent}" is on but "${required}" is off`, () => {
        const raw = { ...allFalseConfig(), [dependent]: true };
        expect(() => validateFeatureFlags(raw, false)).toThrowError(
          new RegExp(`"${dependent}" is enabled but requires "${required}"`),
        );
      });

      it(`dev mode: does not throw when "${dependent}" and "${required}" (and its own chain) are all on`, () => {
        // feladatok.googleExport -> feladatok.esemenyek -> tab.feladatok is a two-hop chain: turning
        // on just the immediate two keys still leaves feladatok.esemenyek's own dependency unmet.
        const raw = { ...allFalseConfig(), [dependent]: true, [required]: true, 'tab.feladatok': true, 'tab.kaja': true, 'tab.edzes': true };
        expect(() => validateFeatureFlags(raw, false)).not.toThrow();
      });
    }

    it('feladatok.googleExport requires feladatok.esemenyek specifically, not just tab.feladatok', () => {
      const raw = { ...allFalseConfig(), 'tab.feladatok': true, 'feladatok.googleExport': true };
      // feladatok.esemenyek is still false — must still fail even though the tab is on.
      expect(() => validateFeatureFlags(raw, false)).toThrowError(/requires "feladatok.esemenyek"/);
    });

    it('does not run dependency validation in prod mode (avoids a runtime crash in a shipped build)', () => {
      const raw = { ...allFalseConfig(), 'kaja.recept': true };
      expect(() => validateFeatureFlags(raw, true)).not.toThrow();
    });

    it('a config with everything off has no dependency violations', () => {
      expect(() => validateFeatureFlags(allFalseConfig(), false)).not.toThrow();
    });
  });
});

describe('FeatureFlagsService (real build asset)', () => {
  let service: FeatureFlagsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeatureFlagsService);
  });

  it('constructs without throwing against the real src/assets/config/features.json (it must be internally consistent)', () => {
    expect(service).toBeTruthy();
  });

  it('isEnabled() reflects the shipped config for a couple of representative keys', () => {
    // tab.edzes is on (Edzésnapló + Heti terv shipped in the current round); tab.kaja is on
    // (Élelmiszerek + Élelmiszer tárolás exist); menu.* core utilities are on.
    expect(service.isEnabled('tab.edzes')).toBe(true);
    expect(service.isEnabled('edzes.hetiTerv')).toBe(true);
    expect(service.isEnabled('menu.lepesszam')).toBe(true);
  });

  it('returns false for an unrecognized key rather than throwing', () => {
    expect(service.isEnabled('not.a.real.key' as FeatureFlagKey)).toBe(false);
  });
});

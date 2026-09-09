import { FeatureFlagKey, FeatureFlagsService } from './feature-flags.service';
import { firstEnabledTabRoute, TAB_REGISTRY } from './tab-registry';

// documentation/Architektúra/Frontend.md "Navigáció — tab registry" + "Login utáni default tab".
function flags(enabled: FeatureFlagKey[]): FeatureFlagsService {
  return { isEnabled: (key: FeatureFlagKey) => enabled.includes(key) } as FeatureFlagsService;
}

describe('TAB_REGISTRY', () => {
  it('lists Kezdőlap first and Menü last, and Menü is the only unflagged tab', () => {
    expect(TAB_REGISTRY[0].key).toBe('home');
    expect(TAB_REGISTRY[0].route).toBe('/tabs/home');
    expect(TAB_REGISTRY[TAB_REGISTRY.length - 1].key).toBe('menu');
    expect(TAB_REGISTRY.filter((tab) => tab.flag === null).map((tab) => tab.key)).toEqual(['menu']);
  });

  it("every tab's key equals its route's last segment (Ionic <ion-tab-button [tab]> contract)", () => {
    for (const tab of TAB_REGISTRY) {
      expect(tab.route.split('/').pop()).toBe(tab.key);
    }
  });
});

describe('firstEnabledTabRoute', () => {
  it('returns /tabs/home when tab.kezdolap is on', () => {
    expect(firstEnabledTabRoute(flags(['tab.kezdolap', 'tab.kaja']))).toBe('/tabs/home');
  });

  it('falls through to the next enabled tab when tab.kezdolap is off', () => {
    expect(firstEnabledTabRoute(flags(['tab.kaja', 'tab.edzes']))).toBe('/tabs/food');
    expect(firstEnabledTabRoute(flags(['tab.edzes']))).toBe('/tabs/workout');
  });

  it('falls back to Menü when every tab flag is off (bar is never empty)', () => {
    expect(firstEnabledTabRoute(flags([]))).toBe('/tabs/menu');
  });
});

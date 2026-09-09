import { FeatureFlagKey, FeatureFlagsService } from './feature-flags.service';

/** documentation/Architektúra/Frontend.md "Navigáció — tab registry": config-driven, not a hardcoded template. */
export interface TabDef {
  key: string;
  flag: FeatureFlagKey | null;
  route: string;
  icon: string;
  labelKey: string;
}

/**
 * `key` must equal the last URL segment of `route` (e.g. 'tasks' for '/tabs/tasks'), not a
 * human/Hungarian label: Ionic's `<ion-tab-button [tab]>` uses this value, unrelated to `href`, to
 * build the tab-switch target as `<tabsPrefix>/<tab>` (see IonTabs.select() in
 * @ionic/angular/common). A mismatch here makes the tab silently no-op — the router fails to match
 * the resulting URL and the app's catch-all wildcard route redirects back to the current tab.
 *
 * Order is the bottom-bar order. `Kezdőlap` is first and, when its flag is on, the post-login
 * landing (see `firstEnabledTabRoute`); `menu` is last and unflagged — the always-present fallback.
 */
export const TAB_REGISTRY: readonly TabDef[] = [
  { key: 'home', flag: 'tab.kezdolap', route: '/tabs/home', icon: 'home-outline', labelKey: 'TABS.KEZDOLAP' },
  { key: 'food', flag: 'tab.kaja', route: '/tabs/food', icon: 'restaurant-outline', labelKey: 'TABS.KAJA' },
  { key: 'workout', flag: 'tab.edzes', route: '/tabs/workout', icon: 'barbell-outline', labelKey: 'TABS.EDZES' },
  { key: 'tasks', flag: 'tab.feladatok', route: '/tabs/tasks', icon: 'checkbox-outline', labelKey: 'TABS.FELADATOK' },
  { key: 'menu', flag: null, route: '/tabs/menu', icon: 'menu-outline', labelKey: 'TABS.MENU' },
];

/**
 * documentation/Architektúra/Frontend.md "Login utáni default tab" + "deep link → default tab": the
 * route of the first registry tab whose flag is on. `menu` (flag `null`) always matches, so this
 * never returns `undefined` — the bar is never empty and there is always somewhere to land.
 * Used for the post-login `''` redirect and by `featureFlagGuard` when a flag is off.
 */
export function firstEnabledTabRoute(featureFlags: FeatureFlagsService): string {
  const tab = TAB_REGISTRY.find((candidate) => candidate.flag === null || featureFlags.isEnabled(candidate.flag));
  return (tab ?? TAB_REGISTRY[TAB_REGISTRY.length - 1]).route;
}

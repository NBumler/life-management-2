import { FeatureFlagKey } from './feature-flags.service';

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
 */
export const TAB_REGISTRY: readonly TabDef[] = [
  { key: 'food', flag: 'tab.kaja', route: '/tabs/food', icon: 'restaurant-outline', labelKey: 'TABS.KAJA' },
  { key: 'workout', flag: 'tab.edzes', route: '/tabs/workout', icon: 'barbell-outline', labelKey: 'TABS.EDZES' },
  { key: 'tasks', flag: 'tab.feladatok', route: '/tabs/tasks', icon: 'checkbox-outline', labelKey: 'TABS.FELADATOK' },
  { key: 'menu', flag: null, route: '/tabs/menu', icon: 'menu-outline', labelKey: 'TABS.MENU' },
];

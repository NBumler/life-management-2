import { FeatureFlagKey } from './feature-flags.service';

/** documentation/Architektúra/Frontend.md "Navigáció — tab registry": config-driven, not a hardcoded template. */
export interface TabDef {
  key: string;
  flag: FeatureFlagKey | null;
  route: string;
  icon: string;
  labelKey: string;
}

export const TAB_REGISTRY: readonly TabDef[] = [
  { key: 'kaja', flag: 'tab.kaja', route: '/tabs/food', icon: 'restaurant-outline', labelKey: 'TABS.KAJA' },
  { key: 'edzes', flag: 'tab.edzes', route: '/tabs/workout', icon: 'barbell-outline', labelKey: 'TABS.EDZES' },
  { key: 'feladatok', flag: 'tab.feladatok', route: '/tabs/tasks', icon: 'checkbox-outline', labelKey: 'TABS.FELADATOK' },
  { key: 'menu', flag: null, route: '/tabs/menu', icon: 'menu-outline', labelKey: 'TABS.MENU' },
];

import { Router } from '@angular/router';

import { FeatureFlagKey } from '../../core/config/feature-flags.service';

/**
 * documentation/Features/Edzés.md "UI/UX elvárások" — the Edzés tab's root is a top segment:
 * Edzésnapló | Heti terv | Mászás | Úszás | Bicikli (Gyakorlat opens from the header gear icon, not
 * a segment). documentation/Architektúra/Frontend.md route map fixes the routes below.
 *
 * Unlike the food tab's five fixed sections, every segment here except the log is feature-flagged
 * (`edzes.*`): a disabled flag removes the segment button and its route is guarded — never a
 * disabled-looking button (Frontend.md "Tab registry"). `flag: null` = covered by `tab.edzes` itself
 * (the log and Gyakorlat share the parent tab's flag; a separate switch would just leave an empty tab).
 */
export type WorkoutSection = 'log' | 'weekly-plan' | 'climbing' | 'swimming' | 'cycling';

export interface WorkoutSectionDef {
  readonly section: WorkoutSection;
  readonly flag: FeatureFlagKey | null;
  readonly route: string;
  readonly labelKey: string;
}

export const WORKOUT_SECTIONS: readonly WorkoutSectionDef[] = [
  { section: 'log', flag: null, route: '/tabs/workout/log', labelKey: 'WORKOUT.SEGMENTS.LOG' },
  { section: 'weekly-plan', flag: 'edzes.hetiTerv', route: '/tabs/workout/weekly-plan', labelKey: 'WORKOUT.SEGMENTS.WEEKLY_PLAN' },
  { section: 'climbing', flag: 'edzes.maszonaplo', route: '/tabs/workout/climbing', labelKey: 'WORKOUT.SEGMENTS.CLIMBING' },
  { section: 'swimming', flag: 'edzes.uszas', route: '/tabs/workout/swimming', labelKey: 'WORKOUT.SEGMENTS.SWIMMING' },
  { section: 'cycling', flag: 'edzes.bicikli', route: '/tabs/workout/cycling', labelKey: 'WORKOUT.SEGMENTS.CYCLING' },
];

const WORKOUT_SECTION_ROUTES: Record<WorkoutSection, string> = WORKOUT_SECTIONS.reduce(
  (acc, def) => ({ ...acc, [def.section]: def.route }),
  {} as Record<WorkoutSection, string>,
);

/** Navigate to another Edzés sub-section. No-op for the page's own section or an unknown value. */
export function navigateWorkoutSection(router: Router, section: string, current: WorkoutSection): void {
  if (section === current) {
    return;
  }
  const target = WORKOUT_SECTION_ROUTES[section as WorkoutSection];
  if (target !== undefined) {
    void router.navigateByUrl(target);
  }
}

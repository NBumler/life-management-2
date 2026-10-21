import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { HOME_TODAY_WORKOUT_ROWS, TodayWorkoutRowDef, TodayWorkoutRowKey } from '../../../core/config/home-widget-registry';
import { WorkoutsSummary } from '../../../core/data/day-summary';

interface WorkoutRowView {
  key: TodayWorkoutRowKey;
  labelKey: string;
  icon: string;
  /** `HOME.WORKOUTS.STEP_COUNT` for steps, `HOME.WORKOUTS.SESSION_COUNT` for the rest — `{{count}}` interpolated. */
  countLabelKey: string;
  count: number;
  kcal: number;
}

/**
 * documentation/Features/Kezdőlap.md — the "Mai edzések" home widget (`backlog/112`): logged
 * activities (lépés, edzésnapló, mászás, úszás, bicikli, röplabda, nyújtás) with their individual +
 * combined extra kcal. Presentational: the caller passes the `summary` — today's from
 * `TodayWorkoutsService` on the home screen, the counted week's from `WeeklyOverviewService` on the
 * weekly overview (`backlog/233`, with its own title / empty keys). One row per
 * `HOME_TODAY_WORKOUT_ROWS` entry whose flag is on; a row is shown only once it has data
 * (count > 0), and the widget renders nothing when no row's flag qualifies.
 */
@Component({
  selector: 'app-today-workouts-widget',
  templateUrl: 'today-workouts-widget.component.html',
  styleUrls: ['today-workouts-widget.component.scss'],
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonNote, DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayWorkoutsWidgetComponent {
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly rowDefs: readonly TodayWorkoutRowDef[] = HOME_TODAY_WORKOUT_ROWS.filter(
    (row) => row.flag === null || this.featureFlags.isEnabled(row.flag),
  );

  readonly summary = input.required<WorkoutsSummary>();
  readonly titleKey = input('HOME.WORKOUTS.TITLE');
  readonly emptyKey = input('HOME.WORKOUTS.EMPTY');

  readonly rows = computed<WorkoutRowView[]>(() => {
    const s = this.summary();
    const tallyByKey: Record<TodayWorkoutRowKey, { count: number; kcal: number; countLabelKey: string }> = {
      steps: { count: s.steps.stepCount, kcal: s.steps.kcal, countLabelKey: 'HOME.WORKOUTS.STEP_COUNT' },
      workout: { count: s.workout.count, kcal: s.workout.kcal, countLabelKey: 'HOME.WORKOUTS.SESSION_COUNT' },
      climbing: { count: s.climbing.count, kcal: s.climbing.kcal, countLabelKey: 'HOME.WORKOUTS.SESSION_COUNT' },
      swim: { count: s.swim.count, kcal: s.swim.kcal, countLabelKey: 'HOME.WORKOUTS.SESSION_COUNT' },
      bike: { count: s.bike.count, kcal: s.bike.kcal, countLabelKey: 'HOME.WORKOUTS.SESSION_COUNT' },
      volleyball: { count: s.volleyball.count, kcal: s.volleyball.kcal, countLabelKey: 'HOME.WORKOUTS.SESSION_COUNT' },
      stretch: { count: s.stretch.count, kcal: s.stretch.kcal, countLabelKey: 'HOME.WORKOUTS.SESSION_COUNT' },
    };
    return this.rowDefs
      .map((def) => ({ key: def.key, labelKey: def.labelKey, icon: def.icon, ...tallyByKey[def.key] }))
      .filter((row) => row.count > 0);
  });

  readonly totalKcal = computed(() => this.summary().totalKcal);
}

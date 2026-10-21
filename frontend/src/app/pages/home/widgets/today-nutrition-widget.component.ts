import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { NutritionSummary } from '../../../core/data/day-summary';

interface NutrientRow {
  labelKey: string;
  intake: number;
  goal: number;
  remaining: number;
  unit: string;
}

/**
 * documentation/Features/Kezdőlap.md — the "Mai étkezés állása" home widget (`backlog/095`): intake
 * vs. goal for kcal + the three macros. Presentational: the caller passes the `summary` — today's
 * from `TodayNutritionService` on the home screen, the counted week's from `WeeklyOverviewService`
 * on the weekly overview (`backlog/233`, with its own title / incomplete keys). When the profile is
 * missing TDEE inputs it shows a link to Profile instead of numbers.
 */
@Component({
  selector: 'app-today-nutrition-widget',
  templateUrl: 'today-nutrition-widget.component.html',
  styleUrls: ['today-nutrition-widget.component.scss'],
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonNote, IonButton, RouterLink, DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayNutritionWidgetComponent {
  readonly summary = input.required<NutritionSummary>();
  readonly titleKey = input('HOME.NUTRITION.TITLE');
  readonly incompleteKey = input('HOME.NUTRITION.INCOMPLETE');

  readonly rows = computed<NutrientRow[]>(() => {
    const s = this.summary();
    if (!s.computable) {
      return [];
    }
    const row = (labelKey: string, progress: { intake: number; goal: number }, unit: string): NutrientRow => ({
      labelKey,
      intake: progress.intake,
      goal: progress.goal,
      remaining: Math.max(0, progress.goal - progress.intake),
      unit,
    });
    return [
      row('HOME.NUTRITION.CALORIES', s.kcal, 'kcal'),
      row('HOME.NUTRITION.PROTEIN', s.proteinG, 'g'),
      row('HOME.NUTRITION.CARBS', s.carbsG, 'g'),
      row('HOME.NUTRITION.FAT', s.fatG, 'g'),
    ];
  });
}

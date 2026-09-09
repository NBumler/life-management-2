import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { TodayNutritionService } from '../../../core/data/today-nutrition.service';

interface NutrientRow {
  labelKey: string;
  intake: number;
  goal: number;
  remaining: number;
  unit: string;
}

/**
 * documentation/Features/Kezdőlap.md — the "Mai étkezés állása" home widget (`backlog/095`): today's
 * intake vs. goal for kcal + the three macros, from {@link TodayNutritionService} (same numbers as
 * the Étkezés dashboard). Renders from local store only — Full-offline safe. When the profile is
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
  private readonly nutrition = inject(TodayNutritionService);

  readonly summary = this.nutrition.summary;

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

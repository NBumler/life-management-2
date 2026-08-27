import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IonProgressBar } from '@ionic/angular/standalone';

import { ProgressBarColor } from './progress-bar-status';

/**
 * documentation/Subfeatures/Étkezés.md "Dashboard (vékony)" — one of the day's 4 goal bars. Purely
 * presentational: color and status text are pre-computed by the page (progress-bar-status.ts) and
 * just rendered here. Colors aren't registered Ionic palette names — this app has no orange/yellow
 * in its palette (see status-cycle-card.component.scss's precedent) — so they're scoped `.bar-*`
 * classes overriding `ion-progress-bar`'s `--progress-background`, not the `color` input.
 */
@Component({
  selector: 'app-nutrition-progress-bar',
  templateUrl: 'nutrition-progress-bar.component.html',
  styleUrls: ['nutrition-progress-bar.component.scss'],
  imports: [IonProgressBar, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NutritionProgressBarComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) intake!: number;
  @Input({ required: true }) goal!: number;
  @Input({ required: true }) unit!: string;
  @Input({ required: true }) color!: ProgressBarColor;
  @Input({ required: true }) statusText!: string;

  get ratio(): number {
    return this.goal > 0 ? Math.min(1, this.intake / this.goal) : 0;
  }

  get barClass(): string {
    return `bar-${this.color}`;
  }
}

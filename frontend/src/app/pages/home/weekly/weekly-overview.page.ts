import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { WEEKLY_WIDGETS, WeeklyWidgetDef } from '../../../core/config/home-widget-registry';
import { WeeklyOverviewService } from '../../../core/data/weekly-overview.service';
import { SyncStatusButtonComponent } from '../../../shared/sync-status-button/sync-status-button.component';
import { TodayNutritionWidgetComponent } from '../widgets/today-nutrition-widget.component';
import { TodayWorkoutsWidgetComponent } from '../widgets/today-workouts-widget.component';

/**
 * documentation/Subfeatures/Heti adatok.md (`backlog/233`) — the home screen's widgets summed over a
 * Monday–Sunday week. Opens on the current week (counted up to today); the chevrons step back
 * through past weeks, never into the future. Renders only from the local store — Full-offline safe.
 */
@Component({
  selector: 'app-weekly-overview',
  templateUrl: 'weekly-overview.page.html',
  styleUrls: ['weekly-overview.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonNote,
    SyncStatusButtonComponent,
    TodayNutritionWidgetComponent,
    TodayWorkoutsWidgetComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyOverviewPage implements ViewWillEnter {
  private readonly featureFlags = inject(FeatureFlagsService);
  protected readonly week = inject(WeeklyOverviewService);

  /** Widgets to render, in registry order, whose flag is on. */
  readonly widgets: readonly WeeklyWidgetDef[] = WEEKLY_WIDGETS.filter(
    (widget) => widget.flag === null || this.featureFlags.isEnabled(widget.flag),
  );

  async ionViewWillEnter(): Promise<void> {
    this.week.showCurrentWeek();
    await this.week.load();
  }
}

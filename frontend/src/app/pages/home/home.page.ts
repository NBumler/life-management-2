import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { HOME_WIDGETS, HomeWidgetDef } from '../../core/config/home-widget-registry';
import { TodayNutritionService } from '../../core/data/today-nutrition.service';
import { SyncStatusButtonComponent } from '../../shared/sync-status-button/sync-status-button.component';
import { QuickActionsWidgetComponent } from './widgets/quick-actions-widget.component';
import { TodayNutritionWidgetComponent } from './widgets/today-nutrition-widget.component';

/**
 * documentation/Features/Kezdőlap.md — a login utáni kezdőképernyő és az alsó tab-sor első eleme.
 * Tartalma a config-vezérelt widget-verem (`HOME_WIDGETS`, `backlog/095`): gyorsgombok + a mai
 * étkezés állása. Kizárólag a helyi store-ból renderel — Full-offline is teljes értékű.
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    SyncStatusButtonComponent,
    QuickActionsWidgetComponent,
    TodayNutritionWidgetComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements ViewWillEnter {
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly todayNutrition = inject(TodayNutritionService);

  /** Widgets to render, in registry order, whose flag is on. */
  readonly widgets: readonly HomeWidgetDef[] = HOME_WIDGETS.filter(
    (widget) => widget.flag === null || this.featureFlags.isEnabled(widget.flag),
  );

  private readonly nutritionShown = this.widgets.some((widget) => widget.key === 'today-nutrition');

  async ionViewWillEnter(): Promise<void> {
    if (this.nutritionShown) {
      await this.todayNutrition.load();
    }
  }
}

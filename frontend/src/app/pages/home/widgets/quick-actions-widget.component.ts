import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { HOME_QUICK_ACTIONS, QuickActionDef } from '../../../core/config/home-widget-registry';

/**
 * documentation/Features/Kezdőlap.md — the "gyorsgombok" home widget (`backlog/095`). One button per
 * `HOME_QUICK_ACTIONS` entry whose flag is on; the widget renders nothing when none qualify. Pure
 * navigation, no data — works Full-offline.
 */
@Component({
  selector: 'app-quick-actions-widget',
  templateUrl: 'quick-actions-widget.component.html',
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionsWidgetComponent {
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly actions: readonly QuickActionDef[] = HOME_QUICK_ACTIONS.filter(
    (action) => action.flag === null || this.featureFlags.isEnabled(action.flag),
  );
}

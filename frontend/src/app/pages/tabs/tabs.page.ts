import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { TAB_REGISTRY } from '../../core/config/tab-registry';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';

/** documentation/Architektúra/Frontend.md: only the tabs whose flag is on are shown; Menü always exists. */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  imports: [IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly enabledTabs = TAB_REGISTRY.filter((tab) => tab.flag === null || this.featureFlags.isEnabled(tab.flag));
}

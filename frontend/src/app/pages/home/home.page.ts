import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { TAB_REGISTRY, TabDef } from '../../core/config/tab-registry';
import { SyncStatusButtonComponent } from '../../shared/sync-status-button/sync-status-button.component';

/**
 * documentation/Features/Kezdőlap.md — a login utáni kezdőképernyő és az alsó tab-sor első eleme.
 * Ez a jegy (`backlog/096`) a tab / route / flag / default-tab vázat szállítja: minimális
 * tartalomként a többi engedélyezett tabra mutató gyorslinkek. A tényleges widgetek / gyorsgombok
 * külön jegy (`backlog/095`). Kizárólag a helyi store-ból renderel — Full-offline is teljes értékű.
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonNote,
    RouterLink,
    SyncStatusButtonComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly featureFlags = inject(FeatureFlagsService);

  /** Gyorslinkek: minden engedélyezett tab a Kezdőlapon kívül, a registry sorrendjében. */
  readonly quickLinks: readonly TabDef[] = TAB_REGISTRY.filter(
    (tab) => tab.key !== 'home' && (tab.flag === null || this.featureFlags.isEnabled(tab.flag)),
  );
}

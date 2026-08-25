import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../core/config/feature-flags.service';

/**
 * documentation/Features/Tennivalók.md hub: négy csempe — Háztartási feladatok | Élet tervek |
 * Naptár | Események. A Háztartási csempét a `tab.feladatok` flag már fedi (nincs saját flagje); a
 * másik három saját flaggel takarva.
 */
@Component({
  selector: 'app-tennivalok-hub',
  templateUrl: 'tennivalok-hub.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TennivalokHubPage {
  private readonly featureFlags = inject(FeatureFlagsService);

  readonly eletTervekEnabled = this.featureFlags.isEnabled('feladatok.eletTervek');
  readonly naptarEnabled = this.featureFlags.isEnabled('feladatok.naptar');
  readonly esemenyekEnabled = this.featureFlags.isEnabled('feladatok.esemenyek');
}

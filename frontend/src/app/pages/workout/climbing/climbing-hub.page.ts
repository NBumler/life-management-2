import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { WorkoutSegmentHeaderComponent } from '../workout-segment-header.component';
import { CLIMBING_CONTEXTS } from './climbing-contexts';

/**
 * documentation/Features/Mászónapló.md "Dashboard (Hub)" — the Mászás segment's landing screen: 4
 * context tiles (Indoor/Outdoor × Boulder/Kötél), plus a stats and a venue-admin entry in the
 * header. Each tile opens its own napló flow; there is no shared form with an indoor/outdoor or
 * boulder/rope selector. The per-context routes, the stats screen and the admin screens are wired
 * by later Mászónapló slices — this M1 scaffold only renders the hub.
 */
@Component({
  selector: 'app-climbing-hub',
  templateUrl: 'climbing-hub.page.html',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    WorkoutSegmentHeaderComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimbingHubPage {
  readonly contexts = CLIMBING_CONTEXTS;
}

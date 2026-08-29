import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * documentation/Features/Mászónapló.md "Terem / Helyszín Admin" — the venue-admin landing. Two
 * groups: Indoor (Gym + colour bands + optional indoor routes) and Outdoor (Crag → Sector → Route |
 * BoulderProblem). Reached from the hub header cog and from a per-context napló's quick admin link.
 */
@Component({
  selector: 'app-climbing-admin',
  templateUrl: 'climbing-admin.page.html',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClimbingAdminPage {}

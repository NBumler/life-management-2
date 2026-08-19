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
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * documentation/Features/GearCheck.md hub: three entries (Eszközök | Sablonok | Pakolás).
 * Pakolás lands in a later implementation phase — Eszközök and Sablonok are wired so far.
 */
@Component({
  selector: 'app-gear-check',
  templateUrl: 'gear-check.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem, IonLabel, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GearCheckPage {}

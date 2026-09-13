import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * documentation/Architektúra/Frontend.md route-térkép (bővítve) — Menü → Túra.
 * backlog/tura-utvonaltervezo/103-... 1. fázis (alaptérkép + turistajelzés-réteg) tölti fel a tartalmat.
 */
@Component({
  selector: 'app-tura',
  templateUrl: 'tura.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TuraPage {}

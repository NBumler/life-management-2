import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PackingSession } from '../../../../api/model/packingSession';
import { PackingSessionRepository } from '../../../../core/data/packing-session.repository';

/** documentation/Subfeatures/Pakolás.md: active session list + "Aktív pakolás" belépő — unlimited concurrent sessions. */
@Component({
  selector: 'app-packing-sessions',
  templateUrl: 'packing-sessions.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem, IonLabel, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingSessionsPage implements OnInit {
  private readonly repository = inject(PackingSessionRepository);
  private readonly translate = inject(TranslateService);

  readonly sessions = this.repository.sessions;

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  displayName(session: PackingSession): string {
    const destination = session.destination?.trim();
    return destination ? destination : this.translate.instant('GEAR.PACKING.UNNAMED_DESTINATION');
  }
}

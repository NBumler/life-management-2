import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PackingSession } from '../../../../api/model/packingSession';
import { PackingSessionRepository } from '../../../../core/data/packing-session.repository';
import { PackingTemplateRepository } from '../../../../core/data/packing-template.repository';

/** documentation/Subfeatures/Pakolás.md: active session list + "Aktív pakolás" belépő — unlimited concurrent sessions. */
@Component({
  selector: 'app-packing-sessions',
  templateUrl: 'packing-sessions.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem, IonLabel, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingSessionsPage implements OnInit {
  private readonly repository = inject(PackingSessionRepository);
  private readonly templateRepository = inject(PackingTemplateRepository);
  private readonly translate = inject(TranslateService);

  readonly sessions = this.repository.sessions;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.templateRepository.load()]);
  }

  /**
   * documentation/Subfeatures/Pakolás.md "Indítás": no destination → fall back to the source
   * template(s)' names, comma-joined, instead of a generic "unnamed" placeholder.
   */
  displayName(session: PackingSession): string {
    const destination = session.destination?.trim();
    if (destination) {
      return destination;
    }
    const templatesById = new Map(this.templateRepository.templates().map((template) => [template.id, template.name]));
    const templateNames = (session.sourceTemplateIds ?? [])
      .map((id) => templatesById.get(id))
      .filter((name): name is string => name !== undefined);
    return templateNames.length > 0 ? templateNames.join(', ') : this.translate.instant('GEAR.PACKING.UNNAMED_DESTINATION');
  }
}

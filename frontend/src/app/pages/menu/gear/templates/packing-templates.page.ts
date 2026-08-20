import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PackingTemplate } from '../../../../api/model/packingTemplate';
import { PackingTemplateRepository } from '../../../../core/data/packing-template.repository';
import { compareRank, matchesSearch } from '../../../../shared/text-search';

/** documentation/Subfeatures/Sablonok.md: template list with search, open/edit, másolás, törlés. */
@Component({
  selector: 'app-packing-templates',
  templateUrl: 'packing-templates.page.html',
  styleUrls: ['packing-templates.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonButton, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackingTemplatesPage implements OnInit {
  private readonly repository = inject(PackingTemplateRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly query = signal('');

  /** documentation/Subfeatures/Sablonok.md "Létrehozás": the just-created template, so the list can gently outline it — set via `?highlight=<id>` by the editor's post-create redirect. */
  readonly highlightedId = signal<string | null>(this.route.snapshot.queryParamMap.get('highlight'));

  readonly filteredTemplates = computed(() => {
    const query = this.query();
    return this.repository
      .templates()
      .filter((template) => matchesSearch(query, template.name))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  async duplicate(template: PackingTemplate): Promise<void> {
    const duplicated = await this.repository.duplicate(template.id);
    await this.router.navigate(['/tabs/menu/gear/templates', duplicated.id]);
  }

  async delete(template: PackingTemplate): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('GEAR.TEMPLATES.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('GEAR.TEMPLATES.DELETE_CONFIRM_MESSAGE', { name: template.name }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(template.id) },
      ],
    });
    await alert.present();
  }
}

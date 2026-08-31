import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AycmPartner } from '../../../api/model/aycmPartner';
import { AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { matchesSearch } from '../../../shared/text-search';

/**
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md "UI/UX: Lista" — name+notes search
 * ([[Szöveges keresés]]), rows show the name and the live price-rule count, name-ordered. Global
 * empty shows a create CTA; filtered empty just says "nincs találat". Sliding delete (confirm with
 * the name + live band count).
 */
@Component({
  selector: 'app-aycm-partner-list',
  templateUrl: 'aycm-partner-list.page.html',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonIcon,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AycmPartnerListPage implements OnInit, ViewWillEnter {
  private readonly repository = inject(AycmPartnerRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly query = signal('');

  readonly partners = computed(() =>
    this.repository
      .partners()
      .filter((p) => !p.deleted)
      .filter((p) => matchesSearch(this.query(), p.name) || matchesSearch(this.query(), p.notes ?? ''))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly isGlobalEmpty = computed(
    () => this.repository.loaded() && this.repository.partners().filter((p) => !p.deleted).length === 0,
  );
  readonly isFilteredEmpty = computed(
    () => !this.isGlobalEmpty() && this.repository.loaded() && this.partners().length === 0,
  );

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    await Promise.all(this.repository.partners().map((p) => this.repository.loadRules(p.id)));
  }

  ionViewWillEnter(): void {
    void this.ngOnInit();
  }

  liveRuleCount(partnerId: string): number {
    return this.repository.rulesFor(partnerId).filter((r) => !r.deleted).length;
  }

  async confirmDelete(partner: AycmPartner, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    const alert = await this.alertController.create({
      header: this.translate.instant('AYCM.PARTNERS.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('AYCM.PARTNERS.DELETE_CONFIRM_MESSAGE', {
        name: partner.name,
        count: this.liveRuleCount(partner.id),
      }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.repository.deletePartner(partner.id),
        },
      ],
    });
    await alert.present();
  }
}

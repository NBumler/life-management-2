import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { FoodRepository } from '../../../core/data/food.repository';
import { ImportRow, parseFoodImportBatch } from './food-import';

/**
 * documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md — dedicated screen: paste TSV,
 * live preview split into New/Duplicate/Invalid, Import commits only the New bucket.
 */
@Component({
  selector: 'app-food-import',
  templateUrl: 'food-import.page.html',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonFooter,
    IonTextarea,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonAccordionGroup,
    IonAccordion,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodImportPage implements OnInit {
  private readonly repository = inject(FoodRepository);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  readonly text = signal('');
  readonly importing = signal(false);

  readonly rows = computed<ImportRow[]>(() => parseFoodImportBatch(this.text(), this.repository.items()));
  readonly newRows = computed(() => this.rows().filter((row) => row.status === 'new'));
  readonly duplicateRows = computed(() => this.rows().filter((row) => row.status === 'duplicate'));
  readonly invalidRows = computed(() => this.rows().filter((row) => row.status === 'invalid'));

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  async import(): Promise<void> {
    const toImport = this.newRows();
    if (toImport.length === 0) {
      return;
    }
    this.importing.set(true);
    let imported = 0;
    for (const row of toImport) {
      try {
        await this.repository.save(row.food!);
        imported++;
      } catch {
        // documentation/Subfeatures/Élelmiszer importálása clipboard-ról.md doesn't special-case this
        // rare race (another device created a matching item between preview and import) — skip it.
      }
    }
    this.importing.set(false);
    this.text.set('');
    const toast = await this.toastController.create({
      message: this.translate.instant('FOOD.IMPORT.SUCCESS_TOAST', { count: imported }),
      duration: 3000,
      color: 'success',
    });
    await toast.present();
    await this.router.navigateByUrl('/tabs/food/catalog');
  }
}

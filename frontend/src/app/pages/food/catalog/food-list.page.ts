import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
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

import { Food } from '../../../api/model/food';
import { FoodRepository } from '../../../core/data/food.repository';
import { compareRank, matchesSearch } from '../../../shared/text-search';

/**
 * documentation/Subfeatures/Élelmiszerek.md: shared/global catalog list with search and soft
 * delete. Create/edit is a separate route (food-edit.page.ts) — unlike GearItem's inline-edit
 * pattern, Food's ~30-field form doesn't fit inside a list row.
 */
@Component({
  selector: 'app-food-list',
  templateUrl: 'food-list.page.html',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodListPage implements OnInit {
  private readonly repository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly query = signal('');

  readonly filteredItems = computed(() => {
    const query = this.query();
    return this.repository
      .items()
      .filter((item) => matchesSearch(query, item.name))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  async delete(item: Food): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.CATALOG.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE', { name: item.name }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(item.id) },
      ],
    });
    await alert.present();
  }

  edit(item: Food): void {
    void this.router.navigate(['/tabs/food/catalog', item.id]);
  }

  subtitle(item: Food): string {
    return [item.brand, item.store].filter((value): value is string => !!value).join(' · ');
  }
}

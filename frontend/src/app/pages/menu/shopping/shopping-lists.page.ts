import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ShoppingList } from '../../../api/model/shoppingList';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';

/** documentation/Subfeatures/Bevásárlólista írás.md: active shopping list overview — no search here (that's Bevásárlás előzmény's job), just create/open/delete. */
@Component({
  selector: 'app-shopping-lists',
  templateUrl: 'shopping-lists.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonItem, IonLabel, IonButton, IonIcon, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingListsPage implements OnInit {
  private readonly repository = inject(ShoppingListRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  /** documentation/Subfeatures/Bevásárlás teljesítve.md: an ARCHIVED list belongs to Bevásárlás előzmény (a future slice), not this active-list overview. */
  readonly lists = computed(() => this.repository.items().filter((list) => list.status !== 'ARCHIVED'));

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  itemCount(list: ShoppingList): number {
    return list.items.filter((item) => !item.deleted).length;
  }

  async delete(list: ShoppingList): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('SHOPPING.LIST.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('SHOPPING.LIST.DELETE_CONFIRM_MESSAGE', { name: list.name ?? this.translate.instant('SHOPPING.LIST.UNNAMED') }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(list.id) },
      ],
    });
    await alert.present();
  }
}

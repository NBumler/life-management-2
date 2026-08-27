import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonSearchbar, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ShoppingList } from '../../../api/model/shoppingList';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { filterAndRankHistory } from './shopping-history';

/** documentation/Subfeatures/Bevásárlás előzmény.md: archived-list overview + search, read-only until a row is opened. */
@Component({
  selector: 'app-shopping-history',
  templateUrl: 'shopping-history.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonSearchbar, IonList, IonItem, IonLabel, RouterLink, TranslatePipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingHistoryPage implements OnInit {
  private readonly repository = inject(ShoppingListRepository);
  private readonly foodRepository = inject(FoodRepository);

  readonly query = signal('');

  readonly lists = computed(() => filterAndRankHistory(this.repository.items(), this.foodRepository.items(), this.query()));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
  }

  itemCount(list: ShoppingList): number {
    return list.items.filter((item) => !item.deleted).length;
  }
}

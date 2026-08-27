import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingListDraft } from '../../../core/storage/storage-backend';
import { uuidV4 } from '../../../core/sync/uuid';
import { toSaveItem } from './shopping-list-complete';

/** documentation/Subfeatures/Bevásárlás előzmény.md — read-only view of one archived list, plus "Újralistázás". Deliberately not a mode on the (mutation-only) editor page — see the slice plan's design decision. */
@Component({
  selector: 'app-shopping-history-detail',
  templateUrl: 'shopping-history-detail.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonFooter, IonList, IonItem, IonLabel, IonCheckbox, IonButton, IonNote, TranslatePipe, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingHistoryDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ShoppingListRepository);
  private readonly foodRepository = inject(FoodRepository);

  readonly listId = signal<string | null>(null);

  readonly list = computed(() => this.repository.items().find((candidate) => candidate.id === this.listId()));
  readonly liveItems = computed(() => this.list()?.items.filter((item) => !item.deleted) ?? []);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    const existing = this.repository.items().find((candidate) => candidate.id === idParam);
    if (existing === undefined) {
      await this.router.navigateByUrl('/tabs/menu/shopping/history');
      return;
    }
    this.listId.set(idParam);
  }

  foodOf(item: ShoppingListItem): Food | undefined {
    return this.foodRepository.items().find((food) => food.id === item.foodId);
  }

  async relist(): Promise<void> {
    const list = this.list();
    if (list === undefined) {
      return;
    }
    const draft: ShoppingListDraft = {
      id: uuidV4(),
      name: list.name ?? null,
      items: this.liveItems().map((item, index) => toSaveItem(item, index)),
    };
    const saved = await this.repository.save(draft);
    await this.router.navigateByUrl(`/tabs/menu/shopping/${saved.id}`);
  }
}

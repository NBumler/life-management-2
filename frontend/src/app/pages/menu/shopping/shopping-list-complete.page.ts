import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingListItem } from '../../../api/model/shoppingListItem';
import { StoredFood } from '../../../api/model/storedFood';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { today } from '../../../shared/local-date';
import { allowedStorageLocations, catalogDurationFor, computeInitialExpiry } from '../../food/storage/shelf-life';
import { CheckedFoodWizardInput, buildCompleteDraft, partitionItems } from './shopping-list-complete';

interface CheckedFoodRow {
  item: ShoppingListItem;
  food: Food | undefined;
  allowedLocations: StoredFood.StorageLocationEnum[];
  storageLocation: WritableSignal<StoredFood.StorageLocationEnum>;
  expirationDate: WritableSignal<string>;
}

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — the "Bevásárlás vége" completion wizard.
 * One review screen rather than a strict per-item sequential wizard: every input (which items are
 * checked, each one's allowed locations) is knowable up front, nothing is conditionally revealed by
 * an earlier answer, so a single screen with one row per checked FOOD item covers the spec's wizard
 * requirement with less tapping. Expiry prefill reuses `shelf-life.ts` — the exact same logic the
 * manual StoredFood-creation flow already uses.
 */
@Component({
  selector: 'app-shopping-list-complete',
  templateUrl: 'shopping-list-complete.page.html',
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
    IonList,
    IonItem,
    IonInput,
    IonLabel,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingListCompletePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(ShoppingListRepository);
  private readonly foodRepository = inject(FoodRepository);

  readonly listId = signal<string | null>(null);
  readonly rows = signal<CheckedFoodRow[]>([]);
  readonly locationOptions = [StoredFood.StorageLocationEnum.Room, StoredFood.StorageLocationEnum.Fridge, StoredFood.StorageLocationEnum.Freezer];

  readonly hasCheckedFood = computed(() => this.rows().length > 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    const list = this.repository.items().find((candidate) => candidate.id === idParam);
    if (list === undefined) {
      await this.router.navigateByUrl('/tabs/menu/shopping');
      return;
    }
    this.listId.set(list.id);

    const { checkedFood } = partitionItems(list.items);
    const todayIso = today();
    this.rows.set(
      checkedFood.map((item) => {
        const food = this.foodRepository.items().find((candidate) => candidate.id === item.foodId);
        const allowed = food ? allowedStorageLocations(food) : allowedStorageLocations({});
        const defaultLocation = allowed[0];
        const duration = food ? catalogDurationFor(food, defaultLocation) : { amount: null, unit: null };
        return {
          item,
          food,
          allowedLocations: allowed,
          storageLocation: signal(defaultLocation),
          expirationDate: signal(computeInitialExpiry(todayIso, duration) ?? todayIso),
        };
      }),
    );
  }

  onLocationChange(row: CheckedFoodRow, location: StoredFood.StorageLocationEnum): void {
    row.storageLocation.set(location);
    if (row.food) {
      const duration = catalogDurationFor(row.food, location);
      row.expirationDate.set(computeInitialExpiry(today(), duration) ?? today());
    }
  }

  async confirm(): Promise<void> {
    const listId = this.listId();
    const list = this.repository.items().find((candidate) => candidate.id === listId);
    if (listId === null || list === undefined) {
      return;
    }
    const wizardInputs: CheckedFoodWizardInput[] = this.rows().map((row) => ({
      item: row.item,
      expirationDate: row.expirationDate(),
      storageLocation: row.storageLocation(),
      foodNetAmount: row.food?.netAmount ?? null,
      foodNetUnit: row.food?.netUnit ?? null,
    }));
    const draft = buildCompleteDraft(listId, list.items, wizardInputs);
    await this.repository.complete(draft);
    await this.router.navigateByUrl('/tabs/menu/shopping');
  }
}

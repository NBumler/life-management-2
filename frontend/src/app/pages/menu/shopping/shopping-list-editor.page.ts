import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingListDraft, ShoppingListItemSaveItem } from '../../../core/storage/storage-backend';
import { ParsedQuantity, QuantityUnit } from '../../../shared/quantity';
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { ReorderListComponent } from '../../../shared/reorder-list/reorder-list.component';
import { compareRank, matchesSearch } from '../../../shared/text-search';
import { uuidV4 } from '../../../core/sync/uuid';

const NO_QUANTITY: ParsedQuantity<QuantityUnit> = { amount: null, unit: null };

interface FoodItemRow {
  id: string;
  type: 'FOOD';
  foodId: string;
  quantity: WritableSignal<ParsedQuantity<QuantityUnit>>;
  checked: WritableSignal<boolean>;
}
interface NonFoodItemRow {
  id: string;
  type: 'NON_FOOD';
  name: WritableSignal<string>;
  note: WritableSignal<string | null>;
  quantity: WritableSignal<ParsedQuantity<QuantityUnit>>;
  checked: WritableSignal<boolean>;
}
type ItemRow = FoodItemRow | NonFoodItemRow;

function toSaveItem(row: ItemRow, sortOrder: number): ShoppingListItemSaveItem {
  if (row.type === 'FOOD') {
    const quantity = row.quantity();
    return { id: row.id, type: 'FOOD', foodId: row.foodId, quantityAmount: quantity.amount ?? 0, quantityUnit: quantity.unit ?? 'g', checked: row.checked(), sortOrder };
  }
  const quantity = row.quantity();
  return {
    id: row.id,
    type: 'NON_FOOD',
    name: row.name(),
    note: row.note(),
    quantityAmount: quantity.amount,
    quantityUnit: quantity.unit,
    checked: row.checked(),
    sortOrder,
  };
}

/**
 * documentation/Subfeatures/Bevásárlólista írás.md — create + edit in one page (route param `id` is
 * either an existing list's uuid or the literal `new`), mirroring meal-edit.page.ts's shape. FOOD
 * items reuse meal-edit's inline multi-select-picker pattern; NON_FOOD is a plain inline form row.
 * The "Bevásárlás vége" entry point is deliberately not here yet — it belongs to the not-yet-built
 * Bevásárlás teljesítve flow (documentation/Subfeatures/Bevásárlás teljesítve.md).
 */
@Component({
  selector: 'app-shopping-list-editor',
  templateUrl: 'shopping-list-editor.page.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    QuantityInputComponent,
    ReorderListComponent,
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
    IonCheckbox,
    IonSearchbar,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShoppingListEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(ShoppingListRepository);
  readonly foodRepository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly listId = signal<string | null>(null);
  readonly items = signal<ItemRow[]>([]);
  readonly pickerOpen = signal(false);
  readonly pickerQuery = signal('');
  readonly pickedIds = signal<ReadonlySet<string>>(new Set());
  readonly showItemErrors = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.control<string | null>(null),
  });

  readonly foodIds = computed(() => this.items().filter((row): row is FoodItemRow => row.type === 'FOOD').map((row) => row.foodId));

  readonly foodPickerResults = computed(() => {
    const query = this.pickerQuery();
    return this.foodRepository
      .items()
      .filter((food) => matchesSearch(query, food.name) || matchesSearch(query, food.brand ?? ''))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((item) => item.id === idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/menu/shopping');
        return;
      }
      this.listId.set(idParam);
      this.form.reset({ name: existing.name ?? null }, { emitEvent: false });
      this.items.set(
        existing.items
          .filter((item) => !item.deleted)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => this.buildRowFromDto(item)),
      );
    }
  }

  foodOf(row: FoodItemRow): Food | undefined {
    return this.foodRepository.items().find((food) => food.id === row.foodId);
  }

  togglePicker(): void {
    this.pickerOpen.update((open) => !open);
    this.pickerQuery.set('');
    this.pickedIds.set(new Set());
  }

  isPicked(id: string): boolean {
    return this.pickedIds().has(id);
  }

  togglePick(id: string, excluded: string[]): void {
    if (excluded.includes(id)) {
      return;
    }
    this.pickedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  confirmPicked(): void {
    const newRows: ItemRow[] = [...this.pickedIds()].map(
      (foodId) => ({ id: uuidV4(), type: 'FOOD', foodId, quantity: signal(NO_QUANTITY), checked: signal(false) }) satisfies FoodItemRow,
    );
    this.items.update((rows) => [...rows, ...newRows]);
    this.pickerOpen.set(false);
  }

  addNonFoodRow(): void {
    const row: NonFoodItemRow = { id: uuidV4(), type: 'NON_FOOD', name: signal(''), note: signal(null), quantity: signal(NO_QUANTITY), checked: signal(false) };
    this.items.update((rows) => [...rows, row]);
  }

  onItemsReordered(reordered: ItemRow[]): void {
    this.items.set(reordered);
  }

  removeItem(row: ItemRow): void {
    this.items.update((rows) => rows.filter((entry) => entry.id !== row.id));
  }

  private buildRowFromDto(item: ShoppingList['items'][number]): ItemRow {
    if (item.type === 'FOOD') {
      return {
        id: item.id,
        type: 'FOOD',
        foodId: item.foodId ?? '',
        quantity: signal({ amount: item.quantityAmount ?? null, unit: (item.quantityUnit as QuantityUnit) ?? null }),
        checked: signal(item.checked),
      };
    }
    return {
      id: item.id,
      type: 'NON_FOOD',
      name: signal(item.name ?? ''),
      note: signal(item.note ?? null),
      quantity: signal({ amount: item.quantityAmount ?? null, unit: (item.quantityUnit as QuantityUnit) ?? null }),
      checked: signal(item.checked),
    };
  }

  async save(): Promise<void> {
    const invalidQuantity = this.items().some((row) => row.type === 'FOOD' && row.quantity().amount === null);
    const invalidName = this.items().some((row) => row.type === 'NON_FOOD' && row.name().trim() === '');
    if (invalidQuantity || invalidName) {
      this.showItemErrors.set(true);
      return;
    }

    const { name } = this.form.getRawValue();
    const items = this.items().map((row, index) => toSaveItem(row, index));
    const draft: ShoppingListDraft = { id: this.listId() ?? '', name, items };

    const saved = await this.repository.save(draft);
    this.listId.set(saved.id);
    await this.router.navigateByUrl('/tabs/menu/shopping');
  }

  async delete(): Promise<void> {
    const id = this.listId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('SHOPPING.LIST.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('SHOPPING.LIST.DELETE_CONFIRM_MESSAGE', { name: this.form.getRawValue().name ?? this.translate.instant('SHOPPING.LIST.UNNAMED') }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/menu/shopping');
  }
}

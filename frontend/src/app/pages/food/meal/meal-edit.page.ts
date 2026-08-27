import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Meal } from '../../../api/model/meal';
import { Recipe } from '../../../api/model/recipe';
import { FoodRepository } from '../../../core/data/food.repository';
import { MealRepository } from '../../../core/data/meal.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { MealDraft, MealItemSaveItem } from '../../../core/storage/storage-backend';
import { today } from '../../../shared/local-date';
import { ParsedQuantity, QuantityUnit } from '../../../shared/quantity';
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { ReorderListComponent } from '../../../shared/reorder-list/reorder-list.component';
import { compareRank, matchesSearch } from '../../../shared/text-search';
import { deviceTimeZoneId, instantFromLocalDateTime } from '../../../shared/timezone';
import { uuidV4 } from '../../../core/sync/uuid';
import { computeMealItemEffective } from './meal-item-summary';

const NO_QUANTITY: ParsedQuantity<QuantityUnit> = { amount: null, unit: null };

interface RecipeItemRow {
  id: string;
  type: 'RECIPE';
  recipeId: string;
  servings: WritableSignal<number>;
}
interface FoodItemRow {
  id: string;
  type: 'FOOD';
  foodId: string;
  quantity: WritableSignal<ParsedQuantity<QuantityUnit>>;
  servings: WritableSignal<number>;
}
interface CustomItemRow {
  id: string;
  type: 'CUSTOM';
  displayName: WritableSignal<string>;
  caloriesKcal: WritableSignal<number | null>;
  proteinG: WritableSignal<number | null>;
  carbsG: WritableSignal<number | null>;
  fatG: WritableSignal<number | null>;
  priceHuf: WritableSignal<number | null>;
  servings: WritableSignal<number>;
}
type ItemRow = RecipeItemRow | FoodItemRow | CustomItemRow;

function toSaveItem(row: ItemRow, sortOrder: number): MealItemSaveItem {
  if (row.type === 'RECIPE') {
    return { id: row.id, type: 'RECIPE', recipeId: row.recipeId, servings: row.servings(), sortOrder };
  }
  if (row.type === 'FOOD') {
    const quantity = row.quantity();
    return { id: row.id, type: 'FOOD', foodId: row.foodId, quantityAmount: quantity.amount ?? 0, quantityUnit: quantity.unit ?? 'g', servings: row.servings(), sortOrder };
  }
  return {
    id: row.id,
    type: 'CUSTOM',
    displayName: row.displayName(),
    caloriesKcal: row.caloriesKcal() ?? 0,
    proteinG: row.proteinG(),
    carbsG: row.carbsG(),
    fatG: row.fatG(),
    priceHuf: row.priceHuf(),
    servings: row.servings(),
    sortOrder,
  };
}

/**
 * documentation/Subfeatures/Étkezés.md "Étkezés entitás" / "Tétel — közös" — create + edit in one
 * page (route param `id` is either an existing meal's uuid or the literal `new`), mirroring
 * recipe-edit.page.ts's shape. Three item source types share one mixed reorderable list; RECIPE and
 * FOOD reuse recipe-edit's multi-select-picker pattern, CUSTOM is a plain inline form row.
 */
@Component({
  selector: 'app-meal-edit',
  templateUrl: 'meal-edit.page.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
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
    IonTextarea,
    IonLabel,
    IonCheckbox,
    IonSearchbar,
    TranslatePipe,
    DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(MealRepository);
  readonly foodRepository = inject(FoodRepository);
  readonly recipeRepository = inject(RecipeRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly mealId = signal<string | null>(null);
  /** The meal being edited, kept so `save()` can preserve its recorded instant + zone when the user didn't touch date/time. */
  private readonly loadedMeal = signal<Meal | null>(null);
  readonly items = signal<ItemRow[]>([]);
  readonly activePicker = signal<'none' | 'recipe' | 'food'>('none');
  readonly pickerQuery = signal('');
  readonly pickedIds = signal<ReadonlySet<string>>(new Set());
  readonly showItemErrors = signal(false);

  readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control(today(), [Validators.required]),
    time: this.fb.nonNullable.control(currentTime(), [Validators.required]),
    note: this.fb.control<string | null>(null),
  });

  readonly recipeIds = computed(() => this.items().filter((row): row is RecipeItemRow => row.type === 'RECIPE').map((row) => row.recipeId));
  readonly foodIds = computed(() => this.items().filter((row): row is FoodItemRow => row.type === 'FOOD').map((row) => row.foodId));

  readonly recipePickerResults = computed(() => {
    const query = this.pickerQuery();
    return this.recipeRepository
      .items()
      .filter((recipe) => matchesSearch(query, recipe.name))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  readonly foodPickerResults = computed(() => {
    const query = this.pickerQuery();
    return this.foodRepository
      .items()
      .filter((food) => matchesSearch(query, food.name) || matchesSearch(query, food.brand ?? ''))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.recipeRepository.load(), this.foodRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((item) => item.id === idParam);
      if (existing === undefined) {
        await this.router.navigateByUrl('/tabs/food/meal');
        return;
      }
      this.mealId.set(idParam);
      this.loadedMeal.set(existing);
      const [dateIso, timeIso] = splitInstant(existing.eatenAt);
      this.form.reset({ date: dateIso, time: timeIso, note: existing.note ?? null }, { emitEvent: false });
      this.items.set(
        existing.items
          .filter((item) => !item.deleted)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => this.buildRowFromDto(item)),
      );
    }
  }

  recipeOf(row: RecipeItemRow): Recipe | undefined {
    return this.recipeRepository.items().find((recipe) => recipe.id === row.recipeId);
  }

  foodOf(row: FoodItemRow): Food | undefined {
    return this.foodRepository.items().find((food) => food.id === row.foodId);
  }

  effectiveOf(row: ItemRow, index: number) {
    return computeMealItemEffective(toSaveItem(row, index), this.recipeRepository.items(), this.foodRepository.items());
  }

  togglePicker(kind: 'recipe' | 'food'): void {
    this.activePicker.set(this.activePicker() === kind ? 'none' : kind);
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
    const kind = this.activePicker();
    const newRows: ItemRow[] =
      kind === 'recipe'
        ? [...this.pickedIds()].map((recipeId) => ({ id: uuidV4(), type: 'RECIPE', recipeId, servings: signal(1) }) satisfies RecipeItemRow)
        : [...this.pickedIds()].map((foodId) => ({ id: uuidV4(), type: 'FOOD', foodId, quantity: signal(NO_QUANTITY), servings: signal(1) }) satisfies FoodItemRow);
    this.items.update((rows) => [...rows, ...newRows]);
    this.activePicker.set('none');
  }

  addCustomRow(): void {
    const row: CustomItemRow = {
      id: uuidV4(),
      type: 'CUSTOM',
      displayName: signal(''),
      caloriesKcal: signal(null),
      proteinG: signal(null),
      carbsG: signal(null),
      fatG: signal(null),
      priceHuf: signal(null),
      servings: signal(1),
    };
    this.items.update((rows) => [...rows, row]);
  }

  onItemsReordered(reordered: ItemRow[]): void {
    this.items.set(reordered);
  }

  removeItem(row: ItemRow): void {
    this.items.update((rows) => rows.filter((entry) => entry.id !== row.id));
  }

  private buildRowFromDto(item: { id: string; type: string; recipeId?: string | null; foodId?: string | null; quantityAmount?: number | null; quantityUnit?: string | null; displayName?: string | null; caloriesKcal?: number | null; proteinG?: number | null; carbsG?: number | null; fatG?: number | null; priceHuf?: number | null; servings: number }): ItemRow {
    if (item.type === 'RECIPE') {
      return { id: item.id, type: 'RECIPE', recipeId: item.recipeId ?? '', servings: signal(item.servings) };
    }
    if (item.type === 'FOOD') {
      return {
        id: item.id,
        type: 'FOOD',
        foodId: item.foodId ?? '',
        quantity: signal({ amount: item.quantityAmount ?? null, unit: (item.quantityUnit as QuantityUnit) ?? null }),
        servings: signal(item.servings),
      };
    }
    return {
      id: item.id,
      type: 'CUSTOM',
      displayName: signal(item.displayName ?? ''),
      caloriesKcal: signal(item.caloriesKcal ?? null),
      proteinG: signal(item.proteinG ?? null),
      carbsG: signal(item.carbsG ?? null),
      fatG: signal(item.fatG ?? null),
      priceHuf: signal(item.priceHuf ?? null),
      servings: signal(item.servings),
    };
  }

  /**
   * documentation/Subfeatures/Étkezés.md "Időzóna" — `eatenAt` + `timeZoneId` record *where and when*
   * the meal was actually eaten. On an edit that leaves the date/time fields untouched, keep the
   * original pair verbatim; only a real date/time change re-stamps it as "now, in this device's zone".
   */
  private resolveInstant(date: string, time: string): { eatenAt: string; timeZoneId: string } {
    const existing = this.loadedMeal();
    if (existing !== null) {
      const [originalDate, originalTime] = splitInstant(existing.eatenAt);
      if (date === originalDate && time === originalTime) {
        return { eatenAt: existing.eatenAt, timeZoneId: existing.timeZoneId };
      }
    }
    return { eatenAt: instantFromLocalDateTime(date, time), timeZoneId: deviceTimeZoneId() };
  }

  async save(): Promise<void> {
    const invalidQuantity = this.items().some((row) => row.type === 'FOOD' && row.quantity().amount === null);
    const invalidCustom = this.items().some((row) => row.type === 'CUSTOM' && (row.displayName().trim() === '' || row.caloriesKcal() === null));
    const invalidServings = this.items().some((row) => row.servings() <= 0);
    if (this.form.invalid || this.items().length === 0 || invalidQuantity || invalidCustom || invalidServings) {
      this.form.markAllAsTouched();
      this.showItemErrors.set(true);
      return;
    }

    const { date, time, note } = this.form.getRawValue();
    const items = this.items().map((row, index) => toSaveItem(row, index));
    const draft: MealDraft = {
      id: this.mealId() ?? '',
      ...this.resolveInstant(date, time),
      note,
      items,
    };

    const saved = await this.repository.save(draft);
    this.mealId.set(saved.id);
    await this.router.navigateByUrl('/tabs/food/meal');
  }

  async delete(): Promise<void> {
    const id = this.mealId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.MEAL.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.MEAL.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/food/meal');
  }
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** `eatenAt` (UTC ISO instant) → device-local `[YYYY-MM-DD, HH:mm]`, for prefilling the edit form's plain date/time inputs. */
function splitInstant(isoInstant: string): [string, string] {
  const date = new Date(isoInstant);
  const dateIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeIso = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return [dateIso, timeIso];
}

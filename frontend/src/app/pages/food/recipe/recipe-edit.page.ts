import { ChangeDetectionStrategy, Component, Injector, OnInit, Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ItemReorderEventDetail,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodRepository } from '../../../core/data/food.repository';
import { RecipeDuplicateError, RecipeRepository } from '../../../core/data/recipe.repository';
import { RecipeDraft, RecipeIngredientSaveItem } from '../../../core/storage/storage-backend';
import { uuidV4 } from '../../../core/sync/uuid';
import { ParsedQuantity, QuantityUnit } from '../../../shared/quantity';
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { compareRank, matchesSearch } from '../../../shared/text-search';
import { computeRecipeSummary, formatIngredientQuantity } from './recipe-summary';

const NO_QUANTITY: ParsedQuantity<QuantityUnit> = { amount: null, unit: null };

interface IngredientRow {
  id: string;
  foodId: string;
  quantityControl: FormControl<ParsedQuantity<QuantityUnit>>;
  quantity: Signal<ParsedQuantity<QuantityUnit>>;
}

/**
 * documentation/Subfeatures/Recept.md: create + edit in one page (route param `id` is either an
 * existing recipe's uuid or the literal `new`), mirroring PackingTemplateEditorPage's shape —
 * name/note form, multi-select Food picker, reorderable ingredient list with per-row quantity, and
 * the computed price/nutrient summary (pure client calc against the local Food catalog snapshot).
 */
@Component({
  selector: 'app-recipe-edit',
  templateUrl: 'recipe-edit.page.html',
  imports: [
    ReactiveFormsModule,
    QuantityInputComponent,
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
    IonIcon,
    IonCheckbox,
    IonSearchbar,
    IonReorderGroup,
    IonReorder,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly repository = inject(RecipeRepository);
  readonly foodRepository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly isNative = Capacitor.isNativePlatform();
  readonly recipeId = signal<string | null>(null);
  readonly ingredients = signal<IngredientRow[]>([]);
  readonly pickerOpen = signal(false);
  readonly pickerQuery = signal('');
  readonly pickedFoodIds = signal<ReadonlySet<string>>(new Set());
  readonly showIngredientErrors = signal(false);
  readonly duplicateError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    note: this.fb.control<string | null>(null),
  });

  private readonly foodById = computed(() => new Map(this.foodRepository.items().map((food) => [food.id, food])));

  readonly excludedFoodIds = computed(() => this.ingredients().map((row) => row.foodId));

  readonly pickerResults = computed(() => {
    const query = this.pickerQuery();
    return this.foodRepository
      .items()
      .filter((food) => matchesSearch(query, food.name) || matchesSearch(query, food.brand ?? ''))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  readonly summary = computed(() => {
    const foods = this.foodRepository.items();
    const ingredients = this.ingredients()
      .map((row) => ({ foodId: row.foodId, quantityAmount: row.quantity().amount, quantityUnit: row.quantity().unit }))
      .filter((row): row is { foodId: string; quantityAmount: number; quantityUnit: QuantityUnit } => row.quantityAmount !== null && row.quantityUnit !== null);
    return computeRecipeSummary(ingredients, foods);
  });

  /** Pre-formatted for the template — avoids piping inside a translate-pipe parameter object. */
  readonly summaryDisplay = computed(() => {
    const s = this.summary();
    return {
      priceHuf: Math.round(s.priceHuf),
      energyKcal: Math.round(s.energyKcal),
      proteinG: s.proteinG.toFixed(1),
      carbsG: s.carbsG.toFixed(1),
      fatG: s.fatG.toFixed(1),
      incomplete: s.incomplete,
    };
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((item) => item.id === idParam);
      if (existing === undefined) {
        // Deleted (or otherwise gone) recipe — a stale deep-link/back-navigation must not fall
        // through to editing, since Save would then PUT against the dead row (409 ENTITY_DELETED).
        await this.router.navigateByUrl('/tabs/food/recipe');
        return;
      }
      this.recipeId.set(idParam);
      this.form.reset({ name: existing.name, note: existing.note ?? null }, { emitEvent: false });
      this.ingredients.set(
        existing.ingredients
          .filter((ingredient) => !ingredient.deleted)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((ingredient) =>
            this.buildRow(ingredient.id, ingredient.foodId, { amount: ingredient.quantityAmount, unit: ingredient.quantityUnit as QuantityUnit }),
          ),
      );
    }
  }

  foodOf(row: IngredientRow): Food | undefined {
    return this.foodById().get(row.foodId);
  }

  formattedQuantity(row: IngredientRow): string {
    const quantity = row.quantity();
    if (quantity.amount === null || quantity.unit === null) {
      return '';
    }
    return formatIngredientQuantity(this.foodOf(row), quantity.amount, quantity.unit);
  }

  togglePicker(): void {
    this.pickerOpen.set(!this.pickerOpen());
    this.pickerQuery.set('');
    this.pickedFoodIds.set(new Set());
  }

  isPicked(food: Food): boolean {
    return this.pickedFoodIds().has(food.id);
  }

  toggleFoodPick(food: Food): void {
    if (this.excludedFoodIds().includes(food.id)) {
      return;
    }
    this.pickedFoodIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(food.id)) {
        next.delete(food.id);
      } else {
        next.add(food.id);
      }
      return next;
    });
  }

  confirmPicked(): void {
    const newRows = [...this.pickedFoodIds()].map((foodId) => this.buildRow(uuidV4(), foodId, NO_QUANTITY));
    this.ingredients.update((rows) => [...rows, ...newRows]);
    this.togglePicker();
  }

  private buildRow(id: string, foodId: string, initialQuantity: ParsedQuantity<QuantityUnit>): IngredientRow {
    const quantityControl = this.fb.nonNullable.control<ParsedQuantity<QuantityUnit>>(initialQuantity, [
      (control) => (control.value.amount === null ? { required: true } : null),
    ]);
    const quantity = toSignal(quantityControl.valueChanges, { initialValue: quantityControl.getRawValue(), injector: this.injector });
    return { id, foodId, quantityControl, quantity };
  }

  moveUp(index: number): void {
    if (index === 0) {
      return;
    }
    this.ingredients.update((rows) => swap(rows, index, index - 1));
  }

  moveDown(index: number): void {
    if (index === this.ingredients().length - 1) {
      return;
    }
    this.ingredients.update((rows) => swap(rows, index, index + 1));
  }

  onIonReorder(event: CustomEvent<ItemReorderEventDetail>): void {
    this.ingredients.set(event.detail.complete(this.ingredients().slice()) as IngredientRow[]);
  }

  removeIngredient(row: IngredientRow): void {
    this.ingredients.update((rows) => rows.filter((entry) => entry.id !== row.id));
  }

  async save(): Promise<void> {
    this.duplicateError.set(null);
    if (this.form.invalid || this.ingredients().some((row) => row.quantity().amount === null)) {
      this.form.markAllAsTouched();
      this.showIngredientErrors.set(true);
      return;
    }

    const { name, note } = this.form.getRawValue();
    const ingredients: RecipeIngredientSaveItem[] = this.ingredients().map((row, index) => {
      const quantity = row.quantity();
      return { id: row.id, foodId: row.foodId, quantityAmount: quantity.amount!, quantityUnit: quantity.unit!, sortOrder: index };
    });
    const draft: RecipeDraft = { id: this.recipeId() ?? '', name, note, ingredients };

    try {
      const saved = await this.repository.save(draft);
      this.recipeId.set(saved.id);
      await this.router.navigateByUrl('/tabs/food/recipe');
    } catch (error) {
      if (error instanceof RecipeDuplicateError) {
        this.duplicateError.set(this.translate.instant('FOOD.RECIPE.DUPLICATE_ERROR'));
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.recipeId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.RECIPE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.RECIPE.DELETE_CONFIRM_MESSAGE', { name: this.form.controls.name.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/food/recipe');
  }
}

function swap<T>(items: readonly T[], a: number, b: number): T[] {
  const next = items.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

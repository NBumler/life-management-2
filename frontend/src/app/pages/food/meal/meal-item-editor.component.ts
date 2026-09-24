import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { ParsedQuantity, QuantityUnit } from '../../../shared/quantity';
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { computeMealItemEffective } from './meal-item-summary';
import { CustomItemRow, FoodItemRow, ItemRow, RecipeItemRow, isRowComplete, toSaveItem } from './meal-item-row';
import { EffectiveIngredient, effectiveRecipeIngredients, isDivertedFromRecipe } from './recipe-overrides';

const SERVINGS_STEP = 0.5;
/** The units worth a one-tap chip for food portions; anything else is still typeable free-text. */
const FOOD_QUANTITY_UNIT_CHIPS = ['g', 'dkg', 'db', 'ml'];

/**
 * documentation/Subfeatures/Étkezés.md "Tétel — közös" — the full-screen editor for a single meal
 * item, shown in an `<ion-modal>` from the meal editor's summary list. One control per line (the
 * quantity field finally gets the whole width), a stepper for the servings multiplier, and a live
 * effective kcal/price preview. A RECIPE item can override each ingredient's quantity for this meal
 * only (backlog/121) — the recipe stays unchanged, `servings` still multiplies the overridden amount.
 * `done` only fires while the row is valid; a backdrop dismiss leaves
 * the row flagged "incomplete" in the list and blocked at save.
 */
@Component({
  selector: 'app-meal-item-editor',
  templateUrl: 'meal-item-editor.component.html',
  styleUrls: ['meal-item-editor.component.scss'],
  imports: [
    ReactiveFormsModule,
    QuantityInputComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonList,
    IonItem,
    IonInput,
    IonLabel,
    IonNote,
    TranslatePipe,
    DecimalPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealItemEditorComponent {
  /** The live row object shared with the parent list — edits here mutate it in place. */
  @Input({ required: true }) row!: ItemRow;
  /** Resolved item name for the header (food/recipe name, or a generic label for CUSTOM). */
  @Input() title = '';
  @Input() foods: readonly Food[] = [];
  @Input() recipes: readonly Recipe[] = [];

  @Output() readonly done = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  private readonly servingsInput = viewChild<IonInput>('servingsInput');
  private readonly destroyRef = inject(DestroyRef);
  /** One quantity control per recipe ingredient, created on first render and kept for the modal's lifetime. */
  private readonly ingredientControls = new Map<string, FormControl<ParsedQuantity<QuantityUnit>>>();

  /** backlog/121 — the collapsible "Hozzávalók" section of a RECIPE item. */
  readonly ingredientsOpen = signal(false);

  readonly ingredients = computed<EffectiveIngredient[]>(() => {
    if (this.row.type !== 'RECIPE') {
      return [];
    }
    const recipe = this.recipes.find((candidate) => candidate.id === this.recipeRow.recipeId);
    return effectiveRecipeIngredients(recipe, this.recipeRow.overrides());
  });

  readonly diverted = computed(() => isDivertedFromRecipe(this.ingredients()));

  readonly effective = computed(() => computeMealItemEffective(toSaveItem(this.row, 0), this.recipes, this.foods));
  readonly valid = computed(() => isRowComplete(this.row));

  get recipeRow(): RecipeItemRow {
    return this.row as RecipeItemRow;
  }

  get foodRow(): FoodItemRow {
    return this.row as FoodItemRow;
  }

  get customRow(): CustomItemRow {
    return this.row as CustomItemRow;
  }

  foodName(foodId: string): string {
    return this.foods.find((food) => food.id === foodId)?.name ?? '—';
  }

  ingredientControl(ingredient: EffectiveIngredient): FormControl<ParsedQuantity<QuantityUnit>> {
    let control = this.ingredientControls.get(ingredient.recipeIngredientId);
    if (control === undefined) {
      control = new FormControl<ParsedQuantity<QuantityUnit>>(
        { amount: ingredient.quantityAmount, unit: ingredient.quantityUnit as QuantityUnit },
        { nonNullable: true },
      );
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value) => this.setIngredientQuantity(ingredient.recipeIngredientId, value));
      this.ingredientControls.set(ingredient.recipeIngredientId, control);
    }
    return control;
  }

  /**
   * The typed quantity replaces the recipe's for this meal (0 = left out); typing the recipe's own
   * quantity back drops the override. An unparseable / empty field leaves the last valid value.
   */
  setIngredientQuantity(recipeIngredientId: string, value: ParsedQuantity<QuantityUnit>): void {
    const ingredient = this.ingredients().find((candidate) => candidate.recipeIngredientId === recipeIngredientId);
    if (ingredient === undefined || value.amount === null || value.amount < 0 || value.unit === null) {
      return;
    }
    const amount = value.amount;
    const unit = value.unit;
    const matchesRecipe = !ingredient.offRecipe && amount === ingredient.recipeAmount && unit === ingredient.recipeUnit;
    this.recipeRow.overrides.update((overrides) => {
      const rest = overrides.filter((override) => override.recipeIngredientId !== recipeIngredientId);
      return matchesRecipe ? rest : [...rest, { recipeIngredientId, foodId: ingredient.foodId, quantityAmount: amount, quantityUnit: unit }];
    });
  }

  /** Back to the recipe's quantity (an off-recipe override is removed entirely). */
  resetIngredient(ingredient: EffectiveIngredient): void {
    this.recipeRow.overrides.update((overrides) =>
      overrides.filter((override) => override.recipeIngredientId !== ingredient.recipeIngredientId),
    );
    if (ingredient.offRecipe) {
      this.ingredientControls.delete(ingredient.recipeIngredientId);
      return;
    }
    this.ingredientControls
      .get(ingredient.recipeIngredientId)
      ?.setValue({ amount: ingredient.recipeAmount, unit: ingredient.recipeUnit as QuantityUnit }, { emitEvent: false });
  }

  adjustServings(delta: number): void {
    const next = Math.round((this.row.servings() + delta) * 100) / 100;
    if (next > 0) {
      this.row.servings.set(next);
    }
  }

  onServingsInput(raw: string): void {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      this.row.servings.set(value);
      return;
    }
    // Rejected (empty / 0 / negative / NaN): the one-way `[value]` binding won't repaint because the
    // signal didn't change, so put the field's DOM value back to the model explicitly.
    void this.servingsInput()
      ?.getInputElement()
      .then((el) => (el.value = String(this.row.servings())));
  }

  /**
   * `''` / unparseable / negative → null, otherwise the parsed number — for the CUSTOM
   * calorie/macro/price fields (a negative kcal / macro / price is not a real value).
   */
  parseOptionalNumber(raw: string): number | null {
    if (raw === '') {
      return null;
    }
    const value = Number(raw);
    return Number.isNaN(value) || value < 0 ? null : value;
  }

  protected readonly step = SERVINGS_STEP;
  protected readonly quantityUnitChips = FOOD_QUANTITY_UNIT_CHIPS;
}

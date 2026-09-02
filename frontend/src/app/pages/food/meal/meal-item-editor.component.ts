import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
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
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { computeMealItemEffective } from './meal-item-summary';
import { CustomItemRow, FoodItemRow, ItemRow, RecipeItemRow, isRowComplete, toSaveItem } from './meal-item-row';

const SERVINGS_STEP = 0.5;
/** The units worth a one-tap chip for food portions; anything else is still typeable free-text. */
const FOOD_QUANTITY_UNIT_CHIPS = ['g', 'dkg', 'db', 'ml'];

/**
 * documentation/Subfeatures/Étkezés.md "Tétel — közös" — the full-screen editor for a single meal
 * item, shown in an `<ion-modal>` from the meal editor's summary list. One control per line (the
 * quantity field finally gets the whole width), a stepper for the servings multiplier, and a live
 * effective kcal/price preview. `done` only fires while the row is valid; a backdrop dismiss leaves
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
    }
  }

  /** `''` / unparseable → null, otherwise the parsed number — for the CUSTOM calorie/macro/price fields. */
  parseOptionalNumber(raw: string): number | null {
    if (raw === '') {
      return null;
    }
    const value = Number(raw);
    return Number.isNaN(value) ? null : value;
  }

  protected readonly step = SERVINGS_STEP;
  protected readonly quantityUnitChips = FOOD_QUANTITY_UNIT_CHIPS;
}

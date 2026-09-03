import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonModal,
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
import { MealDraft } from '../../../core/storage/storage-backend';
import { today } from '../../../shared/local-date';
import { formatQuantityValue } from '../../../shared/quantity';
import { ReorderListComponent } from '../../../shared/reorder-list/reorder-list.component';
import { compareRank, matchesSearch } from '../../../shared/text-search';
import { deviceTimeZoneId, instantFromLocalDateTime } from '../../../shared/timezone';
import { MealItemEditorComponent } from './meal-item-editor.component';
import {
  FoodItemRow,
  ItemRow,
  RecipeItemRow,
  RowSnapshot,
  buildRowFromDto,
  createCustomRow,
  createFoodRow,
  createRecipeRow,
  isRowComplete,
  restoreRow,
  rowNeedsInput,
  snapshotRow,
  toSaveItem,
} from './meal-item-row';
import { computeMealItemEffective } from './meal-item-summary';

/**
 * documentation/Subfeatures/Étkezés.md "Étkezés entitás" / "Tétel — közös" — create + edit in one
 * page (route param `id` is either an existing meal's uuid or the literal `new`), mirroring
 * recipe-edit.page.ts's shape. Three item source types share one mixed reorderable list, rendered as
 * compact read-only summaries; tapping a row (or adding one via a picker) opens `MealItemEditorComponent`
 * in a modal for the full-width per-item form. The row objects (`meal-item-row.ts`) are shared
 * verbatim between the list and the modal.
 */
@Component({
  selector: 'app-meal-edit',
  templateUrl: 'meal-edit.page.html',
  styleUrls: ['meal-edit.page.scss'],
  imports: [
    ReactiveFormsModule,
    ReorderListComponent,
    MealItemEditorComponent,
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
    IonModal,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
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
  /** The item row currently open in the editor modal, or `null` when it's closed. */
  readonly editorRow = signal<ItemRow | null>(null);
  /** Value copy of `editorRow` taken on open, so "Mégse" can put the shared row object back. */
  private editorSnapshot: RowSnapshot | null = null;
  /** True when the editor opened on a row that wasn't yet savable — "Mégse" then drops it entirely. */
  private editorDropOnCancel = false;

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
          .map((item) => buildRowFromDto(item, this.injector)),
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

  isRowComplete(row: ItemRow): boolean {
    return isRowComplete(row);
  }

  /** Header text for a summary row / the editor modal: the catalog name, or the custom item's own name. */
  rowTitle(row: ItemRow): string {
    if (row.type === 'RECIPE') {
      return this.recipeOf(row)?.name ?? '—';
    }
    if (row.type === 'FOOD') {
      return this.foodOf(row)?.name ?? '—';
    }
    return row.displayName().trim() || this.translate.instant('FOOD.MEAL.CUSTOM_ITEM_TITLE');
  }

  /** One-line summary under the row title: quantity (FOOD) · servings · effective kcal/price. */
  rowSummaryLine(row: ItemRow, index: number): string {
    if (row.type === 'FOOD' && row.quantity().amount === null) {
      return this.translate.instant('FOOD.MEAL.QUANTITY_REQUIRED');
    }
    const parts: string[] = [];
    if (row.type === 'FOOD') {
      parts.push(formatQuantityValue(row.quantity()));
    }
    parts.push(this.translate.instant('FOOD.MEAL.SERVINGS_SHORT', { value: row.servings() }));
    const effective = this.effectiveOf(row, index);
    parts.push(
      this.translate.instant('FOOD.MEAL.EFFECTIVE_SUMMARY', {
        kcal: Math.round(effective.energyKcal),
        price: Math.round(effective.priceHuf),
      }),
    );
    return parts.join(' · ');
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
        ? [...this.pickedIds()].map((recipeId) => createRecipeRow(recipeId))
        : [...this.pickedIds()].map((foodId) => createFoodRow(foodId, this.injector));
    this.items.update((rows) => [...rows, ...newRows]);
    this.activePicker.set('none');
    const firstNeedingInput = newRows.find(rowNeedsInput);
    if (firstNeedingInput !== undefined) {
      this.openEditor(firstNeedingInput);
    }
  }

  addCustomRow(): void {
    const row = createCustomRow();
    this.items.update((rows) => [...rows, row]);
    this.openEditor(row);
  }

  openEditor(row: ItemRow): void {
    this.editorSnapshot = snapshotRow(row);
    this.editorDropOnCancel = !isRowComplete(row);
    this.editorRow.set(row);
  }

  /** "Kész" — keep every edit the modal made to the shared row, just close. */
  commitEditor(): void {
    this.editorSnapshot = null;
    this.editorDropOnCancel = false;
    this.editorRow.set(null);
  }

  /**
   * "Mégse" / backdrop dismiss — undo the modal's edits: a row that wasn't savable when the editor
   * opened (a freshly picked/added one) is dropped from the list; any other row is restored to its
   * on-open snapshot.
   */
  cancelEditor(): void {
    const row = this.editorRow();
    if (row !== null) {
      if (this.editorDropOnCancel) {
        this.removeItem(row);
      } else if (this.editorSnapshot !== null) {
        restoreRow(row, this.editorSnapshot);
      }
    }
    this.editorSnapshot = null;
    this.editorDropOnCancel = false;
    this.editorRow.set(null);
  }

  /** `(didDismiss)` fires for a backdrop/swipe close (→ cancel) and also after our own commit/cancel
   * already nulled `editorRow` (→ no-op). */
  onEditorDismiss(): void {
    if (this.editorRow() !== null) {
      this.cancelEditor();
    }
  }

  onItemsReordered(reordered: ItemRow[]): void {
    this.items.set(reordered);
  }

  removeItem(row: ItemRow): void {
    this.items.update((rows) => rows.filter((entry) => entry.id !== row.id));
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
    const hasIncompleteItem = this.items().some((row) => !isRowComplete(row));
    if (this.form.invalid || this.items().length === 0 || hasIncompleteItem) {
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

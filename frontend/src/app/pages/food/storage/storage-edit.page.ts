import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { StoredFood } from '../../../api/model/storedFood';
import { FoodRepository } from '../../../core/data/food.repository';
import { StoredFoodRepository } from '../../../core/data/stored-food.repository';
import { today } from '../../../shared/local-date';
import { DurationUnit, ParsedQuantity, QuantityUnit } from '../../../shared/quantity';
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { compareRank, matchesSearch } from '../../../shared/text-search';
import { afterOpeningDuration, allowedStorageLocations, catalogDurationFor, computeInitialExpiry, computeOpenedExpiry } from './shelf-life';

const NO_QUANTITY: ParsedQuantity<QuantityUnit> = { amount: null, unit: null };
const NO_DURATION: ParsedQuantity<DurationUnit> = { amount: null, unit: null };

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md "Létrehozás — manuális": Food picker (searchable) ->
 * quantity/hely/lejárat form. Editing an existing item only allows quantity/hely/lejárat — the food
 * itself and the opened flag are not editable here ("felbontás" is its own action on the list page).
 */
@Component({
  selector: 'app-storage-edit',
  templateUrl: 'storage-edit.page.html',
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
    IonLabel,
    IonCheckbox,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(StoredFoodRepository);
  readonly foodRepository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly StorageLocationEnum = StoredFood.StorageLocationEnum;
  readonly itemId = signal<string | null>(null);
  readonly selectedFood = signal<Food | null>(null);
  readonly foodId = computed(() => this.selectedFood()?.id ?? null);
  readonly pickerQuery = signal('');
  readonly openOnCreate = signal(false);

  readonly pickerResults = computed(() => {
    const query = this.pickerQuery();
    return this.foodRepository
      .items()
      .filter((food) => matchesSearch(query, food.name) || matchesSearch(query, food.brand ?? ''))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  readonly allowedLocations = computed(() => {
    const food = this.selectedFood();
    return food === null ? allowedStorageLocations({}) : allowedStorageLocations(food);
  });

  readonly form = this.fb.group({
    quantity: this.fb.nonNullable.control<ParsedQuantity<QuantityUnit>>(NO_QUANTITY, [
      (control) => (control.value.amount === null ? { required: true } : null),
    ]),
    storageLocation: this.fb.nonNullable.control<StoredFood.StorageLocationEnum>(StoredFood.StorageLocationEnum.Fridge, [Validators.required]),
    expiresOn: this.fb.nonNullable.control<string>(today(), [Validators.required]),
  });

  constructor() {
    // documentation/Subfeatures/Élelmiszer tárolás.md "Lejárat (általános)": prefill re-runs when the
    // storage location changes, but only while creating — an edit never silently overwrites a
    // previously-adjusted expiry just because the user re-picks the same location.
    this.form.controls.storageLocation.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.prefillExpiry());
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.foodRepository.load()]);
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.itemId.set(idParam);
      const existing = this.repository.items().find((item) => item.id === idParam);
      if (existing !== undefined) {
        this.selectedFood.set(this.foodRepository.items().find((food) => food.id === existing.foodId) ?? null);
        this.form.reset(
          {
            quantity: { amount: existing.quantityAmount, unit: existing.quantityUnit as QuantityUnit },
            storageLocation: existing.storageLocation,
            expiresOn: existing.expiresOn,
          },
          { emitEvent: false },
        );
      }
    }
  }

  selectFood(food: Food): void {
    this.selectedFood.set(food);
    const allowed = allowedStorageLocations(food);
    this.form.controls.storageLocation.setValue(allowed[0], { emitEvent: false });
    this.prefillExpiry();
  }

  changeFood(): void {
    this.selectedFood.set(null);
    this.pickerQuery.set('');
  }

  private prefillExpiry(): void {
    if (this.itemId() !== null) {
      return;
    }
    const food = this.selectedFood();
    if (food === null) {
      return;
    }
    const duration = catalogDurationFor(food, this.form.controls.storageLocation.value);
    this.form.controls.expiresOn.setValue(computeInitialExpiry(today(), duration) ?? today(), { emitEvent: false });
  }

  async save(): Promise<void> {
    const foodId = this.foodId();
    if (foodId === null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.quantity.amount === null || raw.quantity.unit === null) {
      return;
    }

    let expiresOn = raw.expiresOn;
    let opened = false;
    let openedAt: string | null = null;
    const existingId = this.itemId();
    if (existingId === null && this.openOnCreate()) {
      const food = this.selectedFood();
      const duration = food === null ? NO_DURATION : afterOpeningDuration(food);
      expiresOn = computeOpenedExpiry(expiresOn, today(), duration);
      opened = true;
      openedAt = new Date().toISOString();
    } else if (existingId !== null) {
      const existing = this.repository.items().find((item) => item.id === existingId);
      opened = existing?.opened ?? false;
      openedAt = existing?.openedAt ?? null;
    }

    const draft: StoredFood = {
      id: existingId ?? '',
      foodId,
      quantityAmount: raw.quantity.amount,
      quantityUnit: raw.quantity.unit,
      storageLocation: raw.storageLocation,
      expiresOn,
      opened,
      openedAt,
      deleted: false,
    };
    await this.repository.save(draft);
    await this.router.navigateByUrl('/tabs/food/storage');
  }

  async delete(): Promise<void> {
    const id = this.itemId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.STORAGE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.STORAGE.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/food/storage');
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonListHeader,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodDuplicateError, FoodRepository } from '../../../core/data/food.repository';
import { ParsedQuantity } from '../../../shared/quantity';
import { QuantityInputComponent } from '../../../shared/quantity-input/quantity-input.component';
import { FoodPrefillService } from './food-prefill.service';
import { OpenFoodFactsMappedFields, computeOffDiff } from './open-food-facts';
import { OpenFoodFactsService } from './open-food-facts.service';
import { chlorideFromSaltAndSodium, sodiumFromSalt } from './salt-sodium-chloride';

const NO_QUANTITY: ParsedQuantity = { amount: null, unit: null };

/**
 * `Food.netUnit`/`shelfXUnit` are plain `string | null` on the wire (see food.repository.ts on why
 * these aren't OpenAPI enums), but only ever contain one of quantity.ts's literal unit values —
 * this cast documents that trust boundary in one place instead of five inline casts.
 */
function toParsedQuantity(amount: number | null | undefined, unit: string | null | undefined): ParsedQuantity {
  return { amount: amount ?? null, unit: (unit ?? null) as ParsedQuantity['unit'] };
}

/**
 * documentation/Subfeatures/Élelmiszer manuális bevitele.md — create + edit in one page/form,
 * including the barcode "sync" button shared with
 * documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md's camera flow (which prefills this
 * same form via FoodPrefillService instead of duplicating the OFF-mapping logic).
 */
@Component({
  selector: 'app-food-edit',
  templateUrl: 'food-edit.page.html',
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
    IonListHeader,
    IonItem,
    IonInput,
    IonIcon,
    IonText,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly openFoodFacts = inject(OpenFoodFactsService);
  private readonly prefillService = inject(FoodPrefillService);

  readonly foodId = signal<string | null>(null);
  readonly duplicateError = signal<string | null>(null);
  readonly syncingBarcode = signal(false);

  private readonly sodiumTouched = signal(false);
  private readonly chlorideTouched = signal(false);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    store: this.fb.control<string | null>(null),
    brand: this.fb.control<string | null>(null),
    barcode: this.fb.control<string | null>(null),
    note: this.fb.control<string | null>(null),
    priceHuf: this.fb.control<number | null>(null),
    netAmount: this.fb.nonNullable.control<ParsedQuantity>(NO_QUANTITY),
    // documentation/Subfeatures/Élelmiszer manuális bevitele.md "1 darab": darab-definíció —
    // üresen hagyva "1 darab = 1 csomag". A QuantityInputComponent sosem commitál fél értéket,
    // így a "vagy mindkettő, vagy egyik sem" szabály itt automatikusan teljesül.
    pieceDefinition: this.fb.nonNullable.control<ParsedQuantity>(NO_QUANTITY),
    energyKcal: this.fb.control<number | null>(null),
    fatG: this.fb.control<number | null>(null),
    fatSaturatedG: this.fb.control<number | null>(null),
    fatUnsaturatedG: this.fb.control<number | null>(null),
    fatTransG: this.fb.control<number | null>(null),
    carbsG: this.fb.control<number | null>(null),
    carbsSugarsG: this.fb.control<number | null>(null),
    carbsComplexG: this.fb.control<number | null>(null),
    carbsFiberG: this.fb.control<number | null>(null),
    proteinG: this.fb.control<number | null>(null),
    saltG: this.fb.control<number | null>(null),
    sodiumG: this.fb.control<number | null>(null),
    chlorideG: this.fb.control<number | null>(null),
    shelfRoom: this.fb.nonNullable.control<ParsedQuantity>(NO_QUANTITY),
    shelfFridge: this.fb.nonNullable.control<ParsedQuantity>(NO_QUANTITY),
    shelfFreezer: this.fb.nonNullable.control<ParsedQuantity>(NO_QUANTITY),
    shelfAfterOpening: this.fb.nonNullable.control<ParsedQuantity>(NO_QUANTITY),
  });

  constructor() {
    // documentation/Subfeatures/Élelmiszer manuális bevitele.md "Só → nátrium / klorid": every
    // programmatic write below uses emitEvent:false, so a valueChanges emission on sodium/chloride
    // is always a real user edit — never triggered by this same auto-calc logic.
    this.form.controls.saltG.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.recomputeSodium();
      this.recomputeChloride();
    });
    this.form.controls.sodiumG.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.sodiumTouched.set(value !== null);
      if (value === null) {
        this.recomputeSodium();
      }
      this.recomputeChloride();
    });
    this.form.controls.chlorideG.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.chlorideTouched.set(value !== null);
      if (value === null) {
        this.recomputeChloride();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.repository.load();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      this.foodId.set(idParam);
      const existing = this.repository.items().find((food) => food.id === idParam);
      if (existing !== undefined) {
        this.loadIntoForm(existing);
      }
      return;
    }
    // documentation/Subfeatures/Vonalkódos élelmiszer beolvasás.md "Scan & Pre-fill": a fresh form
    // never shows the overwrite-confirm dialog — patchValue only, no diff/confirm needed.
    const prefill = this.prefillService.take();
    if (prefill !== null) {
      this.applyMappedFields(prefill);
    }
  }

  private loadIntoForm(food: Food): void {
    this.form.reset(
      {
        name: food.name,
        store: food.store ?? null,
        brand: food.brand ?? null,
        barcode: food.barcode ?? null,
        note: food.note ?? null,
        priceHuf: food.priceHuf ?? null,
        netAmount: toParsedQuantity(food.netAmount, food.netUnit),
        pieceDefinition: toParsedQuantity(food.pieceAmount, food.pieceUnit),
        energyKcal: food.energyKcal ?? null,
        fatG: food.fatG ?? null,
        fatSaturatedG: food.fatSaturatedG ?? null,
        fatUnsaturatedG: food.fatUnsaturatedG ?? null,
        fatTransG: food.fatTransG ?? null,
        carbsG: food.carbsG ?? null,
        carbsSugarsG: food.carbsSugarsG ?? null,
        carbsComplexG: food.carbsComplexG ?? null,
        carbsFiberG: food.carbsFiberG ?? null,
        proteinG: food.proteinG ?? null,
        saltG: food.saltG ?? null,
        sodiumG: food.sodiumG ?? null,
        chlorideG: food.chlorideG ?? null,
        shelfRoom: toParsedQuantity(food.shelfRoomAmount, food.shelfRoomUnit),
        shelfFridge: toParsedQuantity(food.shelfFridgeAmount, food.shelfFridgeUnit),
        shelfFreezer: toParsedQuantity(food.shelfFreezerAmount, food.shelfFreezerUnit),
        shelfAfterOpening: toParsedQuantity(food.shelfAfterOpeningAmount, food.shelfAfterOpeningUnit),
      },
      { emitEvent: false },
    );
    // documentation/Subfeatures/Élelmiszer manuális bevitele.md: touched-state itself isn't persisted
    // (Food has no such column) — an existing explicit value is treated as touched so re-opening the
    // form for edit never silently overwrites it the moment the user tweaks salt.
    this.sodiumTouched.set(food.sodiumG !== null && food.sodiumG !== undefined);
    this.chlorideTouched.set(food.chlorideG !== null && food.chlorideG !== undefined);
  }

  private recomputeSodium(): void {
    if (this.sodiumTouched()) {
      return;
    }
    const salt = this.form.controls.saltG.value;
    this.form.controls.sodiumG.setValue(salt === null ? null : sodiumFromSalt(salt), { emitEvent: false });
  }

  private recomputeChloride(): void {
    if (this.chlorideTouched()) {
      return;
    }
    const salt = this.form.controls.saltG.value;
    const sodium = this.form.controls.sodiumG.value;
    this.form.controls.chlorideG.setValue(salt === null || sodium === null ? null : chlorideFromSaltAndSodium(salt, sodium), {
      emitEvent: false,
    });
  }

  /**
   * documentation/Subfeatures/Élelmiszer manuális bevitele.md "Vonalkód sync gomb": re-runs the OFF
   * lookup for the EAN currently in the form (typed or scanned) and, if it would change anything,
   * confirms field-by-field before applying — "azonos értékek kihagyva" (unchanged fields don't
   * appear in the dialog at all).
   */
  async syncBarcode(): Promise<void> {
    const barcode = this.form.controls.barcode.value;
    if (barcode === null || barcode.trim() === '') {
      return;
    }
    this.syncingBarcode.set(true);
    const mapped = await this.openFoodFacts.lookup(barcode).finally(() => this.syncingBarcode.set(false));
    if (mapped === null) {
      const toast = await this.toastController.create({
        message: this.translate.instant('FOOD.FORM.BARCODE_SYNC_NO_HIT'),
        duration: 3000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const diffs = computeOffDiff(this.currentMappableFields(), mapped);
    if (diffs.length === 0) {
      return;
    }
    const message = diffs
      .map((diff) => this.translate.instant('FOOD.FORM.BARCODE_SYNC_DIFF_LINE', { field: this.fieldLabel(diff.field), old: diff.oldValue ?? '—', new: diff.newValue }))
      .join('\n');
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.FORM.BARCODE_SYNC_CONFIRM_TITLE'),
      message,
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.CONFIRM'), role: 'confirm', handler: () => this.applyMappedFields(mapped) },
      ],
    });
    await alert.present();
  }

  private currentMappableFields(): Partial<Food> {
    const raw = this.form.getRawValue();
    return {
      name: raw.name,
      brand: raw.brand,
      netAmount: raw.netAmount.amount,
      netUnit: raw.netAmount.unit,
      energyKcal: raw.energyKcal,
      fatG: raw.fatG,
      fatSaturatedG: raw.fatSaturatedG,
      fatUnsaturatedG: raw.fatUnsaturatedG,
      fatTransG: raw.fatTransG,
      carbsG: raw.carbsG,
      carbsSugarsG: raw.carbsSugarsG,
      carbsComplexG: raw.carbsComplexG,
      carbsFiberG: raw.carbsFiberG,
      proteinG: raw.proteinG,
      saltG: raw.saltG,
      sodiumG: raw.sodiumG,
    };
  }

  private applyMappedFields(mapped: Partial<Food> & OpenFoodFactsMappedFields): void {
    const patch: Record<string, unknown> = {};
    if (mapped.name !== undefined) {
      patch['name'] = mapped.name;
    }
    if (mapped.brand !== undefined) {
      patch['brand'] = mapped.brand;
    }
    if (mapped.barcode !== undefined) {
      patch['barcode'] = mapped.barcode;
    }
    if (mapped.netAmount !== undefined || mapped.netUnit !== undefined) {
      patch['netAmount'] = toParsedQuantity(mapped.netAmount, mapped.netUnit);
    }
    for (const field of [
      'energyKcal',
      'fatG',
      'fatSaturatedG',
      'fatUnsaturatedG',
      'fatTransG',
      'carbsG',
      'carbsSugarsG',
      'carbsComplexG',
      'carbsFiberG',
      'proteinG',
      'saltG',
      'sodiumG',
    ] as const) {
      if (mapped[field] !== undefined) {
        patch[field] = mapped[field];
      }
    }
    // Default emitEvent (true): lets the salt/sodium/chloride auto-calc subscriptions react exactly
    // as they would to manual typing (see the constructor).
    this.form.patchValue(patch);
  }

  private fieldLabel(field: keyof OpenFoodFactsMappedFields): string {
    const labelKeys: Record<keyof OpenFoodFactsMappedFields, string> = {
      name: 'FOOD.FORM.NAME_LABEL',
      brand: 'FOOD.FORM.BRAND_LABEL',
      netAmount: 'FOOD.FORM.NET_AMOUNT_LABEL',
      netUnit: 'FOOD.FORM.NET_AMOUNT_LABEL',
      energyKcal: 'FOOD.FORM.NUTRIENT_ENERGY',
      fatG: 'FOOD.FORM.NUTRIENT_FAT',
      fatSaturatedG: 'FOOD.FORM.NUTRIENT_FAT_SATURATED',
      fatUnsaturatedG: 'FOOD.FORM.NUTRIENT_FAT_UNSATURATED',
      fatTransG: 'FOOD.FORM.NUTRIENT_FAT_TRANS',
      carbsG: 'FOOD.FORM.NUTRIENT_CARBS',
      carbsSugarsG: 'FOOD.FORM.NUTRIENT_CARBS_SUGARS',
      carbsComplexG: 'FOOD.FORM.NUTRIENT_CARBS_COMPLEX',
      carbsFiberG: 'FOOD.FORM.NUTRIENT_CARBS_FIBER',
      proteinG: 'FOOD.FORM.NUTRIENT_PROTEIN',
      saltG: 'FOOD.FORM.NUTRIENT_SALT',
      sodiumG: 'FOOD.FORM.NUTRIENT_SODIUM',
    };
    return this.translate.instant(labelKeys[field]);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const draft: Food = {
      id: this.foodId() ?? '',
      name: raw.name,
      store: raw.store,
      brand: raw.brand,
      barcode: raw.barcode,
      note: raw.note,
      priceHuf: raw.priceHuf,
      netAmount: raw.netAmount.amount,
      netUnit: raw.netAmount.unit,
      pieceAmount: raw.pieceDefinition.amount,
      pieceUnit: raw.pieceDefinition.unit,
      energyKcal: raw.energyKcal,
      fatG: raw.fatG,
      fatSaturatedG: raw.fatSaturatedG,
      fatUnsaturatedG: raw.fatUnsaturatedG,
      fatTransG: raw.fatTransG,
      carbsG: raw.carbsG,
      carbsSugarsG: raw.carbsSugarsG,
      carbsComplexG: raw.carbsComplexG,
      carbsFiberG: raw.carbsFiberG,
      proteinG: raw.proteinG,
      saltG: raw.saltG,
      sodiumG: raw.sodiumG,
      chlorideG: raw.chlorideG,
      shelfRoomAmount: raw.shelfRoom.amount,
      shelfRoomUnit: raw.shelfRoom.unit,
      shelfFridgeAmount: raw.shelfFridge.amount,
      shelfFridgeUnit: raw.shelfFridge.unit,
      shelfFreezerAmount: raw.shelfFreezer.amount,
      shelfFreezerUnit: raw.shelfFreezer.unit,
      shelfAfterOpeningAmount: raw.shelfAfterOpening.amount,
      shelfAfterOpeningUnit: raw.shelfAfterOpening.unit,
      deleted: false,
    };

    try {
      await this.repository.save(draft);
      this.duplicateError.set(null);
      await this.router.navigateByUrl('/tabs/food/catalog');
    } catch (error) {
      if (error instanceof FoodDuplicateError) {
        this.duplicateError.set(this.translate.instant('FOOD.FORM.DUPLICATE_ERROR'));
        return;
      }
      throw error;
    }
  }

  async delete(): Promise<void> {
    const id = this.foodId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.CATALOG.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.CATALOG.DELETE_CONFIRM_MESSAGE', { name: this.form.controls.name.value }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.deleteAndNavigateBack(id) },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl('/tabs/food/catalog');
  }
}

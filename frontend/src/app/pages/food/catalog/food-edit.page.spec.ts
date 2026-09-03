import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodDuplicateError, FoodRepository } from '../../../core/data/food.repository';
import { FoodEditPage } from './food-edit.page';
import { FoodPrefillService } from './food-prefill.service';
import { OpenFoodFactsService } from './open-food-facts.service';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

describe('FoodEditPage', () => {
  let fixture: ComponentFixture<FoodEditPage>;
  let repository: jasmine.SpyObj<Pick<FoodRepository, 'load' | 'save' | 'remove' | 'countReferences'>> & {
    items: ReturnType<typeof signal<Food[]>>;
  };

  let openFoodFacts: jasmine.SpyObj<OpenFoodFactsService>;
  let prefillService: jasmine.SpyObj<FoodPrefillService>;
  let alertController: jasmine.SpyObj<AlertController>;
  let toastController: jasmine.SpyObj<ToastController>;

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('FoodRepository', ['load', 'save', 'remove', 'countReferences']) as never;
    repository.load.and.resolveTo();
    repository.countReferences.and.resolveTo(null);
    repository.items = signal<Food[]>([]);
    openFoodFacts = jasmine.createSpyObj('OpenFoodFactsService', ['lookup']);
    prefillService = jasmine.createSpyObj('FoodPrefillService', ['take']);
    prefillService.take.and.returnValue(null);
    alertController = jasmine.createSpyObj('AlertController', ['create']);
    toastController = jasmine.createSpyObj('ToastController', ['create']);

    await TestBed.configureTestingModule({
      imports: [FoodEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: FoodRepository, useValue: repository },
        { provide: OpenFoodFactsService, useValue: openFoodFacts },
        { provide: FoodPrefillService, useValue: prefillService },
        { provide: AlertController, useValue: alertController },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodEditPage);
  }

  it('create mode: starts with a blank form', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.foodId()).toBeNull();
    expect(fixture.componentInstance.form.controls.name.value).toBe('');
  });

  it('edit mode: patches the form from the already-loaded repository item', async () => {
    await createFixture('f1');
    repository.items.set([food({ store: 'Aldi', netAmount: 1, netUnit: 'l' })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.foodId()).toBe('f1');
    expect(fixture.componentInstance.form.controls.store.value).toBe('Aldi');
    expect(fixture.componentInstance.form.controls.netAmount.value).toEqual({ amount: 1, unit: 'l' });
  });

  it('salt auto-calc: setting salt fills sodium and chloride when both are untouched', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.form.controls.saltG.setValue(2.5);

    expect(fixture.componentInstance.form.controls.sodiumG.value).toBe(1);
    expect(fixture.componentInstance.form.controls.chlorideG.value).toBe(1.5);
  });

  it('salt auto-calc: a manually-typed sodium value stops auto-fill on further salt changes, but chloride keeps recomputing from it', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.saltG.setValue(2.5);

    fixture.componentInstance.form.controls.sodiumG.setValue(0.5);

    expect(fixture.componentInstance.form.controls.chlorideG.value).toBe(2);

    fixture.componentInstance.form.controls.saltG.setValue(5);

    expect(fixture.componentInstance.form.controls.sodiumG.value).toBe(0.5); // untouched by the salt change now
    expect(fixture.componentInstance.form.controls.chlorideG.value).toBe(4.5); // still auto, from the new salt + manual sodium
  });

  it('salt auto-calc: clearing a manually-typed sodium value resets it to auto mode immediately', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.saltG.setValue(2.5);
    fixture.componentInstance.form.controls.sodiumG.setValue(0.5);

    fixture.componentInstance.form.controls.sodiumG.setValue(null);

    expect(fixture.componentInstance.form.controls.sodiumG.value).toBe(1); // back to auto: 2.5 / 2.5
    expect(fixture.componentInstance.form.controls.chlorideG.value).toBe(1.5);
  });

  it('edit mode: an existing explicit sodium value is treated as touched (not overwritten by a later salt edit)', async () => {
    await createFixture('f1');
    repository.items.set([food({ saltG: 2.5, sodiumG: 0.9, chlorideG: 1.6 })]);
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.form.controls.saltG.setValue(5);

    expect(fixture.componentInstance.form.controls.sodiumG.value).toBe(0.9);
  });

  it('create mode: applies a pending barcode-scan prefill from FoodPrefillService', async () => {
    await createFixture('new');
    prefillService.take.and.returnValue({ name: 'Tejcsokoládé', brand: 'Milka', barcode: '5901234123457', energyKcal: 539 });

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.form.controls.name.value).toBe('Tejcsokoládé');
    expect(fixture.componentInstance.form.controls.brand.value).toBe('Milka');
    expect(fixture.componentInstance.form.controls.barcode.value).toBe('5901234123457');
    expect(fixture.componentInstance.form.controls.energyKcal.value).toBe(539);
  });

  it('syncBarcode(): does nothing when the barcode field is empty', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.syncBarcode();

    expect(openFoodFacts.lookup).not.toHaveBeenCalled();
  });

  it('syncBarcode(): shows a warning toast and leaves the form untouched when OFF has no hit', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.barcode.setValue('0000000000000');
    openFoodFacts.lookup.and.resolveTo(null);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    toastController.create.and.resolveTo(created as never);

    await fixture.componentInstance.syncBarcode();

    expect(toastController.create).toHaveBeenCalled();
    expect(alertController.create).not.toHaveBeenCalled();
  });

  it('syncBarcode(): skips the confirm dialog entirely when nothing would change', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.patchValue({ barcode: '5901234123457', name: 'Tej' });
    openFoodFacts.lookup.and.resolveTo({ name: 'Tej' });

    await fixture.componentInstance.syncBarcode();

    expect(alertController.create).not.toHaveBeenCalled();
  });

  it('syncBarcode(): confirming the diff dialog applies the OFF fields, letting the salt auto-calc react normally', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.patchValue({ barcode: '5901234123457', name: 'Tej' });
    openFoodFacts.lookup.and.resolveTo({ name: 'Friss tej', saltG: 0.1 });
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.syncBarcode();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const confirmButton = options.buttons.find((b) => b.role === 'confirm')!;
    confirmButton.handler!();

    expect(fixture.componentInstance.form.controls.name.value).toBe('Friss tej');
    expect(fixture.componentInstance.form.controls.saltG.value).toBe(0.1);
    expect(fixture.componentInstance.form.controls.sodiumG.value).toBe(0.04); // auto-calc reacted to the patched salt
  });

  it('save(): maps the quantity/duration controls into flat DTO fields', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(food());
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.patchValue({
      name: 'Tej',
      netAmount: { amount: 1, unit: 'l' },
      pieceDefinition: { amount: 0.1667, unit: 'cs' },
      shelfFridge: { amount: 5, unit: 'nap' },
    });

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Tej',
        netAmount: 1,
        netUnit: 'l',
        pieceAmount: 0.1667,
        pieceUnit: 'cs',
        shelfFridgeAmount: 5,
        shelfFridgeUnit: 'nap',
      }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/catalog');
  });

  it('save(): surfaces FoodDuplicateError as a translated form error instead of navigating away', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.patchValue({ name: 'Tej' });
    repository.save.and.rejectWith(new FoodDuplicateError('other-id'));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');

    await fixture.componentInstance.save();

    expect(fixture.componentInstance.duplicateError()).not.toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('save(): does not call the repository when the required name is missing', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('delete(): the confirmation handler removes the food via the repository', async () => {
    await createFixture('f1');
    repository.items.set([food()]);
    await fixture.componentInstance.ngOnInit();
    repository.remove.and.resolveTo();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('f1');
  });
});

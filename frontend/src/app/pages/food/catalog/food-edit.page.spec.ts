import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { FoodDuplicateError, FoodRepository } from '../../../core/data/food.repository';
import { FoodEditPage } from './food-edit.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

describe('FoodEditPage', () => {
  let fixture: ComponentFixture<FoodEditPage>;
  let repository: jasmine.SpyObj<Pick<FoodRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<Food[]>>;
  };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('FoodRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<Food[]>([]);

    await TestBed.configureTestingModule({
      imports: [FoodEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: FoodRepository, useValue: repository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
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

  it('save(): maps the quantity/duration controls into flat DTO fields', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(food());
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.patchValue({
      name: 'Tej',
      netAmount: { amount: 1, unit: 'l' },
      shelfFridge: { amount: 5, unit: 'nap' },
    });

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Tej', netAmount: 1, netUnit: 'l', shelfFridgeAmount: 5, shelfFridgeUnit: 'nap' }),
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

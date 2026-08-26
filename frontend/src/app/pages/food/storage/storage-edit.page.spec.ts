import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { StoredFood } from '../../../api/model/storedFood';
import { FoodRepository } from '../../../core/data/food.repository';
import { StoredFoodRepository } from '../../../core/data/stored-food.repository';
import { today } from '../../../shared/local-date';
import { StorageEditPage } from './storage-edit.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

function storedFood(overrides: Partial<StoredFood> = {}): StoredFood {
  return {
    id: 's1',
    foodId: 'f1',
    quantityAmount: 1,
    quantityUnit: 'l',
    storageLocation: StoredFood.StorageLocationEnum.Fridge,
    expiresOn: '2099-01-01',
    opened: false,
    deleted: false,
    ...overrides,
  };
}

describe('StorageEditPage', () => {
  let fixture: ComponentFixture<StorageEditPage>;
  let repository: jasmine.SpyObj<Pick<StoredFoodRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<StoredFood[]>>;
  };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('StoredFoodRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<StoredFood[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [StorageEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: StoredFoodRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StorageEditPage);
  }

  it('create mode: starts with no food selected', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.itemId()).toBeNull();
    expect(fixture.componentInstance.foodId()).toBeNull();
  });

  it('edit mode: patches the form and picks the food from the already-loaded repository item', async () => {
    await createFixture('s1');
    foodRepository.items.set([food()]);
    repository.items.set([storedFood({ quantityAmount: 2, quantityUnit: 'kg' })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.itemId()).toBe('s1');
    expect(fixture.componentInstance.foodId()).toBe('f1');
    expect(fixture.componentInstance.form.controls.quantity.value).toEqual({ amount: 2, unit: 'kg' });
  });

  it('selectFood(): picks the first allowed storage location and prefills expiry from the catalog duration', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.selectFood(food({ shelfFridgeAmount: 5, shelfFridgeUnit: 'nap' }));

    expect(fixture.componentInstance.foodId()).toBe('f1');
    expect(fixture.componentInstance.form.controls.storageLocation.value).toBe(StoredFood.StorageLocationEnum.Fridge);
    expect(fixture.componentInstance.form.controls.expiresOn.value > today()).toBeTrue();
  });

  it('changeFood(): clears the current selection so the picker reopens', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.selectFood(food());

    fixture.componentInstance.changeFood();

    expect(fixture.componentInstance.foodId()).toBeNull();
  });

  it('save(): builds a StoredFood draft from the form and navigates back to the storage list', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.selectFood(food());
    fixture.componentInstance.form.patchValue({ quantity: { amount: 2, unit: 'l' }, expiresOn: '2099-05-01' });
    repository.save.and.resolveTo(storedFood());
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({ foodId: 'f1', quantityAmount: 2, quantityUnit: 'l', expiresOn: '2099-05-01', opened: false }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/storage');
  });

  it('save(): "already opened" on create recomputes the expiry via the after-opening duration', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.selectFood(food({ shelfAfterOpeningAmount: 3, shelfAfterOpeningUnit: 'nap' }));
    fixture.componentInstance.form.patchValue({ quantity: { amount: 1, unit: 'l' }, expiresOn: '2099-05-01' });
    fixture.componentInstance.openOnCreate.set(true);
    repository.save.and.resolveTo(storedFood());
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    const saved = repository.save.calls.mostRecent().args[0] as StoredFood;
    expect(saved.opened).toBeTrue();
    expect(saved.openedAt).not.toBeNull();
    expect(saved.expiresOn < '2099-05-01').toBeTrue();
  });

  it('save(): does nothing when no food has been picked yet', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('delete(): the confirmation handler removes the item via the repository', async () => {
    await createFixture('s1');
    foodRepository.items.set([food()]);
    repository.items.set([storedFood()]);
    await fixture.componentInstance.ngOnInit();
    repository.remove.and.resolveTo();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('s1');
  });
});

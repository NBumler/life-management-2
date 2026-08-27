import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { StoredFood } from '../../../api/model/storedFood';
import { FoodRepository } from '../../../core/data/food.repository';
import { StoredFoodRepository } from '../../../core/data/stored-food.repository';
import { today } from '../../../shared/local-date';
import { StorageListPage } from './storage-list.page';

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

describe('StorageListPage', () => {
  let fixture: ComponentFixture<StorageListPage>;
  let repository: jasmine.SpyObj<Pick<StoredFoodRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<StoredFood[]>>;
  };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('StoredFoodRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<StoredFood[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [StorageListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: StoredFoodRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StorageListPage);
  });

  it('rows(): joins storage items with their catalog food and drops rows whose food is unknown', () => {
    foodRepository.items.set([food()]);
    repository.items.set([storedFood(), storedFood({ id: 's2', foodId: 'missing' })]);

    expect(fixture.componentInstance.rows().map((row) => row.item.id)).toEqual(['s1']);
  });

  it('rows(): location filter narrows to the selected storage location', () => {
    foodRepository.items.set([food()]);
    repository.items.set([
      storedFood({ id: 's1', storageLocation: StoredFood.StorageLocationEnum.Fridge }),
      storedFood({ id: 's2', storageLocation: StoredFood.StorageLocationEnum.Freezer }),
    ]);

    fixture.componentInstance.locationFilter.set(StoredFood.StorageLocationEnum.Freezer);

    expect(fixture.componentInstance.rows().map((row) => row.item.id)).toEqual(['s2']);
  });

  it('rows(): search matches on the food name or brand', () => {
    foodRepository.items.set([food({ id: 'f1', name: 'Tej' }), food({ id: 'f2', name: 'Sajt', brand: 'Milkiland' })]);
    repository.items.set([storedFood({ id: 's1', foodId: 'f1' }), storedFood({ id: 's2', foodId: 'f2' })]);

    fixture.componentInstance.query.set('milkiland');

    expect(fixture.componentInstance.rows().map((row) => row.item.id)).toEqual(['s2']);
  });

  it('isSpoiled(): true only once the expiry date is in the past', () => {
    expect(fixture.componentInstance.isSpoiled(storedFood({ expiresOn: '2000-01-01' }))).toBeTrue();
    expect(fixture.componentInstance.isSpoiled(storedFood({ expiresOn: today() }))).toBeFalse();
    expect(fixture.componentInstance.isSpoiled(storedFood({ expiresOn: '2099-01-01' }))).toBeFalse();
  });

  it('open(): recomputes expiry from the catalog after-opening duration and saves as opened', async () => {
    const openFood = food({ shelfAfterOpeningAmount: 3, shelfAfterOpeningUnit: 'nap' });
    repository.save.and.resolveTo(storedFood());

    await fixture.componentInstance.open({ item: storedFood({ expiresOn: '2099-01-01' }), food: openFood });

    const saved = repository.save.calls.mostRecent().args[0] as StoredFood;
    expect(saved.opened).toBeTrue();
    expect(saved.openedAt).not.toBeNull();
    expect(saved.expiresOn < '2099-01-01').toBeTrue();
  });

  it('edit(): navigates to the storage edit route for the item', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.edit({ item: storedFood({ id: 's2' }), food: food() });

    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/storage', 's2']);
  });

  it('delete(): the confirmation handler removes the item via the repository', async () => {
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete({ item: storedFood(), food: food() });
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('s1');
  });

  it('switchSection(): navigating to "catalog" goes back to the food catalog', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance.switchSection('catalog');

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/catalog');
  });

  it('switchSection(): navigating to "stats" goes to the Kaja statisztika page', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance.switchSection('stats');

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/stats');
  });
});

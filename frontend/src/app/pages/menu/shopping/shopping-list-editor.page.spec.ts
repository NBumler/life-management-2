import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { ShoppingList } from '../../../api/model/shoppingList';
import { FoodRepository } from '../../../core/data/food.repository';
import { ShoppingListRepository } from '../../../core/data/shopping-list.repository';
import { ShoppingListEditorPage } from './shopping-list-editor.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

function shoppingList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'sl1', name: 'Heti bevásárlás', deleted: false, items: [], ...overrides };
}

describe('ShoppingListEditorPage', () => {
  let fixture: ComponentFixture<ShoppingListEditorPage>;
  let repository: jasmine.SpyObj<Pick<ShoppingListRepository, 'load' | 'save' | 'remove'>> & { items: ReturnType<typeof signal<ShoppingList[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('ShoppingListRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<ShoppingList[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [ShoppingListEditorPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: ShoppingListRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingListEditorPage);
  }

  it('create mode: starts with no items and no name', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.listId()).toBeNull();
    expect(fixture.componentInstance.items()).toEqual([]);
    expect(fixture.componentInstance.form.controls.name.value).toBeNull();
  });

  it('edit mode: builds one row per live item (FOOD/NON_FOOD), sorted and excluding tombstones', async () => {
    await createFixture('sl1');
    repository.items.set([
      shoppingList({
        items: [
          { id: 'i2', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Mosószer', note: 'Lidl', checked: false, sortOrder: 1, deleted: false },
          { id: 'i1', shoppingListId: 'sl1', type: 'FOOD', foodId: 'f1', quantityAmount: 2, quantityUnit: 'db', checked: true, sortOrder: 0, deleted: false },
          { id: 'i3', shoppingListId: 'sl1', type: 'NON_FOOD', name: 'Törölve', checked: false, sortOrder: 2, deleted: true },
        ],
      }),
    ]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.listId()).toBe('sl1');
    expect(fixture.componentInstance.items().map((row) => row.id)).toEqual(['i1', 'i2']);
  });

  it('edit mode: a stale id no longer in the repository redirects back to the list overview', async () => {
    await createFixture('gone');
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping');
  });

  it('food picker: adds a row per picked food with an empty quantity and unchecked', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'f1' })]);
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.togglePicker();
    fixture.componentInstance.togglePick('f1', []);
    fixture.componentInstance.confirmPicked();

    const [row] = fixture.componentInstance.items();
    expect(row.type).toBe('FOOD');
    expect(row.type === 'FOOD' && row.quantity()).toEqual({ amount: null, unit: null });
    expect(row.checked()).toBeFalse();
  });

  it('addNonFoodRow(): appends a blank NON_FOOD row', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.addNonFoodRow();

    const [row] = fixture.componentInstance.items();
    expect(row.type).toBe('NON_FOOD');
    expect(row.type === 'NON_FOOD' && row.name()).toBe('');
  });

  it('removeItem(): drops the row', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.addNonFoodRow();
    const row = fixture.componentInstance.items()[0];

    fixture.componentInstance.removeItem(row);

    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('save(): allows an empty list (unlike Meal — documentation/Subfeatures/Bevásárlólista írás.md "Üres aktív lista")', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(shoppingList({ id: 'new-1' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(jasmine.objectContaining({ items: [] }));
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping');
  });

  it('save(): blocked when a FOOD item has no quantity yet', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'f1' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.togglePick('f1', []);
    fixture.componentInstance.confirmPicked();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance.showItemErrors()).toBeTrue();
  });

  it('save(): blocked when a NON_FOOD item is missing its required name', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.addNonFoodRow();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('save(): does NOT require a quantity on a NON_FOOD item, only its name', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.addNonFoodRow();
    const [row] = fixture.componentInstance.items();
    (row as { name: { set: (v: string) => void } }).name.set('Mosószer');
    repository.save.and.resolveTo(shoppingList({ id: 'new-1' }));
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalled();
  });

  it('save(): builds a ShoppingListDraft from the form and item rows, then navigates back to the overview', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'f1' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.togglePick('f1', []);
    fixture.componentInstance.confirmPicked();
    const [row] = fixture.componentInstance.items();
    (row as { quantity: { set: (v: unknown) => void } }).quantity.set({ amount: 2, unit: 'db' });
    fixture.componentInstance.form.controls.name.setValue('Heti bevásárlás');
    repository.save.and.resolveTo(shoppingList({ id: 'new-1' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Heti bevásárlás',
        items: [{ id: jasmine.any(String), type: 'FOOD', foodId: 'f1', quantityAmount: 2, quantityUnit: 'db', checked: false, sortOrder: 0 }],
      }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/menu/shopping');
  });

  it('delete(): the confirmation handler removes the list via the repository', async () => {
    await createFixture('sl1');
    repository.items.set([shoppingList()]);
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

    expect(repository.remove).toHaveBeenCalledWith('sl1');
  });
});

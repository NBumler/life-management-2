import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Meal } from '../../../api/model/meal';
import { Recipe } from '../../../api/model/recipe';
import { FoodRepository } from '../../../core/data/food.repository';
import { MealRepository } from '../../../core/data/meal.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { deviceTimeZoneId } from '../../../shared/timezone';
import { MealEditPage } from './meal-edit.page';

function customMealItem(overrides: Partial<Meal['items'][number]> = {}): Meal['items'][number] {
  return { id: 'ci1', mealId: 'm1', type: 'CUSTOM', displayName: 'Torta', caloriesKcal: 450, proteinG: null, carbsG: null, fatG: null, priceHuf: null, servings: 1, sortOrder: 0, deleted: false, ...overrides };
}

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tej', deleted: false, ...overrides };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: 'r1', name: 'Rántotta', deleted: false, ingredients: [], ...overrides };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return { id: 'm1', eatenAt: '2026-08-26T10:00:00.000Z', timeZoneId: 'Europe/Budapest', note: null, deleted: false, items: [], ...overrides };
}

describe('MealEditPage', () => {
  let fixture: ComponentFixture<MealEditPage>;
  let repository: jasmine.SpyObj<Pick<MealRepository, 'load' | 'save' | 'remove'>> & { items: ReturnType<typeof signal<Meal[]>> };
  let recipeRepository: jasmine.SpyObj<Pick<RecipeRepository, 'load'>> & { items: ReturnType<typeof signal<Recipe[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('MealRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<Meal[]>([]);
    recipeRepository = jasmine.createSpyObj('RecipeRepository', ['load']) as never;
    recipeRepository.load.and.resolveTo();
    recipeRepository.items = signal<Recipe[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [MealEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: MealRepository, useValue: repository },
        { provide: RecipeRepository, useValue: recipeRepository },
        { provide: FoodRepository, useValue: foodRepository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MealEditPage);
  }

  it('create mode: starts with no items and a form defaulted to now', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.mealId()).toBeNull();
    expect(fixture.componentInstance.items()).toEqual([]);
    expect(fixture.componentInstance.form.controls.date.value.length).toBe(10);
  });

  it('edit mode: builds one row per live item (RECIPE/FOOD/CUSTOM), sorted and excluding tombstones', async () => {
    await createFixture('m1');
    repository.items.set([
      meal({
        note: 'Ebéd',
        items: [
          { id: 'i2', mealId: 'm1', type: 'FOOD', foodId: 'f1', quantityAmount: 200, quantityUnit: 'g', servings: 1, sortOrder: 1, deleted: false },
          { id: 'i1', mealId: 'm1', type: 'RECIPE', recipeId: 'r1', servings: 2, sortOrder: 0, deleted: false },
          {
            id: 'i3',
            mealId: 'm1',
            type: 'CUSTOM',
            displayName: 'Torta',
            caloriesKcal: 450,
            proteinG: null,
            carbsG: null,
            fatG: null,
            priceHuf: null,
            servings: 1,
            sortOrder: 2,
            deleted: true,
          },
        ],
      }),
    ]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.mealId()).toBe('m1');
    expect(fixture.componentInstance.form.controls.note.value).toBe('Ebéd');
    expect(fixture.componentInstance.items().map((row) => row.id)).toEqual(['i1', 'i2']);
  });

  it('edit mode: a stale id no longer in the repository redirects back to the dashboard', async () => {
    await createFixture('gone');
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/meal');
  });

  it('recipe picker: toggling, picking, and confirming adds one row per picked recipe with servings defaulted to 1', async () => {
    await createFixture('new');
    recipeRepository.items.set([recipe({ id: 'r1' }), recipe({ id: 'r2', name: 'Leves' })]);
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.togglePicker('recipe');
    fixture.componentInstance.togglePick('r1', []);
    fixture.componentInstance.togglePick('r2', []);
    fixture.componentInstance.confirmPicked();

    const rows = fixture.componentInstance.items();
    expect(rows.length).toBe(2);
    expect(rows.every((row) => row.type === 'RECIPE' && row.servings() === 1)).toBeTrue();
    expect(fixture.componentInstance.activePicker()).toBe('none');
  });

  it('food picker: adds a row per picked food with an empty quantity, and auto-opens the editor on it', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'f1' })]);
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.togglePicker('food');
    fixture.componentInstance.togglePick('f1', []);
    fixture.componentInstance.confirmPicked();

    const [row] = fixture.componentInstance.items();
    expect(row.type).toBe('FOOD');
    expect(row.type === 'FOOD' && row.quantity()).toEqual({ amount: null, unit: null });
    expect(fixture.componentInstance.editorRow()).toBe(row);
  });

  it('recipe picker: does not auto-open the editor (a RECIPE row is born valid)', async () => {
    await createFixture('new');
    recipeRepository.items.set([recipe({ id: 'r1' })]);
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.togglePicker('recipe');
    fixture.componentInstance.togglePick('r1', []);
    fixture.componentInstance.confirmPicked();

    expect(fixture.componentInstance.editorRow()).toBeNull();
  });

  it('closeEditor(): clears the open row', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.addCustomRow();
    expect(fixture.componentInstance.editorRow()).not.toBeNull();

    fixture.componentInstance.closeEditor();

    expect(fixture.componentInstance.editorRow()).toBeNull();
  });

  it('addCustomRow(): appends a blank CUSTOM row and opens the editor on it', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.addCustomRow();

    const [row] = fixture.componentInstance.items();
    expect(row.type).toBe('CUSTOM');
    expect(row.type === 'CUSTOM' && row.displayName()).toBe('');
    expect(fixture.componentInstance.editorRow()).toBe(row);
  });

  it('removeItem(): drops the row', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.addCustomRow();
    const row = fixture.componentInstance.items()[0];

    fixture.componentInstance.removeItem(row);

    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('save(): blocked when there are zero items', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance.showItemErrors()).toBeTrue();
  });

  it('save(): blocked when a FOOD item has no quantity yet', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'f1' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker('food');
    fixture.componentInstance.togglePick('f1', []);
    fixture.componentInstance.confirmPicked();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('save(): blocked when a CUSTOM item is missing its required name/calories', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.addCustomRow();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('save(): builds a MealDraft from the form and item rows, then navigates back to the dashboard', async () => {
    await createFixture('new');
    recipeRepository.items.set([recipe({ id: 'r1' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker('recipe');
    fixture.componentInstance.togglePick('r1', []);
    fixture.componentInstance.confirmPicked();
    repository.save.and.resolveTo(meal({ id: 'new-1' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({
        items: [{ id: jasmine.any(String), type: 'RECIPE', recipeId: 'r1', servings: 1, sortOrder: 0 }],
      }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/meal');
  });

  it('save(): an edit that leaves date/time untouched preserves the meal\'s original eatenAt + timeZoneId', async () => {
    await createFixture('m1');
    repository.items.set([meal({ id: 'm1', eatenAt: '2026-08-26T10:00:00.000Z', timeZoneId: 'Pacific/Auckland', items: [customMealItem()] })]);
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(meal({ id: 'm1' }));
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({ eatenAt: '2026-08-26T10:00:00.000Z', timeZoneId: 'Pacific/Auckland' }),
    );
  });

  it('save(): changing the date re-stamps eatenAt and the timeZoneId to this device', async () => {
    await createFixture('m1');
    repository.items.set([meal({ id: 'm1', eatenAt: '2026-08-26T10:00:00.000Z', timeZoneId: 'Pacific/Auckland', items: [customMealItem()] })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.date.setValue('2026-08-20');
    repository.save.and.resolveTo(meal({ id: 'm1' }));
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    const draft = repository.save.calls.mostRecent().args[0];
    expect(draft.eatenAt).not.toBe('2026-08-26T10:00:00.000Z');
    expect(draft.timeZoneId).toBe(deviceTimeZoneId());
  });

  it('delete(): the confirmation handler removes the meal via the repository', async () => {
    await createFixture('m1');
    repository.items.set([meal()]);
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

    expect(repository.remove).toHaveBeenCalledWith('m1');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { FoodRepository } from '../../../core/data/food.repository';
import { RecipeDuplicateError, RecipeRepository } from '../../../core/data/recipe.repository';
import { RecipeEditPage } from './recipe-edit.page';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'f1', name: 'Tojás', deleted: false, ...overrides };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return { id: 'r1', name: 'Rántotta', deleted: false, ingredients: [], ...overrides };
}

describe('RecipeEditPage', () => {
  let fixture: ComponentFixture<RecipeEditPage>;
  let repository: jasmine.SpyObj<Pick<RecipeRepository, 'load' | 'save' | 'remove'>> & { items: ReturnType<typeof signal<Recipe[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('RecipeRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<Recipe[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [RecipeEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: RecipeRepository, useValue: repository },
        { provide: FoodRepository, useValue: foodRepository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeEditPage);
  }

  it('create mode: starts with no ingredients and an empty form', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.recipeId()).toBeNull();
    expect(fixture.componentInstance.ingredients()).toEqual([]);
  });

  it('edit mode: patches the form and builds one row per live ingredient, sorted and excluding tombstones', async () => {
    await createFixture('r1');
    foodRepository.items.set([food()]);
    repository.items.set([
      recipe({
        note: 'Reggelire',
        ingredients: [
          { id: 'i2', recipeId: 'r1', foodId: 'f1', quantityAmount: 1, quantityUnit: 'db', sortOrder: 1, deleted: false },
          { id: 'i1', recipeId: 'r1', foodId: 'f1', quantityAmount: 3, quantityUnit: 'db', sortOrder: 0, deleted: false },
          { id: 'i3', recipeId: 'r1', foodId: 'f1', quantityAmount: 2, quantityUnit: 'db', sortOrder: 2, deleted: true },
        ],
      }),
    ]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.recipeId()).toBe('r1');
    expect(fixture.componentInstance.form.controls.note.value).toBe('Reggelire');
    expect(fixture.componentInstance.ingredients().map((row) => row.id)).toEqual(['i1', 'i2']);
    expect(fixture.componentInstance.ingredients()[0].quantity()).toEqual({ amount: 3, unit: 'db' });
  });

  it('edit mode: a stale id no longer in the repository redirects back to the list', async () => {
    await createFixture('gone');
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/recipe');
  });

  it('picker: toggling, picking, and confirming adds one row per picked food with an empty quantity', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'egg' }), food({ id: 'milk', name: 'Tej' })]);
    await fixture.componentInstance.ngOnInit();

    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'egg' }));
    fixture.componentInstance.toggleFoodPick(food({ id: 'milk', name: 'Tej' }));
    fixture.componentInstance.confirmPicked();

    expect(fixture.componentInstance.ingredients().map((row) => row.foodId).sort()).toEqual(['egg', 'milk']);
    expect(fixture.componentInstance.ingredients()[0].quantity()).toEqual({ amount: null, unit: null });
    expect(fixture.componentInstance.pickerOpen()).toBeFalse();
  });

  it('picker: an already-added food cannot be toggled again', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'egg' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'egg' }));
    fixture.componentInstance.confirmPicked();

    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'egg' }));

    expect(fixture.componentInstance.isPicked(food({ id: 'egg' }))).toBeFalse();
  });

  it('onIngredientsReordered(): applies the ReorderListComponent output to the ingredient rows', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'a' }), food({ id: 'b' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'a' }));
    fixture.componentInstance.confirmPicked();
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'b' }));
    fixture.componentInstance.confirmPicked();
    const [first, second] = fixture.componentInstance.ingredients();

    fixture.componentInstance.onIngredientsReordered([second, first]);

    expect(fixture.componentInstance.ingredients().map((row) => row.foodId)).toEqual(['b', 'a']);
  });

  it('removeIngredient(): drops the row', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'a' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'a' }));
    fixture.componentInstance.confirmPicked();
    const row = fixture.componentInstance.ingredients()[0];

    fixture.componentInstance.removeIngredient(row);

    expect(fixture.componentInstance.ingredients()).toEqual([]);
  });

  it('save(): blocked and flags the row when an ingredient has no quantity yet', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'a' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.name.setValue('Teszt');
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'a' }));
    fixture.componentInstance.confirmPicked();

    await fixture.componentInstance.save();

    expect(repository.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance.showIngredientErrors()).toBeTrue();
  });

  it('save(): builds a RecipeDraft from the form and ingredient rows, then navigates back to the recipe list', async () => {
    await createFixture('new');
    foodRepository.items.set([food({ id: 'a' })]);
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.name.setValue('Rántotta');
    fixture.componentInstance.togglePicker();
    fixture.componentInstance.toggleFoodPick(food({ id: 'a' }));
    fixture.componentInstance.confirmPicked();
    fixture.componentInstance.ingredients()[0].quantityControl.setValue({ amount: 3, unit: 'db' });
    repository.save.and.resolveTo(recipe({ id: 'new-1' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Rántotta',
        ingredients: [{ id: jasmine.any(String), foodId: 'a', quantityAmount: 3, quantityUnit: 'db', sortOrder: 0 }],
      }),
    );
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/food/recipe');
  });

  it('save(): shows a translated message and does not navigate on a duplicate conflict', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.controls.name.setValue('Rántotta');
    repository.save.and.rejectWith(new RecipeDuplicateError('conflict-id'));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(fixture.componentInstance.duplicateError()).toBe('FOOD.RECIPE.DUPLICATE_ERROR');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('delete(): the confirmation handler removes the recipe via the repository', async () => {
    await createFixture('r1');
    repository.items.set([recipe()]);
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

    expect(repository.remove).toHaveBeenCalledWith('r1');
  });
});

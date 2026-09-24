import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { MealItemEditorComponent } from './meal-item-editor.component';
import { RecipeItemRow, createCustomRow, createFoodRow, createRecipeRow, restoreRow, snapshotRow, toSaveItem } from './meal-item-row';

describe('MealItemEditorComponent', () => {
  let fixture: ComponentFixture<MealItemEditorComponent>;
  let component: MealItemEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealItemEditorComponent],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(MealItemEditorComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    component.row = createFoodRow('f1');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('servings stepper', () => {
    it('adjustServings(): steps the multiplier and never goes to zero or below', () => {
      component.row = createFoodRow('f1');

      component.adjustServings(0.5);
      expect(component.row.servings()).toBe(1.5);

      component.adjustServings(-0.5);
      component.adjustServings(-0.5);
      expect(component.row.servings()).toBe(0.5);

      component.adjustServings(-0.5); // would hit 0 — ignored
      expect(component.row.servings()).toBe(0.5);
    });

    it('onServingsInput(): accepts a positive decimal, ignores empty / non-positive / NaN', () => {
      component.row = createFoodRow('f1');

      component.onServingsInput('0.8');
      expect(component.row.servings()).toBe(0.8);

      component.onServingsInput('0');
      component.onServingsInput('-2');
      component.onServingsInput('');
      component.onServingsInput('abc');
      expect(component.row.servings()).toBe(0.8);
    });
  });

  describe('parseOptionalNumber()', () => {
    it('maps blank / unparseable to null and otherwise parses', () => {
      component.row = createCustomRow();
      expect(component.parseOptionalNumber('')).toBeNull();
      expect(component.parseOptionalNumber('not a number')).toBeNull();
      expect(component.parseOptionalNumber('12.5')).toBe(12.5);
      expect(component.parseOptionalNumber('0')).toBe(0);
    });

    it('B-2: rejects a negative value (no negative kcal / macro / price)', () => {
      component.row = createCustomRow();
      expect(component.parseOptionalNumber('-50')).toBeNull();
      expect(component.parseOptionalNumber('-0.1')).toBeNull();
    });
  });

  describe('valid()', () => {
    it('tracks the row completeness as its signals change', () => {
      const row = createCustomRow();
      component.row = row;
      expect(component.valid()).toBeFalse();

      row.displayName.set('Palacsinta');
      row.caloriesKcal.set(300);
      expect(component.valid()).toBeTrue();
    });
  });

  describe('effective()', () => {
    it('recomputes the preview when the servings multiplier changes (CUSTOM row)', () => {
      const row = createCustomRow();
      row.displayName.set('Müzli');
      row.caloriesKcal.set(200);
      component.row = row;

      expect(component.effective().energyKcal).toBe(200);

      row.servings.set(2);
      expect(component.effective().energyKcal).toBe(400);
    });
  });

  it('emits done / cancelled', () => {
    component.row = createFoodRow('f1');
    const doneSpy = jasmine.createSpy('done');
    const cancelledSpy = jasmine.createSpy('cancelled');
    component.done.subscribe(doneSpy);
    component.cancelled.subscribe(cancelledSpy);

    component.done.emit();
    component.cancelled.emit();

    expect(doneSpy).toHaveBeenCalled();
    expect(cancelledSpy).toHaveBeenCalled();
  });

  describe('recipe ingredient overrides (backlog/121)', () => {
    const recipe = {
      id: 'r1',
      name: 'Túrós tészta',
      deleted: false,
      ingredients: [
        { id: 'i1', recipeId: 'r1', foodId: 'turo', quantityAmount: 500, quantityUnit: 'g', sortOrder: 0, deleted: false },
        { id: 'i2', recipeId: 'r1', foodId: 'teszta', quantityAmount: 250, quantityUnit: 'g', sortOrder: 1, deleted: false },
      ],
    } as unknown as Recipe;

    beforeEach(() => {
      component.row = createRecipeRow('r1');
      component.recipes = [recipe];
      component.foods = [{ id: 'turo', name: 'Túró', deleted: false } as Food, { id: 'teszta', name: 'Tészta', deleted: false } as Food];
    });

    function recipeRow(): RecipeItemRow {
      return component.row as RecipeItemRow;
    }

    it('lists the recipe ingredients in a collapsible section, closed by default', () => {
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelectorAll('.ingredient').length).toBe(0);

      (host.querySelector('.ingredients__toggle') as HTMLElement).click();
      fixture.detectChanges();
      expect(host.querySelectorAll('.ingredient').length).toBe(2);
      expect(host.querySelectorAll('.ingredient app-quantity-input').length).toBe(2);
    });

    it('a typed quantity becomes an override (0 = left out); typing the recipe value back removes it', () => {
      component.setIngredientQuantity('i1', { amount: 400, unit: 'g' });
      component.setIngredientQuantity('i2', { amount: 0, unit: 'g' });
      expect(recipeRow().overrides()).toEqual([
        { recipeIngredientId: 'i1', foodId: 'turo', quantityAmount: 400, quantityUnit: 'g' },
        { recipeIngredientId: 'i2', foodId: 'teszta', quantityAmount: 0, quantityUnit: 'g' },
      ]);
      expect(component.diverted()).toBeTrue();

      component.setIngredientQuantity('i1', { amount: 500, unit: 'g' });
      component.setIngredientQuantity('i2', { amount: null, unit: null }); // unparseable → ignored
      expect(recipeRow().overrides().map((o) => o.recipeIngredientId)).toEqual(['i2']);
    });

    it('reset drops the override; the recipe itself is never touched', () => {
      component.setIngredientQuantity('i1', { amount: 400, unit: 'g' });
      component.resetIngredient(component.ingredients()[0]);
      expect(recipeRow().overrides()).toEqual([]);
      expect(recipe.ingredients[0].quantityAmount).toBe(500);
    });

    it('toSaveItem carries the overrides, and snapshot / restore brings them back on cancel', () => {
      const snapshot = snapshotRow(component.row);
      component.setIngredientQuantity('i1', { amount: 400, unit: 'g' });
      expect(toSaveItem(component.row, 0)).toEqual(jasmine.objectContaining({ ingredientOverrides: recipeRow().overrides() }));

      restoreRow(component.row, snapshot);
      expect(recipeRow().overrides()).toEqual([]);
    });
  });
});

import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  buildRowFromDto,
  createCustomRow,
  createFoodRow,
  createRecipeRow,
  isRowComplete,
  rowNeedsInput,
  toSaveItem,
} from './meal-item-row';

describe('meal-item-row', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  describe('factories', () => {
    it('createRecipeRow(): a fresh RECIPE row is born valid with servings = 1', () => {
      const row = createRecipeRow('r1');
      expect(row.type).toBe('RECIPE');
      expect(row.recipeId).toBe('r1');
      expect(row.servings()).toBe(1);
      expect(row.id.length).toBeGreaterThan(0);
      expect(isRowComplete(row)).toBeTrue();
      expect(rowNeedsInput(row)).toBeFalse();
    });

    it('createFoodRow(): a fresh FOOD row has no quantity yet and needs input', () => {
      const row = createFoodRow('f1', injector);
      expect(row.type).toBe('FOOD');
      expect(row.quantity()).toEqual({ amount: null, unit: null });
      expect(row.quantityControl.getRawValue()).toEqual({ amount: null, unit: null });
      expect(isRowComplete(row)).toBeFalse();
      expect(rowNeedsInput(row)).toBeTrue();
    });

    it('createCustomRow(): a fresh CUSTOM row is blank and needs input', () => {
      const row = createCustomRow();
      expect(row.type).toBe('CUSTOM');
      expect(row.displayName()).toBe('');
      expect(row.caloriesKcal()).toBeNull();
      expect(isRowComplete(row)).toBeFalse();
      expect(rowNeedsInput(row)).toBeTrue();
    });
  });

  describe('isRowComplete()', () => {
    it('FOOD is complete once its quantity control holds an amount and servings stays positive', () => {
      const row = createFoodRow('f1', injector);
      row.quantityControl.setValue({ amount: 120, unit: 'g' });
      expect(row.quantity()).toEqual({ amount: 120, unit: 'g' });
      expect(isRowComplete(row)).toBeTrue();

      row.servings.set(0);
      expect(isRowComplete(row)).toBeFalse();
    });

    it('CUSTOM needs both a non-blank name and calories', () => {
      const row = createCustomRow();
      row.displayName.set('Torta');
      expect(isRowComplete(row)).toBeFalse();

      row.caloriesKcal.set(450);
      expect(isRowComplete(row)).toBeTrue();

      row.displayName.set('   ');
      expect(isRowComplete(row)).toBeFalse();
    });

    it('RECIPE is complete unless servings drops to zero', () => {
      const row = createRecipeRow('r1');
      expect(isRowComplete(row)).toBeTrue();
      row.servings.set(0);
      expect(isRowComplete(row)).toBeFalse();
    });
  });

  describe('rowNeedsInput()', () => {
    it('stops asking once the mandatory fields are filled', () => {
      const food = createFoodRow('f1', injector);
      food.quantityControl.setValue({ amount: 1, unit: 'db' });
      expect(rowNeedsInput(food)).toBeFalse();

      const custom = createCustomRow();
      custom.displayName.set('Alma');
      custom.caloriesKcal.set(52);
      expect(rowNeedsInput(custom)).toBeFalse();
    });
  });

  describe('toSaveItem()', () => {
    it('projects a FOOD row, defaulting a still-empty quantity to 0 g', () => {
      const row = createFoodRow('f1', injector);
      expect(toSaveItem(row, 3)).toEqual({
        id: row.id,
        type: 'FOOD',
        foodId: 'f1',
        quantityAmount: 0,
        quantityUnit: 'g',
        servings: 1,
        sortOrder: 3,
      });

      row.quantityControl.setValue({ amount: 2, unit: 'dl' });
      expect(toSaveItem(row, 0)).toEqual(jasmine.objectContaining({ quantityAmount: 2, quantityUnit: 'dl' }));
    });

    it('projects a CUSTOM row, coercing a null calorie value to 0 and keeping the rest nullable', () => {
      const row = createCustomRow();
      row.displayName.set('Sajt');
      expect(toSaveItem(row, 1)).toEqual({
        id: row.id,
        type: 'CUSTOM',
        displayName: 'Sajt',
        caloriesKcal: 0,
        proteinG: null,
        carbsG: null,
        fatG: null,
        priceHuf: null,
        servings: 1,
        sortOrder: 1,
      });
    });
  });

  describe('buildRowFromDto()', () => {
    it('round-trips a FOOD item into a control + mirrored signal', () => {
      const row = buildRowFromDto({ id: 'i1', type: 'FOOD', foodId: 'f9', quantityAmount: 50, quantityUnit: 'g', servings: 2 }, injector);
      expect(row.type).toBe('FOOD');
      expect(row.type === 'FOOD' && row.quantity()).toEqual({ amount: 50, unit: 'g' });
      expect(row.type === 'FOOD' && row.quantityControl.getRawValue()).toEqual({ amount: 50, unit: 'g' });
      expect(row.servings()).toBe(2);
    });

    it('round-trips a CUSTOM item, preserving explicit nulls', () => {
      const row = buildRowFromDto(
        {
          id: 'i2',
          type: 'CUSTOM',
          displayName: 'Keksz',
          caloriesKcal: 200,
          proteinG: null,
          carbsG: 30,
          fatG: null,
          priceHuf: null,
          servings: 1,
        },
        injector,
      );
      expect(row.type === 'CUSTOM' && row.caloriesKcal()).toBe(200);
      expect(row.type === 'CUSTOM' && row.carbsG()).toBe(30);
      expect(row.type === 'CUSTOM' && row.proteinG()).toBeNull();
    });
  });
});

import { Food } from '../../../api/model/food';
import { Recipe } from '../../../api/model/recipe';
import { MealItemSaveItem } from '../../../core/storage/storage-backend';
import { computeMealItemEffective } from './meal-item-summary';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'food-1', name: 'Tej', deleted: false, energyKcal: 60, proteinG: 3, carbsG: 5, fatG: 3, priceHuf: 500, netAmount: 1000, netUnit: 'ml', ...overrides };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    name: 'Rántotta',
    deleted: false,
    ingredients: [{ id: 'ing-1', recipeId: 'recipe-1', foodId: 'food-1', quantityAmount: 200, quantityUnit: 'ml', sortOrder: 0, deleted: false }],
    ...overrides,
  };
}

describe('computeMealItemEffective', () => {
  it('scales a RECIPE item by servings, using the recipe live ingredient sum', () => {
    const item: MealItemSaveItem = { id: 'item-1', type: 'RECIPE', recipeId: 'recipe-1', servings: 2, sortOrder: 0 };
    const result = computeMealItemEffective(item, [recipe()], [food()]);

    // 200ml of Tej: base=200, price=(200/1000)*500=100, kcal=(200/100)*60=120 — x2 servings.
    expect(result.priceHuf).toBeCloseTo(200);
    expect(result.energyKcal).toBeCloseTo(240);
    expect(result.incomplete).toBeFalse();
  });

  it('flags incomplete when the referenced recipe no longer resolves', () => {
    const item: MealItemSaveItem = { id: 'item-1', type: 'RECIPE', recipeId: 'missing', servings: 1, sortOrder: 0 };
    const result = computeMealItemEffective(item, [], []);
    expect(result.incomplete).toBeTrue();
    expect(result.energyKcal).toBe(0);
  });

  it('scales a FOOD item by servings, using the effective quantity', () => {
    const item: MealItemSaveItem = { id: 'item-1', type: 'FOOD', foodId: 'food-1', quantityAmount: 500, quantityUnit: 'ml', servings: 2, sortOrder: 0 };
    const result = computeMealItemEffective(item, [], [food()]);

    // 500ml x2 servings = 1000ml effective; kcal=(1000/100)*60=600, price=(1000/1000)*500=500.
    expect(result.energyKcal).toBeCloseTo(600);
    expect(result.priceHuf).toBeCloseTo(500);
    expect(result.incomplete).toBeFalse();
  });

  it('flags incomplete when the referenced food no longer resolves', () => {
    const item: MealItemSaveItem = { id: 'item-1', type: 'FOOD', foodId: 'missing', quantityAmount: 100, quantityUnit: 'g', servings: 1, sortOrder: 0 };
    const result = computeMealItemEffective(item, [], []);
    expect(result.incomplete).toBeTrue();
  });

  it('scales a CUSTOM item by servings, treating missing optional fields as 0', () => {
    const item: MealItemSaveItem = {
      id: 'item-1',
      type: 'CUSTOM',
      displayName: 'Vendégségi torta',
      caloriesKcal: 450,
      proteinG: null,
      carbsG: null,
      fatG: null,
      priceHuf: null,
      servings: 2,
      sortOrder: 0,
    };
    const result = computeMealItemEffective(item, [], []);

    expect(result.energyKcal).toBe(900);
    expect(result.proteinG).toBe(0);
    expect(result.priceHuf).toBe(0);
    expect(result.incomplete).toBeFalse();
  });
});

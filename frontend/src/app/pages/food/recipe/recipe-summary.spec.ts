import { Food } from '../../../api/model/food';
import { computeRecipeSummary, formatIngredientQuantity } from './recipe-summary';

function food(overrides: Partial<Food> = {}): Food {
  return { id: 'food-1', name: 'Teszt', deleted: false, ...overrides };
}

describe('recipe-summary', () => {
  describe('computeRecipeSummary', () => {
    it('sums a weight-unit ingredient scaled from its per-100g nutrient values', () => {
      const flour = food({ id: 'flour', energyKcal: 364, proteinG: 10, carbsG: 76, fatG: 1, priceHuf: 500, netAmount: 1000, netUnit: 'g' });
      const summary = computeRecipeSummary([{ foodId: 'flour', quantityAmount: 200, quantityUnit: 'g' }], [flour]);

      expect(summary.energyKcal).toBeCloseTo(728);
      expect(summary.proteinG).toBeCloseTo(20);
      expect(summary.carbsG).toBeCloseTo(152);
      expect(summary.fatG).toBeCloseTo(2);
      expect(summary.priceHuf).toBeCloseTo(100); // 200g / 1000g net * 500 Ft
      expect(summary.incomplete).toBeFalse();
    });

    it('resolves a db-unit ingredient via the catalog net content, canonicalized to grams', () => {
      const egg = food({ id: 'egg', energyKcal: 155, proteinG: 13, carbsG: 1, fatG: 11, priceHuf: 90, netAmount: 60, netUnit: 'g' });
      // 3 db * 60g = 180g base amount -> (180/100)*155 = 279
      const summary = computeRecipeSummary([{ foodId: 'egg', quantityAmount: 3, quantityUnit: 'db' }], [egg]);

      expect(summary.energyKcal).toBeCloseTo(279);
      expect(summary.priceHuf).toBeCloseTo(270); // 3 db * 90 Ft
      expect(summary.incomplete).toBeFalse();
    });

    it('flags incomplete and contributes zero nutrients when a db-unit ingredient has no catalog net content', () => {
      const mystery = food({ id: 'mystery', energyKcal: 200 });
      const summary = computeRecipeSummary([{ foodId: 'mystery', quantityAmount: 2, quantityUnit: 'db' }], [mystery]);

      expect(summary.energyKcal).toBe(0);
      expect(summary.incomplete).toBeTrue();
    });

    it('flags incomplete and contributes zero for a single missing nutrient field, without dropping the others', () => {
      const partial = food({ id: 'partial', energyKcal: 100, proteinG: null, carbsG: 20, fatG: 5 });
      const summary = computeRecipeSummary([{ foodId: 'partial', quantityAmount: 100, quantityUnit: 'g' }], [partial]);

      expect(summary.energyKcal).toBeCloseTo(100);
      expect(summary.proteinG).toBe(0);
      expect(summary.carbsG).toBeCloseTo(20);
      expect(summary.incomplete).toBeTrue();
    });

    it('flags incomplete and prices zero when a non-db ingredient has no catalog net content', () => {
      const noNet = food({ id: 'no-net', priceHuf: 300 });
      const summary = computeRecipeSummary([{ foodId: 'no-net', quantityAmount: 50, quantityUnit: 'g' }], [noNet]);

      expect(summary.priceHuf).toBe(0);
      expect(summary.incomplete).toBeTrue();
    });

    it('flags incomplete when the used unit family does not match the catalog net unit family', () => {
      const milk = food({ id: 'milk', priceHuf: 400, netAmount: 1, netUnit: 'l' });
      const summary = computeRecipeSummary([{ foodId: 'milk', quantityAmount: 100, quantityUnit: 'g' }], [milk]);

      expect(summary.priceHuf).toBe(0);
      expect(summary.incomplete).toBeTrue();
    });

    it('sums multiple ingredients and flags incomplete when any referenced Food is missing from the snapshot', () => {
      const flour = food({ id: 'flour', energyKcal: 100 });
      const summary = computeRecipeSummary(
        [
          { foodId: 'flour', quantityAmount: 100, quantityUnit: 'g' },
          { foodId: 'gone', quantityAmount: 1, quantityUnit: 'db' },
        ],
        [flour],
      );

      expect(summary.energyKcal).toBeCloseTo(100);
      expect(summary.incomplete).toBeTrue();
    });

    it('returns all zeros and not incomplete for an empty ingredient list', () => {
      const summary = computeRecipeSummary([], []);

      expect(summary).toEqual({ priceHuf: 0, energyKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, incomplete: false });
    });
  });

  describe('formatIngredientQuantity', () => {
    it('shows the parenthesized net-content conversion for a db amount when the catalog net content is known', () => {
      const egg = food({ netAmount: 60, netUnit: 'g' });
      expect(formatIngredientQuantity(egg, 2, 'db')).toBe('2db (120g)');
    });

    it('shows just the db amount when the catalog has no net content', () => {
      expect(formatIngredientQuantity(food(), 2, 'db')).toBe('2db');
    });

    it('shows just the db amount when the food itself is unknown', () => {
      expect(formatIngredientQuantity(undefined, 2, 'db')).toBe('2db');
    });

    it('never parenthesizes a non-db unit, even with known net content', () => {
      const flour = food({ netAmount: 1000, netUnit: 'g' });
      expect(formatIngredientQuantity(flour, 200, 'g')).toBe('200g');
    });
  });
});

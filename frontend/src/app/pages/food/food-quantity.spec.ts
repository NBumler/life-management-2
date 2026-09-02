import { FoodQuantityContext, formatFoodQuantity, resolveFoodQuantity } from './food-quantity';

describe('resolveFoodQuantity (backlog/063)', () => {
  describe('db — no darab-definíció (1 db = 1 cs)', () => {
    const plain: FoodQuantityContext = { netAmount: 250, netUnit: 'g' };

    it('resolves N db to N packages and N × net content grams', () => {
      expect(resolveFoodQuantity(3, 'db', plain)).toEqual({ packages: 3, baseAmount: 750 });
    });

    it('has no base amount when the net content is not SI', () => {
      expect(resolveFoodQuantity(3, 'db', { netAmount: 1, netUnit: 'cs' })).toEqual({ packages: 3, baseAmount: null });
    });
  });

  describe('db — package-fraction darab-definíció (1 db = 1/6 cs)', () => {
    const sixPack: FoodQuantityContext = { netAmount: 180, netUnit: 'g', pieceAmount: 0.1667, pieceUnit: 'cs' };

    it('scales packages by the piece fraction and grams by packages × net content', () => {
      const r = resolveFoodQuantity(6, 'db', sixPack);
      expect(r.packages).toBeCloseTo(1.0002);
      expect(r.baseAmount).toBeCloseTo(180.036);
    });
  });

  describe('db — SI darab-definíció (1 db = 30 g)', () => {
    it('gives grams directly and derives packages from a same-family net content', () => {
      const r = resolveFoodQuantity(3, 'db', { netAmount: 500, netUnit: 'g', pieceAmount: 30, pieceUnit: 'g' });
      expect(r.baseAmount).toBe(90);
      expect(r.packages).toBeCloseTo(0.18);
    });

    it('has no packages when the net content is missing / non-SI', () => {
      const r = resolveFoodQuantity(3, 'db', { netAmount: null, netUnit: null, pieceAmount: 30, pieceUnit: 'g' });
      expect(r.baseAmount).toBe(90);
      expect(r.packages).toBeNull();
    });
  });

  describe('cs and SI units', () => {
    it('cs resolves through the net content', () => {
      expect(resolveFoodQuantity(2, 'cs', { netAmount: 1, netUnit: 'l' })).toEqual({ packages: 2, baseAmount: 2000 });
    });

    it('an SI unit is a base amount; packages come from a same-family net content', () => {
      expect(resolveFoodQuantity(200, 'g', { netAmount: 1, netUnit: 'kg' })).toEqual({ packages: 0.2, baseAmount: 200 });
    });

    it('an SI unit with a family-mismatched net content has no packages', () => {
      expect(resolveFoodQuantity(200, 'g', { netAmount: 1, netUnit: 'l' })).toEqual({ packages: null, baseAmount: 200 });
    });
  });
});

describe('formatFoodQuantity (backlog/063)', () => {
  it('SI darab-definíció → "3db (18dkg)"', () => {
    expect(formatFoodQuantity(3, 'db', { pieceAmount: 6, pieceUnit: 'dkg' })).toBe('3db (18dkg)');
  });

  it('package-fraction darab-definíció → "3db (0.5cs)"', () => {
    expect(formatFoodQuantity(3, 'db', { pieceAmount: 0.1667, pieceUnit: 'cs' })).toBe('3db (0.5001cs)');
  });

  it('no darab-definíció → "3db"', () => {
    expect(formatFoodQuantity(3, 'db', { netAmount: 100, netUnit: 'g' })).toBe('3db');
  });

  it('cs with known net content → "2cs (1000g)"', () => {
    expect(formatFoodQuantity(2, 'cs', { netAmount: 500, netUnit: 'g' })).toBe('2cs (1000g)');
  });

  it('cs with unknown net content → "2cs"', () => {
    expect(formatFoodQuantity(2, 'cs', {})).toBe('2cs');
  });

  it('SI unit is shown bare', () => {
    expect(formatFoodQuantity(200, 'g', { netAmount: 1, netUnit: 'kg' })).toBe('200g');
  });
});

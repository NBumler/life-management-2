import { StoredFood } from '../../../api/model/storedFood';
import { afterOpeningDuration, allowedStorageLocations, catalogDurationFor, computeInitialExpiry, computeOpenedExpiry } from './shelf-life';

describe('shelf-life', () => {
  describe('computeInitialExpiry', () => {
    it('adds a day-based duration exactly', () => {
      expect(computeInitialExpiry('2026-09-01', { amount: 14, unit: 'nap' })).toBe('2026-09-15');
    });

    it('adds a week-based duration as 7 days', () => {
      expect(computeInitialExpiry('2026-09-01', { amount: 2, unit: 'hét' })).toBe('2026-09-15');
    });

    it('clamps month-end overflow instead of rolling into the next month', () => {
      // documentation/Architektúra/Mennyiség mező.md: jan 31 + 1 hónap = feb 28 (2026 not a leap year), not márc 3.
      expect(computeInitialExpiry('2026-01-31', { amount: 1, unit: 'hó' })).toBe('2026-02-28');
    });

    it('handles a leap-year february for month addition', () => {
      expect(computeInitialExpiry('2028-01-31', { amount: 1, unit: 'hó' })).toBe('2028-02-29');
    });

    it('adds whole years via calendar month addition', () => {
      expect(computeInitialExpiry('2026-02-28', { amount: 1, unit: 'év' })).toBe('2027-02-28');
    });

    it('returns null when the catalog has no duration for this location', () => {
      expect(computeInitialExpiry('2026-09-01', { amount: null, unit: null })).toBeNull();
    });
  });

  describe('computeOpenedExpiry', () => {
    it('returns today + after-opening duration when it is earlier than the current expiry', () => {
      expect(computeOpenedExpiry('2026-09-20', '2026-09-05', { amount: 3, unit: 'nap' })).toBe('2026-09-08');
    });

    it('keeps the original expiry when the after-opening candidate would be later', () => {
      expect(computeOpenedExpiry('2026-09-06', '2026-09-05', { amount: 30, unit: 'nap' })).toBe('2026-09-06');
    });

    it('leaves the expiry unchanged when the catalog has no after-opening duration', () => {
      expect(computeOpenedExpiry('2026-09-20', '2026-09-05', { amount: null, unit: null })).toBe('2026-09-20');
    });
  });

  describe('allowedStorageLocations', () => {
    it('returns only the locations with a catalog duration filled in', () => {
      expect(allowedStorageLocations({ shelfFridgeAmount: 5 })).toEqual([StoredFood.StorageLocationEnum.Fridge]);
    });

    it('allows all three when none are filled in', () => {
      expect(allowedStorageLocations({})).toEqual([
        StoredFood.StorageLocationEnum.Room,
        StoredFood.StorageLocationEnum.Fridge,
        StoredFood.StorageLocationEnum.Freezer,
      ]);
    });
  });

  describe('afterOpeningDuration', () => {
    it('is the same regardless of storage location — unlike catalogDurationFor', () => {
      const food = { shelfAfterOpeningAmount: 3, shelfAfterOpeningUnit: 'nap', shelfFridgeAmount: 5, shelfFridgeUnit: 'nap' };
      expect(afterOpeningDuration(food)).toEqual({ amount: 3, unit: 'nap' });
    });

    it('returns null amount/unit when the catalog has no after-opening duration', () => {
      expect(afterOpeningDuration({})).toEqual({ amount: null, unit: null });
    });
  });

  describe('catalogDurationFor', () => {
    it('looks up the duration for the given location', () => {
      const food = { shelfFridgeAmount: 5, shelfFridgeUnit: 'nap' };
      expect(catalogDurationFor(food, StoredFood.StorageLocationEnum.Fridge)).toEqual({ amount: 5, unit: 'nap' });
    });

    it('returns null amount/unit when the catalog field is empty', () => {
      expect(catalogDurationFor({}, StoredFood.StorageLocationEnum.Room)).toEqual({ amount: null, unit: null });
    });
  });
});

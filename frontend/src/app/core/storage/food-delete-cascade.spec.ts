import { emptiedMeals } from './food-delete-cascade';

describe('emptiedMeals (E-2)', () => {
  it('a meal whose every live item referenced the deleted Food is emptied', () => {
    const rows = [{ meal_id: 'm1' }, { meal_id: 'm1' }];
    const live = new Map([['m1', 2]]);
    expect(emptiedMeals(rows, live)).toEqual(['m1']);
  });

  it('a meal that keeps at least one other live item is NOT emptied', () => {
    const rows = [{ meal_id: 'm1' }];
    const live = new Map([['m1', 2]]); // 2 live items, only 1 removed
    expect(emptiedMeals(rows, live)).toEqual([]);
  });

  it('handles several meals at once, emptying only the fully-cleared ones', () => {
    const rows = [{ meal_id: 'm1' }, { meal_id: 'm2' }, { meal_id: 'm2' }, { meal_id: 'm3' }];
    const live = new Map([
      ['m1', 3], // 1 of 3 removed → stays
      ['m2', 2], // 2 of 2 removed → emptied
      ['m3', 1], // 1 of 1 removed → emptied
    ]);
    expect(emptiedMeals(rows, live).sort()).toEqual(['m2', 'm3']);
  });

  it('a missing live-count entry is treated as 0 → the meal is emptied', () => {
    expect(emptiedMeals([{ meal_id: 'm9' }], new Map())).toEqual(['m9']);
  });

  it('no meal_item rows → nothing emptied', () => {
    expect(emptiedMeals([], new Map([['m1', 5]]))).toEqual([]);
  });
});

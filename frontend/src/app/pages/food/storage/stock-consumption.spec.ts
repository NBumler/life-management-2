import { Food } from '../../../api/model/food';
import { StoredFood } from '../../../api/model/storedFood';
import { planStockConsumption } from './stock-consumption';

const TODAY = '2026-08-26';
const NOW = '2026-08-26T10:00:00.000Z';

function food(id: string, overrides: Partial<Food> = {}): Food {
  return { id, name: 'Tej', deleted: false, ...overrides };
}

function stored(id: string, overrides: Partial<StoredFood> = {}): StoredFood {
  return {
    id,
    foodId: 'food-1',
    quantityAmount: 1,
    quantityUnit: 'l',
    storageLocation: StoredFood.StorageLocationEnum.Fridge,
    expiresOn: '2026-09-01',
    opened: false,
    deleted: false,
    ...overrides,
  };
}

describe('planStockConsumption', () => {
  it('consumes already-opened rows first, before touching closed rows', () => {
    const openedRow = stored('opened', { opened: true, quantityAmount: 0.5, expiresOn: '2026-08-28' });
    const closedRow = stored('closed', { opened: false, quantityAmount: 1, expiresOn: '2026-09-05' });
    const demand = new Map([['food-1', 300]]); // 300ml, fits entirely within the opened 0.5l row

    const plan = planStockConsumption(demand, [openedRow, closedRow], [food('food-1')], TODAY, NOW);

    expect(plan.removeIds).toEqual([]);
    expect(plan.updates.length).toBe(1);
    expect(plan.updates[0].id).toBe('opened');
    expect(plan.updates[0].quantityAmount).toBeCloseTo(0.2);
    // The closed row is untouched — still findable at its original values.
    expect(plan.updates.find((row) => row.id === 'closed')).toBeUndefined();
  });

  it('FIFOs within the opened group by expiresOn ascending', () => {
    const laterOpened = stored('later', { opened: true, quantityAmount: 1, expiresOn: '2026-09-10' });
    const soonerOpened = stored('sooner', { opened: true, quantityAmount: 0.3, expiresOn: '2026-08-27' });
    const demand = new Map([['food-1', 400]]); // 400ml: fully drains "sooner" (300ml canonical) then dips into "later"

    const plan = planStockConsumption(demand, [laterOpened, soonerOpened], [food('food-1')], TODAY, NOW);

    expect(plan.removeIds).toEqual(['sooner']);
    expect(plan.updates.length).toBe(1);
    expect(plan.updates[0].id).toBe('later');
    expect(plan.updates[0].quantityAmount).toBeCloseTo(0.9);
  });

  it('falls through to a closed row when opened rows are insufficient, auto-opening it with recomputed expiry', () => {
    const openedRow = stored('opened', { opened: true, quantityAmount: 0.1, expiresOn: '2026-08-28' });
    const closedRow = stored('closed', { opened: false, quantityAmount: 1, expiresOn: '2026-12-01' });
    const catalogFood = food('food-1', { shelfAfterOpeningAmount: 3, shelfAfterOpeningUnit: 'nap' });
    const demand = new Map([['food-1', 500]]); // 100ml from opened, 400ml from closed

    const plan = planStockConsumption(demand, [openedRow, closedRow], [catalogFood], TODAY, NOW);

    expect(plan.removeIds).toEqual(['opened']);
    const closedUpdate = plan.updates.find((row) => row.id === 'closed')!;
    expect(closedUpdate.opened).toBeTrue();
    expect(closedUpdate.openedAt).toBe(NOW);
    expect(closedUpdate.quantityAmount).toBeCloseTo(0.6);
    // min(today + 3 nap, original 2026-12-01) = 2026-08-29 — well before the original expiry.
    expect(closedUpdate.expiresOn).toBe('2026-08-29');
  });

  it('leaves expiresOn unchanged when auto-opening a row whose catalog has no after-opening duration', () => {
    const closedRow = stored('closed', { opened: false, quantityAmount: 1, expiresOn: '2026-12-01' });
    const demand = new Map([['food-1', 200]]);

    const plan = planStockConsumption(demand, [closedRow], [food('food-1')], TODAY, NOW);

    const update = plan.updates.find((row) => row.id === 'closed')!;
    expect(update.opened).toBeTrue();
    expect(update.expiresOn).toBe('2026-12-01');
  });

  it('spans multiple rows until the demand is satisfied', () => {
    const row1 = stored('row1', { opened: true, quantityAmount: 0.2, expiresOn: '2026-08-27' });
    const row2 = stored('row2', { opened: true, quantityAmount: 0.2, expiresOn: '2026-08-28' });
    const row3 = stored('row3', { opened: true, quantityAmount: 0.2, expiresOn: '2026-08-29' });
    const demand = new Map([['food-1', 500]]); // needs all of row1+row2, and part of row3

    const plan = planStockConsumption(demand, [row3, row1, row2], [food('food-1')], TODAY, NOW);

    expect(plan.removeIds.sort()).toEqual(['row1', 'row2']);
    expect(plan.updates.length).toBe(1);
    expect(plan.updates[0].id).toBe('row3');
    expect(plan.updates[0].quantityAmount).toBeCloseTo(0.1);
  });

  it('does not error on under-stock — consumes everything down to zero and silently drops the remainder', () => {
    const onlyRow = stored('only', { opened: true, quantityAmount: 0.3, expiresOn: '2026-08-27' });
    const demand = new Map([['food-1', 1000]]); // far more than the 300ml available

    const plan = planStockConsumption(demand, [onlyRow], [food('food-1')], TODAY, NOW);

    expect(plan.removeIds).toEqual(['only']);
    expect(plan.updates).toEqual([]);
  });

  it('removes a row left at exactly zero rather than saving it with a zero quantity', () => {
    const row = stored('exact', { opened: true, quantityAmount: 0.3, expiresOn: '2026-08-27' });
    const demand = new Map([['food-1', 300]]); // exactly drains it

    const plan = planStockConsumption(demand, [row], [food('food-1')], TODAY, NOW);

    expect(plan.removeIds).toEqual(['exact']);
    expect(plan.updates).toEqual([]);
  });

  it('ignores foodIds with zero or negative demand and leaves unrelated foods untouched', () => {
    const zeroRow = stored('zero-demand', { foodId: 'food-2', opened: true, quantityAmount: 1 });
    const untouchedRow = stored('untouched', { foodId: 'food-3', opened: true, quantityAmount: 1 });
    const demand = new Map([
      ['food-2', 0],
      ['food-3', -5],
    ]);

    const plan = planStockConsumption(demand, [zeroRow, untouchedRow], [], TODAY, NOW);

    expect(plan.updates).toEqual([]);
    expect(plan.removeIds).toEqual([]);
  });
});

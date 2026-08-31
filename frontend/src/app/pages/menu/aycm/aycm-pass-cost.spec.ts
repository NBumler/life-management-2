import { AycmSettings } from '../../../api/model/aycmSettings';
import { RecurringExpense } from '../../../api/model/recurringExpense';
import { linkedCountingExpense, passCostComputable, passCostHuf, worthItHuf } from './aycm-pass-cost';

function expense(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'e1',
    name: 'AYCM pass',
    amountHuf: 30000,
    frequency: RecurringExpense.FrequencyEnum.Monthly,
    category: RecurringExpense.CategoryEnum.Sport,
    nextBillingDate: '2026-09-01',
    billingDayOfMonth: 1,
    active: true,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

function settings(linkedRecurringExpenseId: string | null): AycmSettings {
  return { id: 's1', linkedRecurringExpenseId };
}

describe('aycm-pass-cost linkedCountingExpense', () => {
  it('returns the linked row when it is live and active', () => {
    const rows = [expense({ id: 'e1' })];
    expect(linkedCountingExpense(settings('e1'), rows)?.id).toBe('e1');
  });

  it('returns null when nothing is linked', () => {
    expect(linkedCountingExpense(settings(null), [expense()])).toBeNull();
    expect(linkedCountingExpense(null, [expense()])).toBeNull();
  });

  it('returns null when the linked row is deleted or paused', () => {
    expect(linkedCountingExpense(settings('e1'), [expense({ id: 'e1', deleted: true })])).toBeNull();
    expect(linkedCountingExpense(settings('e1'), [expense({ id: 'e1', active: false })])).toBeNull();
  });

  it('returns null when the linked id is not in the list', () => {
    expect(linkedCountingExpense(settings('missing'), [expense({ id: 'e1' })])).toBeNull();
  });
});

describe('aycm-pass-cost passCostComputable', () => {
  it('is true only with the finance flag on and a counting linked row', () => {
    expect(passCostComputable(true, settings('e1'), [expense({ id: 'e1' })])).toBe(true);
    expect(passCostComputable(false, settings('e1'), [expense({ id: 'e1' })])).toBe(false);
    expect(passCostComputable(true, settings(null), [expense({ id: 'e1' })])).toBe(false);
    expect(passCostComputable(true, settings('e1'), [expense({ id: 'e1', active: false })])).toBe(false);
  });
});

describe('aycm-pass-cost passCostHuf', () => {
  it('is monthlyEquivalentHuf × monthCount, using the SSOT formula', () => {
    expect(passCostHuf(settings('e1'), [expense({ id: 'e1', amountHuf: 30000 })], 1)).toBe(30000);
    expect(passCostHuf(settings('e1'), [expense({ id: 'e1', amountHuf: 30000 })], 3)).toBe(90000);
    expect(
      passCostHuf(settings('e1'), [expense({ id: 'e1', amountHuf: 90000, frequency: RecurringExpense.FrequencyEnum.Quarterly })], 3),
    ).toBe(90000); // 90000/3 = 30000 monthly, × 3
  });

  it('is 0 when nothing is computable', () => {
    expect(passCostHuf(settings(null), [expense()], 3)).toBe(0);
  });
});

describe('aycm-pass-cost worthItHuf', () => {
  it('is a signed difference with no clamp', () => {
    expect(worthItHuf(40000, 30000)).toBe(10000);
    expect(worthItHuf(12000, 30000)).toBe(-18000);
  });
});

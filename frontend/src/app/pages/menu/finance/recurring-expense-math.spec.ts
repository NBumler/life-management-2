import { RecurringExpense } from '../../../api/model/recurringExpense';
import {
  addPeriod,
  classifyExpenseSection,
  countsInMonthlyEquivalent,
  dayLag,
  monthlyEquivalentHuf,
  sumMonthlyEquivalentHuf,
} from './recurring-expense-math';

function expense(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'id-1',
    name: 'Netflix',
    amountHuf: 4990,
    frequency: RecurringExpense.FrequencyEnum.Monthly,
    category: RecurringExpense.CategoryEnum.Entertainment,
    nextBillingDate: '2026-09-10',
    billingDayOfMonth: 10,
    active: true,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

describe('monthlyEquivalentHuf', () => {
  it('returns the amount unchanged for MONTHLY', () => {
    expect(monthlyEquivalentHuf({ amountHuf: 4990, frequency: RecurringExpense.FrequencyEnum.Monthly })).toBe(4990);
  });

  it('divides by 3 and rounds (0.5 up) for QUARTERLY', () => {
    expect(monthlyEquivalentHuf({ amountHuf: 10000, frequency: RecurringExpense.FrequencyEnum.Quarterly })).toBe(3333);
    expect(monthlyEquivalentHuf({ amountHuf: 4999, frequency: RecurringExpense.FrequencyEnum.Quarterly })).toBe(1666);
  });

  it('divides by 12 and rounds for YEARLY', () => {
    expect(monthlyEquivalentHuf({ amountHuf: 60000, frequency: RecurringExpense.FrequencyEnum.Yearly })).toBe(5000);
    expect(monthlyEquivalentHuf({ amountHuf: 100, frequency: RecurringExpense.FrequencyEnum.Yearly })).toBe(8);
  });
});

describe('countsInMonthlyEquivalent / sumMonthlyEquivalentHuf', () => {
  it('counts only live + active rows', () => {
    expect(countsInMonthlyEquivalent({ deleted: false, active: true })).toBe(true);
    expect(countsInMonthlyEquivalent({ deleted: false, active: false })).toBe(false);
    expect(countsInMonthlyEquivalent({ deleted: true, active: true })).toBe(false);
  });

  it('rounds each row before summing; empty set is 0', () => {
    expect(sumMonthlyEquivalentHuf([])).toBe(0);
    const rows = [
      expense({ id: 'a', amountHuf: 10000, frequency: RecurringExpense.FrequencyEnum.Quarterly }), // 3333
      expense({ id: 'b', amountHuf: 4990, frequency: RecurringExpense.FrequencyEnum.Monthly }), // 4990
      expense({ id: 'c', amountHuf: 12000, frequency: RecurringExpense.FrequencyEnum.Yearly, active: false }), // excluded
      expense({ id: 'd', amountHuf: 999, frequency: RecurringExpense.FrequencyEnum.Monthly, deleted: true }), // excluded
    ];
    expect(sumMonthlyEquivalentHuf(rows)).toBe(8323);
  });
});

describe('addPeriod', () => {
  it('keeps the intended day across short months (Jan-31 walk)', () => {
    const feb = addPeriod('2026-01-31', RecurringExpense.FrequencyEnum.Monthly, 31);
    expect(feb).toBe('2026-02-28');
    const mar = addPeriod(feb, RecurringExpense.FrequencyEnum.Monthly, 31);
    expect(mar).toBe('2026-03-31');
    const apr = addPeriod(mar, RecurringExpense.FrequencyEnum.Monthly, 31);
    expect(apr).toBe('2026-04-30');
  });

  it('restores Feb-29 as the intended day in the next leap year', () => {
    // billingDayOfMonth 29, non-leap 2027 clamps to 28...
    const y2027 = addPeriod('2024-02-29', RecurringExpense.FrequencyEnum.Yearly, 29);
    expect(y2027).toBe('2025-02-28');
    // ...and 2028 (leap) restores 29 because billingDayOfMonth stayed 29.
    const y2028 = addPeriod('2027-02-28', RecurringExpense.FrequencyEnum.Yearly, 29);
    expect(y2028).toBe('2028-02-29');
  });

  it('adds 3 months for QUARTERLY, rolling the year', () => {
    expect(addPeriod('2026-11-15', RecurringExpense.FrequencyEnum.Quarterly, 15)).toBe('2027-02-15');
  });

  it('adds 12 months for YEARLY', () => {
    expect(addPeriod('2026-06-01', RecurringExpense.FrequencyEnum.Yearly, 1)).toBe('2027-06-01');
  });
});

describe('classifyExpenseSection', () => {
  const today = '2026-09-10';

  it('routes paused rows to PAUSED regardless of date', () => {
    expect(classifyExpenseSection({ active: false, nextBillingDate: '2020-01-01' }, today)).toBe('PAUSED');
  });

  it('splits active rows by date vs today', () => {
    expect(classifyExpenseSection({ active: true, nextBillingDate: '2026-09-09' }, today)).toBe('OVERDUE');
    expect(classifyExpenseSection({ active: true, nextBillingDate: '2026-09-10' }, today)).toBe('TODAY');
    expect(classifyExpenseSection({ active: true, nextBillingDate: '2026-09-11' }, today)).toBe('LATER');
  });
});

describe('dayLag', () => {
  it('counts whole days today − nextBillingDate', () => {
    expect(dayLag('2026-09-01', '2026-09-10')).toBe(9);
    expect(dayLag('2026-09-10', '2026-09-10')).toBe(0);
  });

  it('spans month boundaries correctly', () => {
    expect(dayLag('2026-01-31', '2026-03-01')).toBe(29);
  });
});

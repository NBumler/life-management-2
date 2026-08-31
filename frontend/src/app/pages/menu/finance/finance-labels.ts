import { RecurringExpense } from '../../../api/model/recurringExpense';

/** documentation/Subfeatures/Rendszeres kiadások.md "Entitás" — the fixed enum orders for pickers / chips. */
export const EXPENSE_CATEGORIES: readonly RecurringExpense.CategoryEnum[] = [
  RecurringExpense.CategoryEnum.Entertainment,
  RecurringExpense.CategoryEnum.Sport,
  RecurringExpense.CategoryEnum.Utilities,
  RecurringExpense.CategoryEnum.Insurance,
  RecurringExpense.CategoryEnum.Other,
];

export const EXPENSE_FREQUENCIES: readonly RecurringExpense.FrequencyEnum[] = [
  RecurringExpense.FrequencyEnum.Monthly,
  RecurringExpense.FrequencyEnum.Quarterly,
  RecurringExpense.FrequencyEnum.Yearly,
];

export const EXPENSE_CATEGORY_LABEL_KEYS: Record<RecurringExpense.CategoryEnum, string> = {
  [RecurringExpense.CategoryEnum.Entertainment]: 'FINANCE.EXPENSES.CATEGORY.ENTERTAINMENT',
  [RecurringExpense.CategoryEnum.Sport]: 'FINANCE.EXPENSES.CATEGORY.SPORT',
  [RecurringExpense.CategoryEnum.Utilities]: 'FINANCE.EXPENSES.CATEGORY.UTILITIES',
  [RecurringExpense.CategoryEnum.Insurance]: 'FINANCE.EXPENSES.CATEGORY.INSURANCE',
  [RecurringExpense.CategoryEnum.Other]: 'FINANCE.EXPENSES.CATEGORY.OTHER',
};

export const EXPENSE_FREQUENCY_LABEL_KEYS: Record<RecurringExpense.FrequencyEnum, string> = {
  [RecurringExpense.FrequencyEnum.Monthly]: 'FINANCE.EXPENSES.FREQUENCY.MONTHLY',
  [RecurringExpense.FrequencyEnum.Quarterly]: 'FINANCE.EXPENSES.FREQUENCY.QUARTERLY',
  [RecurringExpense.FrequencyEnum.Yearly]: 'FINANCE.EXPENSES.FREQUENCY.YEARLY',
};

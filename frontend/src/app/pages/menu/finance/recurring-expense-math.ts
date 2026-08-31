/**
 * documentation/Subfeatures/Rendszeres kiadások.md — SSOT for the three pure calculations the
 * Pénzügyek dashboard and the AYCM "megéri-e" card read (they import from here, never copy the
 * formula): the monthly equivalent, the counts-in-monthly-total predicate, and the "Fizetve" date
 * stepping (`addPeriod`). Plus the list-section classification. Pure TS, no Angular — same shape as
 * `shared/tdee-calculator.ts` / `pages/food/storage/shelf-life.ts`.
 */
import { RecurringExpense } from '../../../api/model/recurringExpense';

/** documentation/Subfeatures/Rendszeres kiadások.md "Havi ekvivalens": whole Ft, Math.round (0.5 up). */
export function monthlyEquivalentHuf(expense: Pick<RecurringExpense, 'amountHuf' | 'frequency'>): number {
  switch (expense.frequency) {
    case RecurringExpense.FrequencyEnum.Monthly:
      return expense.amountHuf;
    case RecurringExpense.FrequencyEnum.Quarterly:
      return Math.round(expense.amountHuf / 3);
    case RecurringExpense.FrequencyEnum.Yearly:
      return Math.round(expense.amountHuf / 12);
    default:
      return expense.amountHuf;
  }
}

/**
 * documentation/Subfeatures/Rendszeres kiadások.md "Beszámított sor": a row counts toward the
 * dashboard monthly total and the AYCM reading iff it is live and active.
 */
export function countsInMonthlyEquivalent(expense: Pick<RecurringExpense, 'deleted' | 'active'>): boolean {
  return !expense.deleted && expense.active;
}

/**
 * documentation/Pénzügyek.md "Havi kiadás": Σ monthlyEquivalentHuf over the counts-in rows (each
 * rounded first, then summed). Empty set → 0 Ft.
 */
export function sumMonthlyEquivalentHuf(expenses: readonly RecurringExpense[]): number {
  return expenses.filter(countsInMonthlyEquivalent).reduce((sum, e) => sum + monthlyEquivalentHuf(e), 0);
}

const MONTHS_PER_PERIOD: Record<RecurringExpense.FrequencyEnum, number> = {
  [RecurringExpense.FrequencyEnum.Monthly]: 1,
  [RecurringExpense.FrequencyEnum.Quarterly]: 3,
  [RecurringExpense.FrequencyEnum.Yearly]: 12,
};

/**
 * documentation/Subfeatures/Rendszeres kiadások.md "Dátumléptetés": add one billing period to
 * `nextBillingDate` in whole calendar months, landing on `min(billingDayOfMonth, lastDayOfMonth)` so
 * the *intended* day survives short months (Jan-31 → Feb-28 → Mar-31). Pure string math on
 * `YYYY-MM-DD`; `Date` is only used to read a month length, never for TZ-sensitive arithmetic.
 */
export function addPeriod(
  nextBillingDate: string,
  frequency: RecurringExpense.FrequencyEnum,
  billingDayOfMonth: number,
): string {
  const [year, month] = nextBillingDate.split('-').map(Number);
  const monthsToAdd = MONTHS_PER_PERIOD[frequency] ?? 1;
  const zeroBased = year * 12 + (month - 1) + monthsToAdd;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased % 12) + 1; // 1..12
  const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
  const day = Math.min(billingDayOfMonth, lastDayOfMonth);
  return `${targetYear}-${pad2(targetMonth)}-${pad2(day)}`;
}

export type ExpenseSection = 'OVERDUE' | 'TODAY' | 'LATER' | 'PAUSED';

/**
 * documentation/Subfeatures/Rendszeres kiadások.md "Lista" sections. `todayIso` is the client
 * calendar day (`YYYY-MM-DD`). Paused (`active = false`) wins regardless of date.
 */
export function classifyExpenseSection(
  expense: Pick<RecurringExpense, 'active' | 'nextBillingDate'>,
  todayIso: string,
): ExpenseSection {
  if (!expense.active) {
    return 'PAUSED';
  }
  if (expense.nextBillingDate < todayIso) {
    return 'OVERDUE';
  }
  if (expense.nextBillingDate === todayIso) {
    return 'TODAY';
  }
  return 'LATER';
}

/**
 * Whole days `todayIso − nextBillingDate` for the "lemaradás" badge on overdue rows. 0 or negative
 * when not overdue. Both args are `YYYY-MM-DD` client calendar days.
 */
export function dayLag(nextBillingDate: string, todayIso: string): number {
  return Math.round((utcMillis(todayIso) - utcMillis(nextBillingDate)) / 86_400_000);
}

function utcMillis(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

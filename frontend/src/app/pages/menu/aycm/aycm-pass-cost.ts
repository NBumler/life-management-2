/**
 * documentation/Features/AYCM tracker.md + documentation/Subfeatures/AYCM Statisztikák.md — the
 * "megéri-e" (is-it-worth-it) contract, shared by the hub and the stats screen. Pure TS, no Angular.
 *
 * The monthly pass cost is NOT recomputed here — it comes from the linked RecurringExpense's
 * `monthlyEquivalentHuf`, the SSOT in `recurring-expense-math.ts` (this module imports it, never
 * copies the /1 /3 /12 formula). `coPaymentHuf` never enters any of these numbers.
 */
import { AycmSettings } from '../../../api/model/aycmSettings';
import { RecurringExpense } from '../../../api/model/recurringExpense';
import { countsInMonthlyEquivalent, monthlyEquivalentHuf } from '../finance/recurring-expense-math';

/** The linked, still-counting RecurringExpense, or null (no link / linked row deleted or paused). */
export function linkedCountingExpense(
  settings: Pick<AycmSettings, 'linkedRecurringExpenseId'> | null,
  expenses: readonly RecurringExpense[],
): RecurringExpense | null {
  const linkedId = settings?.linkedRecurringExpenseId ?? null;
  if (linkedId === null) {
    return null;
  }
  const row = expenses.find((e) => e.id === linkedId);
  return row && countsInMonthlyEquivalent(row) ? row : null;
}

/**
 * documentation/Features/AYCM tracker.md: the "megéri-e" card shows a number only when the Pénzügyek
 * flag is on AND a linked expense exists AND that row is "beszámított" (live + active). Otherwise `~`.
 */
export function passCostComputable(
  financeEnabled: boolean,
  settings: Pick<AycmSettings, 'linkedRecurringExpenseId'> | null,
  expenses: readonly RecurringExpense[],
): boolean {
  return financeEnabled && linkedCountingExpense(settings, expenses) !== null;
}

/**
 * `monthlyEquivalentHuf(linkedRow) × monthCount` (each month billed at the monthly equivalent).
 * 0 when nothing computable — callers gate on `passCostComputable` first for the `~` case.
 */
export function passCostHuf(
  settings: Pick<AycmSettings, 'linkedRecurringExpenseId'> | null,
  expenses: readonly RecurringExpense[],
  monthCount: number,
): number {
  const row = linkedCountingExpense(settings, expenses);
  return row ? monthlyEquivalentHuf(row) * monthCount : 0;
}

/** Signed whole Ft: visit-value sum minus pass cost. No clamp to 0 (a negative means "not yet worth it"). */
export function worthItHuf(visitValueSumHuf: number, passCostHufValue: number): number {
  return visitValueSumHuf - passCostHufValue;
}

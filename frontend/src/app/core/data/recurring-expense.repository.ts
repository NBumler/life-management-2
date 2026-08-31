import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { RecurringExpense } from '../../api/model/recurringExpense';
import { addPeriod } from '../../pages/menu/finance/recurring-expense-math';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface RecurringExpenseSaveInput {
  id?: string;
  name: string;
  amountHuf: number;
  frequency: RecurringExpense.FrequencyEnum;
  category: RecurringExpense.CategoryEnum;
  nextBillingDate: string;
  /**
   * The intended day-of-period. On create the caller passes the chosen date's day; on a manual
   * date edit the caller passes the new date's day (deliberate override). Omitted on "Fizetve" /
   * field-only edits, where the stored value must survive — pass the existing row's value then.
   */
  billingDayOfMonth: number;
  active: boolean;
  notes: string | null;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class RecurringExpenseRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<RecurringExpense[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listRecurringExpenses());
    this.loaded.set(true);
  }

  async save(input: RecurringExpenseSaveInput): Promise<RecurringExpense> {
    const id = input.id ?? uuidV4();
    const draft: RecurringExpense = {
      id,
      name: input.name.trim(),
      amountHuf: input.amountHuf,
      frequency: input.frequency,
      category: input.category,
      nextBillingDate: input.nextBillingDate,
      billingDayOfMonth: input.billingDayOfMonth,
      active: input.active,
      notes: input.notes,
      deleted: false,
    };
    return this.persist(draft);
  }

  /**
   * documentation/Subfeatures/Rendszeres kiadások.md "Fizetve": one tap = one period added to the
   * *stored* nextBillingDate. billingDayOfMonth is untouched. Only for live, active rows.
   */
  async markPaid(expense: RecurringExpense): Promise<RecurringExpense> {
    if (expense.deleted || !expense.active) {
      return expense;
    }
    return this.persist({
      ...expense,
      nextBillingDate: addPeriod(expense.nextBillingDate, expense.frequency, expense.billingDayOfMonth),
    });
  }

  /** documentation/Subfeatures/Rendszeres kiadások.md "Szünet / Élesítés": no date jump, plain PUT. */
  async setActive(expense: RecurringExpense, active: boolean): Promise<RecurringExpense> {
    if (expense.deleted || expense.active === active) {
      return expense;
    }
    return this.persist({ ...expense, active });
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteRecurringExpense(id);
    this.items.update((list) => list.filter((e) => e.id !== id));
    this.requestDrainIfNative();
  }

  private async persist(draft: RecurringExpense): Promise<RecurringExpense> {
    const saved = await this.storage.upsertRecurringExpense(draft);
    this.items.update((list) => {
      const next = list.filter((e) => e.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}

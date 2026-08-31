import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { RecurringExpense } from '../../../api/model/recurringExpense';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { today } from '../../../shared/local-date';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL_KEYS, EXPENSE_FREQUENCIES, EXPENSE_FREQUENCY_LABEL_KEYS } from './finance-labels';

const LIST_URL = '/tabs/menu/finance/recurring-expenses';

/**
 * documentation/Subfeatures/Rendszeres kiadások.md — the create/edit form (route param `id` is an
 * existing row's uuid or the literal `new`). Create defaults: MONTHLY, nextBillingDate = today,
 * category = OTHER, amount empty. `billingDayOfMonth` tracks the chosen date's day on create and on
 * a manual date edit; a field-only edit leaves the stored value alone.
 */
@Component({
  selector: 'app-recurring-expense-edit',
  templateUrl: 'recurring-expense-edit.page.html',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringExpenseEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly repository = inject(RecurringExpenseRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly frequencies = EXPENSE_FREQUENCIES;
  readonly categories = EXPENSE_CATEGORIES;
  readonly frequencyLabelKeys = EXPENSE_FREQUENCY_LABEL_KEYS;
  readonly categoryLabelKeys = EXPENSE_CATEGORY_LABEL_KEYS;

  readonly expenseId = signal<string | null>(null);
  private original: RecurringExpense | null = null;
  /**
   * documentation/Features/AYCM tracker.md "Visszatérés mechanizmusa": when a caller (the AYCM hub's
   * Bérlet picker) opens create with `?returnTo=<url>`, a successful save navigates there instead of
   * the list, handing back the new row's id as `?createdExpenseId=`. Cancel / delete ignore it.
   */
  private returnTo: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    amountHuf: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    frequency: this.fb.nonNullable.control<RecurringExpense.FrequencyEnum>(RecurringExpense.FrequencyEnum.Monthly),
    category: this.fb.nonNullable.control<RecurringExpense.CategoryEnum>(RecurringExpense.CategoryEnum.Other),
    nextBillingDate: this.fb.nonNullable.control(today(), [Validators.required]),
    notes: this.fb.nonNullable.control(''),
    active: this.fb.nonNullable.control(true),
  });

  async ngOnInit(): Promise<void> {
    if (!this.repository.loaded()) {
      await this.repository.load();
    }
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null && idParam !== 'new') {
      const existing = this.repository.items().find((row) => row.id === idParam && !row.deleted);
      if (existing === undefined) {
        await this.router.navigateByUrl(LIST_URL);
        return;
      }
      this.expenseId.set(idParam);
      this.original = existing;
      this.form.reset({
        name: existing.name,
        amountHuf: existing.amountHuf,
        frequency: existing.frequency,
        category: existing.category,
        nextBillingDate: existing.nextBillingDate,
        notes: existing.notes ?? '',
        active: existing.active,
      });
    }
  }

  get isEdit(): boolean {
    return this.expenseId() !== null;
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const dateChanged = this.original === null || value.nextBillingDate !== this.original.nextBillingDate;
    const billingDayOfMonth = dateChanged ? dayOfMonth(value.nextBillingDate) : this.original!.billingDayOfMonth;
    const notes = value.notes.trim();

    const saved = await this.repository.save({
      id: this.expenseId() ?? undefined,
      name: value.name,
      amountHuf: value.amountHuf ?? 0,
      frequency: value.frequency,
      category: value.category,
      nextBillingDate: value.nextBillingDate,
      billingDayOfMonth,
      active: value.active,
      notes: notes.length > 0 ? notes : null,
    });
    if (this.returnTo !== null) {
      await this.router.navigate([this.returnTo], { queryParams: { createdExpenseId: saved.id } });
      return;
    }
    await this.router.navigateByUrl(LIST_URL);
  }

  async delete(): Promise<void> {
    const id = this.expenseId();
    if (id === null) {
      return;
    }
    const alert = await this.alertController.create({
      header: this.translate.instant('FINANCE.EXPENSES.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FINANCE.EXPENSES.DELETE_CONFIRM_MESSAGE', {
        name: this.original?.name ?? '',
      }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.deleteAndNavigateBack(id),
        },
      ],
    });
    await alert.present();
  }

  private async deleteAndNavigateBack(id: string): Promise<void> {
    await this.repository.remove(id);
    await this.router.navigateByUrl(LIST_URL);
  }
}

function dayOfMonth(iso: string): number {
  return Number(iso.split('-')[2]);
}

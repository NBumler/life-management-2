import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { RecurringExpense } from '../../../api/model/recurringExpense';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { today } from '../../../shared/local-date';
import { matchesSearch } from '../../../shared/text-search';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL_KEYS, EXPENSE_FREQUENCY_LABEL_KEYS } from './finance-labels';
import {
  ExpenseSection,
  classifyExpenseSection,
  dayLag,
  monthlyEquivalentHuf,
} from './recurring-expense-math';

interface ExpenseGroup {
  section: ExpenseSection;
  titleKey: string;
  rows: RecurringExpense[];
}

const SECTION_ORDER: readonly { section: ExpenseSection; titleKey: string }[] = [
  { section: 'OVERDUE', titleKey: 'FINANCE.EXPENSES.SECTION.OVERDUE' },
  { section: 'TODAY', titleKey: 'FINANCE.EXPENSES.SECTION.TODAY' },
  { section: 'LATER', titleKey: 'FINANCE.EXPENSES.SECTION.LATER' },
  { section: 'PAUSED', titleKey: 'FINANCE.EXPENSES.SECTION.PAUSED' },
];

/**
 * documentation/Subfeatures/Rendszeres kiadások.md "UI/UX: Lista" — Lejárt / Ma / Később /
 * Szüneteltetett sections (empty ones hidden), category chip filter (OR union, all 5 on by default),
 * name+notes search (AND with the chips), sliding delete (confirm) + pause/resume, and a "Fizetve"
 * action on active rows. Global-empty shows a create CTA; filtered-empty just says "nincs találat".
 */
@Component({
  selector: 'app-recurring-expense-list',
  templateUrl: 'recurring-expense-list.page.html',
  styleUrl: 'recurring-expense-list.page.scss',
  imports: [
    RouterLink,
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonSearchbar,
    IonChip,
    IonList,
    IonListHeader,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonNote,
    IonIcon,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringExpenseListPage implements OnInit, ViewWillEnter {
  private readonly repository = inject(RecurringExpenseRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly categories = EXPENSE_CATEGORIES;
  readonly categoryLabelKeys = EXPENSE_CATEGORY_LABEL_KEYS;
  readonly frequencyLabelKeys = EXPENSE_FREQUENCY_LABEL_KEYS;

  readonly query = signal('');
  /** documentation/Subfeatures/Rendszeres kiadások.md: all five chips on by default; OR union. */
  readonly activeCategories = signal<ReadonlySet<RecurringExpense.CategoryEnum>>(new Set(EXPENSE_CATEGORIES));

  /**
   * Captured reactively (and re-read in `ionViewWillEnter`) so the Lejárt/Ma/Később split and the
   * overdue lag stay correct when the page outlives midnight — Ionic keeps it alive across tab
   * switches, so `ngOnInit` runs only once.
   */
  private readonly todayIso = signal(today());

  private readonly liveRows = computed(() => this.repository.items().filter((row) => !row.deleted));

  private readonly filteredRows = computed(() => {
    const query = this.query();
    const active = this.activeCategories();
    return this.liveRows().filter(
      (row) =>
        active.has(row.category) && (matchesSearch(query, row.name) || matchesSearch(query, row.notes ?? '')),
    );
  });

  readonly groups = computed<ExpenseGroup[]>(() => {
    const rows = this.filteredRows();
    return SECTION_ORDER.map(({ section, titleKey }) => ({
      section,
      titleKey,
      rows: rows
        .filter((row) => classifyExpenseSection(row, this.todayIso()) === section)
        .sort((a, b) => this.sortWithinSection(section, a, b)),
    })).filter((group) => group.rows.length > 0);
  });

  readonly isGlobalEmpty = computed(() => this.repository.loaded() && this.liveRows().length === 0);
  readonly isFilteredEmpty = computed(
    () => !this.isGlobalEmpty() && this.repository.loaded() && this.groups().length === 0,
  );

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  ionViewWillEnter(): void {
    this.todayIso.set(today());
  }

  monthlyEquivalent(row: RecurringExpense): number {
    return monthlyEquivalentHuf(row);
  }

  lagDays(row: RecurringExpense): number {
    return dayLag(row.nextBillingDate, this.todayIso());
  }

  isCategoryActive(category: RecurringExpense.CategoryEnum): boolean {
    return this.activeCategories().has(category);
  }

  toggleCategory(category: RecurringExpense.CategoryEnum): void {
    this.activeCategories.update((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  async markPaid(row: RecurringExpense, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    await this.repository.markPaid(row);
  }

  async togglePause(row: RecurringExpense, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    await this.repository.setActive(row, !row.active);
  }

  async confirmDelete(row: RecurringExpense, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    const alert = await this.alertController.create({
      header: this.translate.instant('FINANCE.EXPENSES.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FINANCE.EXPENSES.DELETE_CONFIRM_MESSAGE', { name: row.name }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => void this.repository.remove(row.id),
        },
      ],
    });
    await alert.present();
  }

  private sortWithinSection(section: ExpenseSection, a: RecurringExpense, b: RecurringExpense): number {
    if (section === 'PAUSED') {
      return a.name.localeCompare(b.name);
    }
    return a.nextBillingDate.localeCompare(b.nextBillingDate) || a.name.localeCompare(b.name);
  }
}

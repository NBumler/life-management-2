import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { RecurringExpense } from '../../../api/model/recurringExpense';
import { UserProfile } from '../../../api/model/userProfile';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { FinanceDashboardPage } from './finance-dashboard.page';

function expense(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'e1',
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

describe('FinanceDashboardPage', () => {
  let fixture: ComponentFixture<FinanceDashboardPage>;
  let component: FinanceDashboardPage;
  let profile: {
    load: jasmine.Spy<() => Promise<void>>;
    loaded: ReturnType<typeof signal<boolean>>;
    profile: ReturnType<typeof signal<UserProfile | null>>;
  };
  let expenses: {
    load: jasmine.Spy<() => Promise<void>>;
    loaded: ReturnType<typeof signal<boolean>>;
    items: ReturnType<typeof signal<RecurringExpense[]>>;
  };

  async function setup(): Promise<void> {
    profile = {
      load: jasmine.createSpy('profile.load').and.resolveTo(undefined),
      loaded: signal(false),
      profile: signal<UserProfile | null>(null),
    };
    expenses = {
      load: jasmine.createSpy('expenses.load').and.resolveTo(undefined),
      loaded: signal(false),
      items: signal<RecurringExpense[]>([]),
    };

    await TestBed.configureTestingModule({
      imports: [FinanceDashboardPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ProfileRepository, useValue: profile },
        { provide: RecurringExpenseRepository, useValue: expenses },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinanceDashboardPage);
    component = fixture.componentInstance;
  }

  it('loads both singleton repos when neither is loaded yet', async () => {
    await setup();
    await component.ngOnInit();
    expect(profile.load).toHaveBeenCalledTimes(1);
    expect(expenses.load).toHaveBeenCalledTimes(1);
  });

  it('skips the redundant load/fetch for a repo a sibling screen already loaded', async () => {
    await setup();
    profile.loaded.set(true);
    expenses.loaded.set(true);
    await component.ngOnInit();
    expect(profile.load).not.toHaveBeenCalled();
    expect(expenses.load).not.toHaveBeenCalled();
  });

  it('renders "~" for Nettó and Maradék while gross salary is empty, 0 for Havi kiadások', async () => {
    await setup();
    await component.ngOnInit();
    expect(component.netHuf()).toBeNull();
    expect(component.remainderHuf()).toBeNull();
    expect(component.monthlyExpensesHuf()).toBe(0);
  });

  it('sums only the live, active rows into the monthly-expenses total', async () => {
    await setup();
    expenses.items.set([
      expense({ id: 'a', amountHuf: 5000, frequency: RecurringExpense.FrequencyEnum.Monthly }),
      expense({ id: 'b', amountHuf: 12000, frequency: RecurringExpense.FrequencyEnum.Yearly }), // 1000/mo
      expense({ id: 'c', amountHuf: 9000, active: false }),
      expense({ id: 'd', amountHuf: 9000, deleted: true }),
    ]);
    await component.ngOnInit();
    expect(component.monthlyExpensesHuf()).toBe(6000);
  });
});

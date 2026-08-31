import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { ActionSheetController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
import { AycmSettings } from '../../../api/model/aycmSettings';
import { RecurringExpense } from '../../../api/model/recurringExpense';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { AycmCheckInRepository } from '../../../core/data/aycm-check-in.repository';
import { AycmSettingsRepository } from '../../../core/data/aycm-settings.repository';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { today } from '../../../shared/local-date';
import { windowRange } from './aycm-stats';
import { AycmDashboardPage } from './aycm-dashboard.page';

function checkIn(overrides: Partial<AycmCheckIn> = {}): AycmCheckIn {
  return {
    id: 'c1',
    checkInDate: today(),
    checkInTime: '18:00',
    partnerId: 'p1',
    partnerName: 'Life1',
    ruleId: 'r1',
    ruleLabel: 'Este',
    listPriceHuf: 3000,
    coPaymentHuf: 500,
    visitValueHuf: 3000,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

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

describe('AycmDashboardPage', () => {
  let fixture: ComponentFixture<AycmDashboardPage>;
  let component: AycmDashboardPage;
  let checkInRepo: {
    checkIns: ReturnType<typeof signal<AycmCheckIn[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    load: jasmine.Spy;
    checkInForDate: (date: string) => AycmCheckIn | null;
  };
  let settingsRepo: {
    settings: ReturnType<typeof signal<AycmSettings | null>>;
    loaded: ReturnType<typeof signal<boolean>>;
    load: jasmine.Spy;
    linkExpense: jasmine.Spy;
  };
  let expenseRepo: {
    items: ReturnType<typeof signal<RecurringExpense[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    load: jasmine.Spy;
  };
  let queryParam: string | null;

  async function setup(financeEnabled: boolean): Promise<void> {
    const inMonth = windowRange('THIS_MONTH', today()).from;
    checkInRepo = {
      checkIns: signal<AycmCheckIn[]>([
        checkIn({ id: 'a', checkInDate: inMonth, visitValueHuf: 3000 }),
        checkIn({ id: 'b', checkInDate: inMonth, visitValueHuf: 2000 }),
      ]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      checkInForDate: (date: string) => checkInRepo.checkIns().find((c) => !c.deleted && c.checkInDate === date) ?? null,
    };
    settingsRepo = {
      settings: signal<AycmSettings | null>({ id: 's1', linkedRecurringExpenseId: 'e1' }),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      linkExpense: jasmine.createSpy('linkExpense').and.resolveTo(undefined),
    };
    expenseRepo = {
      items: signal<RecurringExpense[]>([expense({ id: 'e1', amountHuf: 30000 })]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AycmDashboardPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AycmCheckInRepository, useValue: checkInRepo },
        { provide: AycmSettingsRepository, useValue: settingsRepo },
        { provide: RecurringExpenseRepository, useValue: expenseRepo },
        { provide: FeatureFlagsService, useValue: { isEnabled: () => financeEnabled } },
        {
          provide: ActionSheetController,
          useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => queryParam } } } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(AycmDashboardPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  beforeEach(() => {
    queryParam = null;
  });

  it('summarises the current calendar month', async () => {
    await setup(true);
    expect(component.visitCount()).toBe(2);
    expect(component.visitValueSumHuf()).toBe(5000);
  });

  it('computes worth-it as Σ − monthly pass cost when finance is on and a counting pass is linked', async () => {
    await setup(true);
    expect(component.passComputable()).toBe(true);
    expect(component.worthItHuf()).toBe(5000 - 30000);
    expect(component.linkedExpenseName()).toBe('AYCM pass');
    expect(component.linkedExpenseMonthlyHuf()).toBe(30000);
  });

  it('shows ~ for worth-it when the finance flag is off', async () => {
    await setup(false);
    expect(component.passComputable()).toBe(false);
    expect(component.worthItHuf()).toBeNull();
  });

  it('shows ~ for worth-it when the linked expense is paused (not counting)', async () => {
    await setup(true);
    expenseRepo.items.set([expense({ id: 'e1', active: false })]);
    expect(component.passComputable()).toBe(false);
    expect(component.worthItHuf()).toBeNull();
  });

  it('opens a plain Check-In create when today has no live row', async () => {
    await setup(true);
    checkInRepo.checkIns.set([]);
    const router = TestBed.inject(Router);
    component.openCheckIn();
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/menu/aycm/check-in'], {});
  });

  it('opens today\'s Check-In editor when today already has a live row', async () => {
    await setup(true);
    checkInRepo.checkIns.set([checkIn({ id: 't', checkInDate: today() })]);
    const router = TestBed.inject(Router);
    component.openCheckIn();
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/menu/aycm/check-in'], {
      queryParams: { date: today() },
    });
  });

  it('auto-links a freshly created expense from ?createdExpenseId and strips the param', async () => {
    queryParam = 'new-expense-id';
    await setup(true);
    expect(settingsRepo.linkExpense).toHaveBeenCalledWith('new-expense-id');
    const router = TestBed.inject(Router);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ replaceUrl: true, queryParams: {} }));
  });

  it('ignores ?createdExpenseId when the finance flag is off', async () => {
    queryParam = 'new-expense-id';
    await setup(false);
    expect(settingsRepo.linkExpense).not.toHaveBeenCalled();
  });
});

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
import { AycmPartner } from '../../../api/model/aycmPartner';
import { AycmSettings } from '../../../api/model/aycmSettings';
import { RecurringExpense } from '../../../api/model/recurringExpense';
import { AycmCheckInRepository } from '../../../core/data/aycm-check-in.repository';
import { AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { AycmSettingsRepository } from '../../../core/data/aycm-settings.repository';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { today } from '../../../shared/local-date';
import { windowRange } from './aycm-stats';
import { AycmStatsPage } from './aycm-stats.page';

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

describe('AycmStatsPage', () => {
  let fixture: ComponentFixture<AycmStatsPage>;
  let component: AycmStatsPage;
  let checkInRepo: {
    checkIns: ReturnType<typeof signal<AycmCheckIn[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    load: jasmine.Spy;
  };
  let partnerRepo: { partners: ReturnType<typeof signal<AycmPartner[]>>; loaded: ReturnType<typeof signal<boolean>>; load: jasmine.Spy };
  let settingsRepo: { settings: ReturnType<typeof signal<AycmSettings | null>>; loaded: ReturnType<typeof signal<boolean>>; load: jasmine.Spy };
  let expenseRepo: { items: ReturnType<typeof signal<RecurringExpense[]>>; loaded: ReturnType<typeof signal<boolean>>; load: jasmine.Spy };

  async function setup(financeEnabled: boolean): Promise<void> {
    const inWindow = windowRange('THIS_MONTH', today()).from;
    checkInRepo = {
      checkIns: signal<AycmCheckIn[]>([
        checkIn({ id: 'a', checkInDate: inWindow, visitValueHuf: 3000 }),
        checkIn({ id: 'b', checkInDate: inWindow, visitValueHuf: 2000 }),
      ]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
    };
    partnerRepo = {
      partners: signal<AycmPartner[]>([{ id: 'p1', name: 'Life1', notes: null, deleted: false }]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
    };
    settingsRepo = {
      settings: signal<AycmSettings | null>({ id: 's1', linkedRecurringExpenseId: 'e1' }),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
    };
    expenseRepo = {
      items: signal<RecurringExpense[]>([expense({ id: 'e1', amountHuf: 30000 })]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AycmStatsPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AycmCheckInRepository, useValue: checkInRepo },
        { provide: AycmPartnerRepository, useValue: partnerRepo },
        { provide: AycmSettingsRepository, useValue: settingsRepo },
        { provide: RecurringExpenseRepository, useValue: expenseRepo },
        { provide: FeatureFlagsService, useValue: { isEnabled: () => financeEnabled } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(AycmStatsPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('summarises the current month by default', async () => {
    await setup(true);
    expect(component.window()).toBe('THIS_MONTH');
    expect(component.summary()).toEqual({ visitCount: 2, visitValueSumHuf: 5000 });
    expect(component.breakdown().map((r) => [r.displayName, r.visitCount])).toEqual([['Life1', 2]]);
  });

  it('computes worth-it as Σ − monthly pass cost when the finance flag is on', async () => {
    await setup(true);
    expect(component.passComputable()).toBe(true);
    expect(component.worthItHuf()).toBe(5000 - 30000);
  });

  it('shows ~ (null) for worth-it when the finance flag is off', async () => {
    await setup(false);
    expect(component.passComputable()).toBe(false);
    expect(component.worthItHuf()).toBeNull();
  });

  it('switches the preset window', async () => {
    await setup(true);
    component.setWindow('PREV_MONTH');
    expect(component.window()).toBe('PREV_MONTH');
    // the sample rows are all in the current month → previous month is empty
    expect(component.summary().visitCount).toBe(0);
  });

  it('switches to the whole-year window and costs 12 months of pass', async () => {
    await setup(true);
    component.setWindow('THIS_YEAR');
    expect(component.window()).toBe('THIS_YEAR');
    // the sample rows sit in the current month, so they are inside the current year too
    expect(component.summary()).toEqual({ visitCount: 2, visitValueSumHuf: 5000 });
    expect(component.worthItHuf()).toBe(5000 - 30000 * 12);
  });

  it('opens the Check-In editor for a tapped visit date', async () => {
    await setup(true);
    const router = TestBed.inject(Router);
    component.openVisit('2026-08-10');
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/menu/aycm/check-in'], {
      queryParams: { date: '2026-08-10' },
    });
  });
});

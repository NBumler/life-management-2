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
    expect(component.summary()).toEqual({ visitCount: 2, visitValueSumHuf: 5000, coPaymentSumHuf: 1000 });
    expect(component.breakdown().map((r) => [r.displayName, r.visitCount])).toEqual([['Life1', 2]]);
  });

  it('sums the co-payment onto its own card and a per-visit average, never into worth-it', async () => {
    await setup(true);
    expect(component.summary().coPaymentSumHuf).toBe(1000);
    expect(component.coPaymentAvgHuf()).toBe(500);
    // worth-it is Σ visitValue − pass cost, the co-payment is not in it
    expect(component.worthItHuf()).toBe(5000 - 30000);
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
    expect(component.summary()).toEqual({ visitCount: 2, visitValueSumHuf: 5000, coPaymentSumHuf: 1000 });
    expect(component.worthItHuf()).toBe(5000 - 30000 * 12);
  });

  it('CUSTOM window filters to the picked range and derives the pass-cost months from its span', async () => {
    await setup(true);
    checkInRepo.checkIns.set([
      checkIn({ id: 'jan', checkInDate: '2026-01-10', visitValueHuf: 1000 }),
      checkIn({ id: 'feb', checkInDate: '2026-02-20', visitValueHuf: 4000 }),
      checkIn({ id: 'apr', checkInDate: '2026-04-01', visitValueHuf: 9000 }),
    ]);
    component.setWindow('CUSTOM');
    component.setCustomFrom('2026-01-01');
    component.setCustomTo('2026-02-28');
    expect(component.summary().visitCount).toBe(2);
    expect(component.summary().visitValueSumHuf).toBe(5000);
    // Jan + Feb = 2 whole months → 2 × 30000 pass cost
    expect(component.worthItHuf()).toBe(5000 - 30000 * 2);
  });

  it('flags a reversed CUSTOM range but still counts it (endpoints swap)', async () => {
    await setup(true);
    component.setWindow('CUSTOM');
    component.setCustomFrom('2026-03-31');
    component.setCustomTo('2026-01-01');
    expect(component.customRangeReversed()).toBe(true);
    expect(component.summary().visitCount).toBe(0); // sample rows are in the running month, not Q1 2026
  });

  it('ALL_TIME spans from the earliest Check-In and keeps rows outside the current month', async () => {
    await setup(true);
    checkInRepo.checkIns.set([
      checkIn({ id: 'old', checkInDate: '2025-11-05', visitValueHuf: 2000 }),
      checkIn({ id: 'recent', checkInDate: today(), visitValueHuf: 3000 }),
    ]);
    component.setWindow('ALL_TIME');
    expect(component.window()).toBe('ALL_TIME');
    expect(component.summary().visitCount).toBe(2);
    expect(component.summary().visitValueSumHuf).toBe(5000);
  });

  it('hides the monthly chart for a single-month window, shows it once the span is ≥ 2 months', async () => {
    await setup(true);
    expect(component.window()).toBe('THIS_MONTH');
    expect(component.showChart()).toBe(false);
    expect(component.chartBuckets().length).toBe(1);

    checkInRepo.checkIns.set([
      checkIn({ id: 'jan', checkInDate: '2026-01-10', visitValueHuf: 1000 }),
      checkIn({ id: 'mar', checkInDate: '2026-03-10', visitValueHuf: 4000 }),
    ]);
    component.setWindow('CUSTOM');
    component.setCustomFrom('2026-01-01');
    component.setCustomTo('2026-03-31');
    expect(component.showChart()).toBe(true);
    expect(component.chartBuckets().map((b) => [b.month, b.visitCount])).toEqual([
      ['2026-01', 1],
      ['2026-02', 0],
      ['2026-03', 1],
    ]);
    expect(component.chartMaxHuf()).toBe(4000);
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

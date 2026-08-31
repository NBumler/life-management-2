import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
import { AycmPartner } from '../../../api/model/aycmPartner';
import { AycmPriceRule } from '../../../api/model/aycmPriceRule';
import { AycmCheckInRepository } from '../../../core/data/aycm-check-in.repository';
import { AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { today } from '../../../shared/local-date';
import { AycmCheckInPage } from './aycm-check-in.page';

function rule(overrides: Partial<AycmPriceRule> = {}): AycmPriceRule {
  return {
    id: 'r1',
    partnerId: 'p1',
    label: 'Reggel',
    appliesMon: true,
    appliesTue: true,
    appliesWed: true,
    appliesThu: true,
    appliesFri: true,
    appliesSat: true,
    appliesSun: true,
    startTime: '06:00',
    endTime: '12:00',
    listPriceHuf: 2500,
    coPaymentHuf: 300,
    deleted: false,
    ...overrides,
  };
}

describe('AycmCheckInPage', () => {
  let fixture: ComponentFixture<AycmCheckInPage>;
  let component: AycmCheckInPage;
  let checkInRepo: {
    checkIns: ReturnType<typeof signal<AycmCheckIn[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    load: jasmine.Spy;
    save: jasmine.Spy;
    remove: jasmine.Spy;
    checkInForDate: (date: string) => AycmCheckIn | null;
  };
  let partnerRepo: {
    partners: ReturnType<typeof signal<AycmPartner[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    load: jasmine.Spy;
    loadRules: jasmine.Spy;
    rulesFor: (id: string) => AycmPriceRule[];
    priceRulesByPartner: ReturnType<typeof signal<Record<string, AycmPriceRule[]>>>;
  };

  async function setup(queryDate: string | null): Promise<void> {
    checkInRepo = {
      checkIns: signal<AycmCheckIn[]>([]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      save: jasmine.createSpy('save').and.resolveTo({} as AycmCheckIn),
      remove: jasmine.createSpy('remove').and.resolveTo(undefined),
      checkInForDate: (date: string) => checkInRepo.checkIns().find((c) => !c.deleted && c.checkInDate === date) ?? null,
    };
    partnerRepo = {
      partners: signal<AycmPartner[]>([{ id: 'p1', name: 'Life1', notes: null, deleted: false }]),
      loaded: signal(true),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      loadRules: jasmine.createSpy('loadRules').and.resolveTo([]),
      priceRulesByPartner: signal<Record<string, AycmPriceRule[]>>({ p1: [rule()] }),
      rulesFor: (id: string) => partnerRepo.priceRulesByPartner()[id] ?? [],
    };

    await TestBed.configureTestingModule({
      imports: [AycmCheckInPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AycmCheckInRepository, useValue: checkInRepo },
        { provide: AycmPartnerRepository, useValue: partnerRepo },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => queryDate } } },
        },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(AycmCheckInPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts a create for today when there is no row yet', async () => {
    await setup(null);
    expect(component.isEdit).toBe(false);
    expect(component.date()).toBe(today());
    expect(component.partnerId()).toBe('p1'); // single partner auto-selected
  });

  it('loads today\'s existing row into edit mode', async () => {
    const existing: AycmCheckIn = {
      id: 'c1',
      checkInDate: today(),
      checkInTime: '09:15',
      partnerId: 'p1',
      partnerName: 'Life1',
      ruleId: 'r1',
      ruleLabel: 'Reggel',
      listPriceHuf: 2500,
      coPaymentHuf: 300,
      visitValueHuf: 2500,
      notes: 'leg day',
      deleted: false,
    };
    await setup(null);
    checkInRepo.checkIns.set([existing]);
    await component.onDateChange(today());
    expect(component.isEdit).toBe(true);
    expect(component.editingId()).toBe('c1');
    expect(component.time()).toBe('09:15');
    expect(component.notes()).toBe('leg day');
  });

  it('assembles a matched snapshot (visitValue = listPrice, copay not added)', async () => {
    await setup(null);
    component.time.set('08:00');
    await component.save();
    const arg = checkInRepo.save.calls.mostRecent().args[0];
    expect(arg.ruleId).toBe('r1');
    expect(arg.ruleLabel).toBe('Reggel');
    expect(arg.listPriceHuf).toBe(2500);
    expect(arg.coPaymentHuf).toBe(300);
    expect(arg.visitValueHuf).toBe(2500);
  });

  it('assembles a zero snapshot when the time falls in a gap', async () => {
    await setup(null);
    component.time.set('20:00'); // rule covers 06:00–12:00
    await component.save();
    const arg = checkInRepo.save.calls.mostRecent().args[0];
    expect(arg.ruleId).toBeNull();
    expect(arg.ruleLabel).toBe('');
    expect(arg.listPriceHuf).toBe(0);
    expect(arg.visitValueHuf).toBe(0);
  });

  it('reuses the existing row id when saving onto a day that already has one', async () => {
    await setup(null);
    checkInRepo.checkIns.set([
      { id: 'other', checkInDate: today(), checkInTime: '10:00', partnerId: 'p1', partnerName: 'Life1', ruleLabel: '', listPriceHuf: 0, coPaymentHuf: 0, visitValueHuf: 0, deleted: false } as AycmCheckIn,
    ]);
    component.time.set('08:00');
    await component.save();
    expect(checkInRepo.save.calls.mostRecent().args[0].id).toBe('other');
  });
});

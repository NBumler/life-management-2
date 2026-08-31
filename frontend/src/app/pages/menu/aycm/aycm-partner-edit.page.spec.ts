import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AycmPartner } from '../../../api/model/aycmPartner';
import { AycmPriceRule } from '../../../api/model/aycmPriceRule';
import { AycmPartnerNameConflictError, AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { AycmPartnerEditPage } from './aycm-partner-edit.page';

function rule(overrides: Partial<AycmPriceRule> = {}): AycmPriceRule {
  return {
    id: 'r1',
    partnerId: 'p1',
    label: null,
    appliesMon: true,
    appliesTue: true,
    appliesWed: true,
    appliesThu: true,
    appliesFri: true,
    appliesSat: false,
    appliesSun: false,
    startTime: '08:00',
    endTime: '12:00',
    listPriceHuf: 2500,
    coPaymentHuf: 0,
    deleted: false,
    ...overrides,
  };
}

describe('AycmPartnerEditPage', () => {
  let fixture: ComponentFixture<AycmPartnerEditPage>;
  let component: AycmPartnerEditPage;
  let repository: {
    partners: ReturnType<typeof signal<AycmPartner[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    priceRulesByPartner: ReturnType<typeof signal<Record<string, AycmPriceRule[]>>>;
    load: jasmine.Spy;
    loadRules: jasmine.Spy;
    rulesFor: (id: string) => AycmPriceRule[];
    savePartner: jasmine.Spy;
    saveRule: jasmine.Spy;
  };

  async function setup(idParam: string): Promise<void> {
    repository = {
      partners: signal<AycmPartner[]>([{ id: 'p1', name: 'Life1', notes: null, deleted: false }]),
      loaded: signal(true),
      priceRulesByPartner: signal<Record<string, AycmPriceRule[]>>({ p1: [rule()] }),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      loadRules: jasmine.createSpy('loadRules').and.resolveTo([]),
      rulesFor: (id: string) => repository.priceRulesByPartner()[id] ?? [],
      savePartner: jasmine.createSpy('savePartner').and.resolveTo({ id: 'p1' }),
      saveRule: jasmine.createSpy('saveRule').and.resolveTo(rule()),
    };

    await TestBed.configureTestingModule({
      imports: [AycmPartnerEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AycmPartnerRepository, useValue: repository },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => idParam } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AycmPartnerEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('blocks an overlapping rule and does not call saveRule', async () => {
    await setup('p1');
    component.startNewRule();
    component.ruleForm.patchValue({ startTime: '11:00', endTime: '14:00', listPriceHuf: 1000 });
    await component.saveRule();
    expect(component.ruleError()).not.toBeNull();
    expect(repository.saveRule).not.toHaveBeenCalled();
  });

  it('blocks a rule with no weekday flag', async () => {
    await setup('p1');
    component.startNewRule();
    component.ruleForm.patchValue({
      appliesMon: false,
      appliesTue: false,
      appliesWed: false,
      appliesThu: false,
      appliesFri: false,
      appliesSat: false,
      appliesSun: false,
      startTime: '20:00',
      endTime: '22:00',
      listPriceHuf: 1000,
    });
    await component.saveRule();
    expect(component.ruleError()).not.toBeNull();
    expect(repository.saveRule).not.toHaveBeenCalled();
  });

  it('saves a non-overlapping adjacent rule', async () => {
    await setup('p1');
    component.startNewRule();
    component.ruleForm.patchValue({ startTime: '12:00', endTime: '16:00', listPriceHuf: 1000 });
    await component.saveRule();
    expect(component.ruleError()).toBeNull();
    expect(repository.saveRule).toHaveBeenCalled();
  });

  it('surfaces a name conflict from the repository', async () => {
    await setup('new');
    repository.savePartner.and.rejectWith(new AycmPartnerNameConflictError('other-id'));
    component.partnerForm.setValue({ name: 'Life1', notes: '' });
    await component.savePartner();
    expect(component.nameError()).not.toBeNull();
  });
});

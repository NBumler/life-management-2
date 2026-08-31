import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AycmPartner } from '../../../api/model/aycmPartner';
import { AycmPriceRule } from '../../../api/model/aycmPriceRule';
import { AycmPartnerRepository } from '../../../core/data/aycm-partner.repository';
import { AycmPartnerListPage } from './aycm-partner-list.page';

function partner(overrides: Partial<AycmPartner> = {}): AycmPartner {
  return { id: 'p1', name: 'Life1', notes: null, deleted: false, ...overrides };
}

describe('AycmPartnerListPage', () => {
  let fixture: ComponentFixture<AycmPartnerListPage>;
  let component: AycmPartnerListPage;
  let repository: {
    partners: ReturnType<typeof signal<AycmPartner[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
    priceRulesByPartner: ReturnType<typeof signal<Record<string, AycmPriceRule[]>>>;
    load: jasmine.Spy;
    loadRules: jasmine.Spy;
    rulesFor: (id: string) => AycmPriceRule[];
    deletePartner: jasmine.Spy;
  };

  beforeEach(async () => {
    repository = {
      partners: signal<AycmPartner[]>([]),
      loaded: signal(true),
      priceRulesByPartner: signal<Record<string, AycmPriceRule[]>>({}),
      load: jasmine.createSpy('load').and.resolveTo(undefined),
      loadRules: jasmine.createSpy('loadRules').and.resolveTo([]),
      rulesFor: (id: string) => repository.priceRulesByPartner()[id] ?? [],
      deletePartner: jasmine.createSpy('deletePartner').and.resolveTo(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AycmPartnerListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AycmPartnerRepository, useValue: repository },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AycmPartnerListPage);
    component = fixture.componentInstance;
  });

  it('filters out deleted partners and sorts by name', () => {
    repository.partners.set([
      partner({ id: 'b', name: 'Bravo' }),
      partner({ id: 'a', name: 'Alpha' }),
      partner({ id: 'x', name: 'Gone', deleted: true }),
    ]);
    expect(component.partners().map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('matches the search against name and notes', () => {
    repository.partners.set([
      partner({ id: 'a', name: 'Alpha', notes: 'downtown' }),
      partner({ id: 'b', name: 'Bravo', notes: null }),
    ]);
    component.query.set('downtown');
    expect(component.partners().map((p) => p.id)).toEqual(['a']);
  });

  it('reports global vs filtered empty distinctly', () => {
    expect(component.isGlobalEmpty()).toBe(true);
    repository.partners.set([partner({ id: 'a', name: 'Alpha' })]);
    component.query.set('nope');
    expect(component.isGlobalEmpty()).toBe(false);
    expect(component.isFilteredEmpty()).toBe(true);
  });

  it('counts only live price rules of a partner', () => {
    repository.partners.set([partner({ id: 'a', name: 'Alpha' })]);
    repository.priceRulesByPartner.set({
      a: [
        { id: 'r1', partnerId: 'a', deleted: false } as AycmPriceRule,
        { id: 'r2', partnerId: 'a', deleted: true } as AycmPriceRule,
      ],
    });
    expect(component.liveRuleCount('a')).toBe(1);
  });
});

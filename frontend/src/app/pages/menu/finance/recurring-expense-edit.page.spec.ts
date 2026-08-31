import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { RecurringExpense } from '../../../api/model/recurringExpense';
import { RecurringExpenseRepository, RecurringExpenseSaveInput } from '../../../core/data/recurring-expense.repository';
import { RecurringExpenseEditPage } from './recurring-expense-edit.page';

function row(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'e1',
    name: 'Netflix',
    amountHuf: 4990,
    frequency: RecurringExpense.FrequencyEnum.Monthly,
    category: RecurringExpense.CategoryEnum.Entertainment,
    nextBillingDate: '2026-09-30',
    billingDayOfMonth: 31,
    active: true,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

describe('RecurringExpenseEditPage', () => {
  let fixture: ComponentFixture<RecurringExpenseEditPage>;
  let component: RecurringExpenseEditPage;
  let saveSpy: jasmine.Spy<(input: RecurringExpenseSaveInput) => Promise<RecurringExpense>>;
  let items: RecurringExpense[];

  async function setup(idParam = 'new', returnTo: string | null = null): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.resolveTo(row());
    await TestBed.configureTestingModule({
      imports: [RecurringExpenseEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: RecurringExpenseRepository,
          useValue: {
            load: () => Promise.resolve(),
            loaded: signal(true),
            items: signal(items),
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: idParam }),
              queryParamMap: convertToParamMap(returnTo === null ? {} : { returnTo }),
            },
          },
        },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(RecurringExpenseEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  beforeEach(() => {
    items = [];
  });

  it('save() does nothing while a required field is missing', async () => {
    await setup();
    component.form.patchValue({ name: 'Spotify', amountHuf: null });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();

    component.form.patchValue({ name: '', amountHuf: 1990 });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('on create, billingDayOfMonth is the chosen date\'s day', async () => {
    await setup();
    component.form.patchValue({
      name: 'Gym',
      amountHuf: 12000,
      nextBillingDate: '2026-10-05',
      frequency: RecurringExpense.FrequencyEnum.Monthly,
    });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Gym', amountHuf: 12000, nextBillingDate: '2026-10-05', billingDayOfMonth: 5 }),
    );
  });

  it('on edit, an unchanged date keeps the stored billingDayOfMonth (e.g. 31)', async () => {
    items = [row({ id: 'e1', nextBillingDate: '2026-09-30', billingDayOfMonth: 31 })];
    await setup('e1');
    expect(component.isEdit).toBe(true);
    component.form.patchValue({ amountHuf: 5990 });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'e1', billingDayOfMonth: 31, amountHuf: 5990 }));
  });

  it('on edit, a manual date change overrides billingDayOfMonth to the new day', async () => {
    items = [row({ id: 'e1', nextBillingDate: '2026-09-30', billingDayOfMonth: 31 })];
    await setup('e1');
    component.form.patchValue({ nextBillingDate: '2026-10-15' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: 'e1', nextBillingDate: '2026-10-15', billingDayOfMonth: 15 }),
    );
  });

  it('trims notes to null when blank', async () => {
    await setup();
    component.form.patchValue({ name: 'Insurance', amountHuf: 30000, notes: '   ' });
    await component.save();
    expect(saveSpy).toHaveBeenCalledWith(jasmine.objectContaining({ notes: null }));
  });

  it('with ?returnTo, a successful create navigates there handing back the new id', async () => {
    await setup('new', '/tabs/menu/aycm');
    saveSpy.and.resolveTo(row({ id: 'brand-new' }));
    component.form.patchValue({ name: 'Gym', amountHuf: 12000, nextBillingDate: '2026-10-05' });
    await component.save();
    const router = TestBed.inject(Router);
    expect(router.navigate).toHaveBeenCalledWith(['/tabs/menu/aycm'], {
      queryParams: { createdExpenseId: 'brand-new' },
    });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('without ?returnTo, a successful create falls back to the list', async () => {
    await setup('new');
    component.form.patchValue({ name: 'Gym', amountHuf: 12000, nextBillingDate: '2026-10-05' });
    await component.save();
    const router = TestBed.inject(Router);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tabs/menu/finance/recurring-expenses');
  });
});

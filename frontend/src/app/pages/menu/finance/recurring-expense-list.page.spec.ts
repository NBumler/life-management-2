import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { RecurringExpense } from '../../../api/model/recurringExpense';
import { RecurringExpenseRepository } from '../../../core/data/recurring-expense.repository';
import { today } from '../../../shared/local-date';
import { RecurringExpenseListPage } from './recurring-expense-list.page';

function allRowIds(page: RecurringExpenseListPage): string[] {
  const ids: string[] = [];
  for (const group of page.groups()) {
    for (const row of group.rows) {
      ids.push(row.id);
    }
  }
  return ids;
}

function row(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'e1',
    name: 'Netflix',
    amountHuf: 4990,
    frequency: RecurringExpense.FrequencyEnum.Monthly,
    category: RecurringExpense.CategoryEnum.Entertainment,
    nextBillingDate: today(),
    billingDayOfMonth: 10,
    active: true,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

describe('RecurringExpenseListPage', () => {
  let fixture: ComponentFixture<RecurringExpenseListPage>;
  let component: RecurringExpenseListPage;
  let repository: jasmine.SpyObj<Pick<RecurringExpenseRepository, 'load'>> & {
    items: ReturnType<typeof signal<RecurringExpense[]>>;
    loaded: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    repository = jasmine.createSpyObj('RecurringExpenseRepository', ['load']) as never;
    repository.items = signal<RecurringExpense[]>([]);
    repository.loaded = signal(true);

    await TestBed.configureTestingModule({
      imports: [RecurringExpenseListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: RecurringExpenseRepository, useValue: repository },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecurringExpenseListPage);
    component = fixture.componentInstance;
  });

  it('isGlobalEmpty is true only when there are no live rows at all', () => {
    expect(component.isGlobalEmpty()).toBe(true);
    repository.items.set([row()]);
    expect(component.isGlobalEmpty()).toBe(false);
  });

  it('isFilteredEmpty is distinct from the global empty state', () => {
    repository.items.set([row({ name: 'Netflix' })]);
    component.query.set('nothing-matches');
    expect(component.isFilteredEmpty()).toBe(true);
    expect(component.isGlobalEmpty()).toBe(false);
  });

  it('searches both name and notes', () => {
    repository.items.set([row({ id: 'a', name: 'Alfa', notes: 'kulcsszó' })]);
    component.query.set('kulcsszó');
    expect(allRowIds(component)).toEqual(['a']);
  });

  it('category chips are an OR union — deselecting one hides its rows', () => {
    repository.items.set([
      row({ id: 'a', category: RecurringExpense.CategoryEnum.Entertainment }),
      row({ id: 'b', category: RecurringExpense.CategoryEnum.Sport }),
    ]);
    expect(allRowIds(component).sort()).toEqual(['a', 'b']);

    component.toggleCategory(RecurringExpense.CategoryEnum.Sport);
    expect(allRowIds(component)).toEqual(['a']);
  });

  it('groups rows into Overdue / Today / Later / Paused sections', () => {
    repository.items.set([
      row({ id: 'past', nextBillingDate: '2000-01-01' }),
      row({ id: 'today', nextBillingDate: today() }),
      row({ id: 'future', nextBillingDate: '2999-01-01' }),
      row({ id: 'paused', active: false, nextBillingDate: '2000-01-01' }),
    ]);
    const groups = component.groups();
    const sectionOf = (id: string) => groups.find((g) => g.rows.some((r) => r.id === id))?.section;
    expect(sectionOf('past')).toBe('OVERDUE');
    expect(sectionOf('today')).toBe('TODAY');
    expect(sectionOf('future')).toBe('LATER');
    expect(sectionOf('paused')).toBe('PAUSED');
  });
});

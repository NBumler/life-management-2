import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { LifePlan } from '../../../api/model/lifePlan';
import { LifePlanRepository } from '../../../core/data/life-plan.repository';
import { LifePlanListPage } from './life-plan-list.page';

function plan(overrides: Partial<LifePlan> = {}): LifePlan {
  return { id: 'p1', title: 'Motoros jogosítvány', notes: null, status: LifePlan.StatusEnum.Planned, targetDate: null, completedAt: null, deleted: false, ...overrides };
}

describe('LifePlanListPage', () => {
  let fixture: ComponentFixture<LifePlanListPage>;
  let repository: jasmine.SpyObj<Pick<LifePlanRepository, 'load'>> & { items: ReturnType<typeof signal<LifePlan[]>> };

  beforeEach(async () => {
    repository = jasmine.createSpyObj('LifePlanRepository', ['load']) as never;
    repository.items = signal<LifePlan[]>([]);

    await TestBed.configureTestingModule({
      imports: [LifePlanListPage],
      providers: [provideRouter([]), provideTranslateService(), { provide: LifePlanRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(LifePlanListPage);
  });

  it('isEmpty(): true only when there are no live plans at all', () => {
    expect(fixture.componentInstance.isEmpty()).toBe(true);
    repository.items.set([plan()]);
    expect(fixture.componentInstance.isEmpty()).toBe(false);
  });

  it('hasNoResults(): true when a search filters out every plan, distinct from the global empty state', () => {
    repository.items.set([plan({ title: 'Motoros jogosítvány' })]);
    fixture.componentInstance.query.set('teljesen-más');

    expect(fixture.componentInstance.hasNoResults()).toBe(true);
    expect(fixture.componentInstance.isEmpty()).toBe(false);
  });

  it('searches both title and notes', () => {
    repository.items.set([plan({ id: 'a', title: 'Alfa', notes: 'kulcsszó' })]);
    fixture.componentInstance.query.set('kulcsszó');

    expect(fixture.componentInstance.sections().planned.map((p) => p.id)).toEqual(['a']);
  });

  it('groups plans into sections by status', () => {
    repository.items.set([
      plan({ id: 'a', status: LifePlan.StatusEnum.Planned }),
      plan({ id: 'b', status: LifePlan.StatusEnum.InProgress }),
      plan({ id: 'c', status: LifePlan.StatusEnum.Done, completedAt: '2026-01-01T00:00:00Z' }),
    ]);

    const sections = fixture.componentInstance.sections();

    expect(sections.planned.map((p) => p.id)).toEqual(['a']);
    expect(sections.inProgress.map((p) => p.id)).toEqual(['b']);
    expect(sections.done.map((p) => p.id)).toEqual(['c']);
  });
});

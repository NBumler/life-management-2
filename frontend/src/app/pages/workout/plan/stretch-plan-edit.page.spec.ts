import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { StretchExercise } from '../../../api/model/stretchExercise';
import { StretchPlan } from '../../../api/model/stretchPlan';
import { StretchPlanItem } from '../../../api/model/stretchPlanItem';
import { StretchPlanRepository } from '../../../core/data/stretch-plan.repository';
import { StretchPlanEditPage } from './stretch-plan-edit.page';

function stretch(id: string, overrides: Partial<StretchExercise> = {}): StretchExercise {
  return {
    id,
    name: id,
    category: StretchExercise.CategoryEnum.Hips,
    isFavorite: false,
    defaultHoldSeconds: 45,
    defaultPerSide: true,
    deleted: false,
    ...overrides,
  };
}

const existing: StretchPlan = {
  id: 'p1',
  name: 'Esti',
  active: false,
  goalLabel: 'Regeneráció',
  deleted: false,
  items: [
    {
      id: 'i2',
      planId: 'p1',
      stretchExerciseId: 'e2',
      stretchName: 'Vádli',
      stretchCategory: StretchPlanItem.StretchCategoryEnum.Legs,
      orderIndex: 1,
      holdSeconds: 20,
      perSide: false,
      repetitions: 3,
      notes: null,
      deleted: false,
    },
    {
      id: 'i1',
      planId: 'p1',
      stretchExerciseId: 'e1',
      stretchName: 'Csípő',
      stretchCategory: StretchPlanItem.StretchCategoryEnum.Hips,
      orderIndex: 0,
      holdSeconds: 30,
      perSide: true,
      repetitions: 1,
      notes: 'lassan',
      deleted: false,
    },
  ],
};

describe('StretchPlanEditPage (backlog/168)', () => {
  let fixture: ComponentFixture<StretchPlanEditPage>;
  let repository: { load: jasmine.Spy; save: jasmine.Spy; remove: jasmine.Spy; byId: (id: string) => StretchPlan | undefined; items: ReturnType<typeof signal<StretchPlan[]>> };
  let navController: jasmine.SpyObj<Pick<NavController, 'navigateBack'>>;

  async function create(routeId: string): Promise<StretchPlanEditPage> {
    repository = {
      load: jasmine.createSpy('load').and.resolveTo(),
      save: jasmine.createSpy('save').and.callFake(async (draft) => ({ ...existing, id: draft.id || 'new-id' })),
      remove: jasmine.createSpy('remove').and.resolveTo(),
      byId: (id: string) => (id === 'p1' ? existing : undefined),
      items: signal([existing]),
    };
    navController = jasmine.createSpyObj('NavController', ['navigateBack']);
    navController.navigateBack.and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [StretchPlanEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: StretchPlanRepository, useValue: repository },
        { provide: NavController, useValue: navController },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(StretchPlanEditPage);
    await fixture.componentInstance.ngOnInit();
    return fixture.componentInstance;
  }

  it('edit: loads the live items in order and keeps the plan\'s active flag on save', async () => {
    const page = await create('p1');

    expect(page.items().map((row) => row.stretchName)).toEqual(['Csípő', 'Vádli']);
    await page.save();

    const draft = repository.save.calls.mostRecent().args[0];
    expect(draft).toEqual(
      jasmine.objectContaining({ id: 'p1', name: 'Esti', active: false, goalLabel: 'Regeneráció' }),
    );
    expect(draft.items.map((item: { id: string; orderIndex: number }) => [item.id, item.orderIndex])).toEqual([
      ['i1', 0],
      ['i2', 1],
    ]);
    expect(navController.navigateBack).toHaveBeenCalledWith('/tabs/workout/weekly-plan/plans');
  });

  it('a picked stretch is prefilled from the exercise defaults (hold, per side), 1 repetition', async () => {
    const page = await create('new');

    page.onPicked([stretch('e9', { name: 'Nyak', defaultHoldSeconds: 60, defaultPerSide: true })]);

    const row = page.items()[0];
    expect([row.stretchName, row.holdSeconds(), row.perSide(), row.repetitions()]).toEqual(['Nyak', 60, true, 1]);
  });

  it('the total time follows the items, and a 0 s hold blocks the save', async () => {
    const page = await create('p1');
    // Csípő: 2 × 30 s, Vádli: 3 × 20 s → 120 s holds + 5 transitions × 5 s = 145 s → ~3 min
    expect(page.totalMinutes()).toBe(3);

    page.items()[0].holdSeconds.set(0);
    expect(page.hasItemErrors()).toBeTrue();
    await page.save();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('moving and removing items reorders the saved list', async () => {
    const page = await create('p1');

    page.moveItem(page.items()[0], 1);
    expect(page.items().map((row) => row.id)).toEqual(['i2', 'i1']);
    page.removeItem(page.items()[0]);
    expect(page.buildDraft().items.map((item) => [item.id, item.orderIndex])).toEqual([['i1', 0]]);
  });
});

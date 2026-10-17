import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { StretchPlan } from '../../../api/model/stretchPlan';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { StretchPlanRepository } from '../../../core/data/stretch-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { PlanListPage } from './plan-list.page';

const strength = (id: string, goalLabel: string | null, active = true) =>
  ({ id, name: id, goalLabel, active, inRotation: true, deleted: false, exercises: [] }) as unknown as WorkoutPlan;
const stretch = (id: string, goalLabel: string | null, active = true): StretchPlan => ({ id, name: id, goalLabel, active, deleted: false, items: [] });

describe('PlanListPage (backlog/168)', () => {
  let fixture: ComponentFixture<PlanListPage>;
  let strengthRepo: { load: jasmine.Spy; setActive: jasmine.Spy; loaded: ReturnType<typeof signal<boolean>>; items: ReturnType<typeof signal<WorkoutPlan[]>> };
  let stretchRepo: { load: jasmine.Spy; setActive: jasmine.Spy; items: ReturnType<typeof signal<StretchPlan[]>> };
  let stretchFlag: boolean;

  async function create(): Promise<PlanListPage> {
    strengthRepo = {
      load: jasmine.createSpy('load').and.resolveTo(),
      setActive: jasmine.createSpy('setActive').and.resolveTo(),
      loaded: signal(true),
      items: signal([strength('A', 'OAPU'), strength('B', null, false)]),
    };
    stretchRepo = {
      load: jasmine.createSpy('load').and.resolveTo(),
      setActive: jasmine.createSpy('setActive').and.resolveTo(),
      items: signal([stretch('S', 'OAPU', false), stretch('T', null)]),
    };
    await TestBed.configureTestingModule({
      imports: [PlanListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WorkoutPlanRepository, useValue: strengthRepo },
        { provide: StretchPlanRepository, useValue: stretchRepo },
        { provide: FeatureFlagsService, useValue: { isEnabled: (key: string) => key !== 'edzes.nyujtas' || stretchFlag } },
        { provide: NavController, useValue: jasmine.createSpyObj('NavController', ['navigateForward']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlanListPage);
    return fixture.componentInstance;
  }

  const rows = (page: PlanListPage): string[] =>
    ([] as string[]).concat(...page.groups().map((group) => group.entries.map((entry) => `${entry.type}:${entry.plan.id}`)));

  beforeEach(() => {
    stretchFlag = true;
  });

  it('lists both types, shares the goalLabel groups and filters by active state and type chip', async () => {
    const page = await create();
    page.setFilter('ALL');
    expect(page.groups()[0]).toEqual(jasmine.objectContaining({ label: 'OAPU' }));
    expect(rows(page)).toEqual(['STRENGTH:A', 'STRETCH:S', 'STRENGTH:B', 'STRETCH:T']);

    page.setFilter('ACTIVE');
    expect(rows(page)).toEqual(['STRENGTH:A', 'STRETCH:T']);

    page.toggleType('STRETCH');
    expect(rows(page)).toEqual(['STRETCH:T']);
  });

  it('the row toggle and the group switch save each template through its own repository', async () => {
    const page = await create();

    await page.toggleActive({ type: 'STRETCH', plan: stretch('T', null) }, false);
    expect(stretchRepo.setActive).toHaveBeenCalledTimes(1);

    await page.applyGroupActivation('OAPU', 'ACTIVATE');
    expect(stretchRepo.setActive.calls.mostRecent().args).toEqual([jasmine.objectContaining({ id: 'S' }), true]);
    expect(strengthRepo.setActive).not.toHaveBeenCalled();
  });

  it('rowLink(): stretching templates open stretch/:id', async () => {
    const page = await create();
    expect(page.rowLink({ type: 'STRETCH', plan: stretch('S', null) })).toEqual(['stretch', 'S']);
    expect(page.rowLink({ type: 'STRENGTH', plan: strength('A', null) })).toEqual(['A']);
  });

  it('with edzes.nyujtas off: no stretching rows and the stretching catalog is never loaded', async () => {
    stretchFlag = false;
    const page = await create();
    page.setFilter('ALL');
    await page.ngOnInit();

    expect(rows(page)).toEqual(['STRENGTH:A', 'STRENGTH:B']);
    expect(stretchRepo.load).not.toHaveBeenCalled();
  });
});

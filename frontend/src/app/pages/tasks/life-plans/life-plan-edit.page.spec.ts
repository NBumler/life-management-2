import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { LifePlan } from '../../../api/model/lifePlan';
import { LifePlanRepository } from '../../../core/data/life-plan.repository';
import { LifePlanEditPage } from './life-plan-edit.page';

function plan(overrides: Partial<LifePlan> = {}): LifePlan {
  return { id: 'p1', title: 'Motoros jogosítvány', notes: null, status: LifePlan.StatusEnum.Planned, targetDate: null, completedAt: null, deleted: false, ...overrides };
}

describe('LifePlanEditPage', () => {
  let fixture: ComponentFixture<LifePlanEditPage>;
  let repository: jasmine.SpyObj<Pick<LifePlanRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<LifePlan[]>>;
  };

  async function createFixture(routeId: string): Promise<void> {
    repository = jasmine.createSpyObj('LifePlanRepository', ['load', 'save', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<LifePlan[]>([]);

    await TestBed.configureTestingModule({
      imports: [LifePlanEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: LifePlanRepository, useValue: repository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LifePlanEditPage);
  }

  it('create mode: defaults status to PLANNED and leaves planId null', async () => {
    await createFixture('new');

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.planId()).toBeNull();
    expect(fixture.componentInstance.form.controls.status.value).toBe(LifePlan.StatusEnum.Planned);
  });

  it('edit mode: patches the form from the already-loaded repository item', async () => {
    await createFixture('p1');
    repository.items.set([plan({ id: 'p1', title: 'Rope-solo', status: LifePlan.StatusEnum.InProgress, targetDate: '2026-12-01' })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.planId()).toBe('p1');
    expect(fixture.componentInstance.form.controls.title.value).toBe('Rope-solo');
    expect(fixture.componentInstance.form.controls.status.value).toBe(LifePlan.StatusEnum.InProgress);
    expect(fixture.componentInstance.form.controls.targetDate.value).toBe('2026-12-01');
  });

  it('save(): persists the form and navigates back to the list', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    repository.save.and.resolveTo(plan({ id: 'new-1' }));
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.setValue({ title: 'Maraton', status: LifePlan.StatusEnum.Planned, targetDate: null, notes: null });

    await fixture.componentInstance.save();

    expect(repository.save).toHaveBeenCalledWith({ id: undefined, title: 'Maraton', status: LifePlan.StatusEnum.Planned, targetDate: null, notes: null });
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/tasks/life-plans');
  });

  it('delete(): the confirmation handler removes the plan via the repository and navigates back', async () => {
    await createFixture('p1');
    repository.items.set([plan({ id: 'p1' })]);
    await fixture.componentInstance.ngOnInit();
    repository.remove.and.resolveTo();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('p1');
  });
});

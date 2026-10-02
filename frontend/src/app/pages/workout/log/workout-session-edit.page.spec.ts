import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NavController, PopoverController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { WorkoutSession } from '../../../api/model/workoutSession';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { WorkoutSessionEditPage } from './workout-session-edit.page';

describe('WorkoutSessionEditPage', () => {
  let repository: {
    load: jasmine.Spy;
    byId: jasmine.Spy;
    save: jasmine.Spy;
    remove: jasmine.Spy;
    items: ReturnType<typeof signal<WorkoutSession[]>>;
  };
  let back: jasmine.Spy;

  async function setup(idParam: string): Promise<WorkoutSessionEditPage> {
    repository = {
      load: jasmine.createSpy('load').and.resolveTo(),
      byId: jasmine.createSpy('byId').and.returnValue(undefined),
      save: jasmine.createSpy('save').and.callFake((draft: { id: string }) => Promise.resolve({ id: draft.id } as WorkoutSession)),
      remove: jasmine.createSpy('remove').and.resolveTo(),
      items: signal<WorkoutSession[]>([]),
    };
    await TestBed.configureTestingModule({
      imports: [WorkoutSessionEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WorkoutSessionRepository, useValue: repository },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal(null) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
      ],
    })
      .overrideComponent(WorkoutSessionEditPage, { set: { providers: [{ provide: PopoverController, useValue: {} }] } })
      .compileComponents();
    back = spyOn(TestBed.inject(NavController), 'navigateBack').and.resolveTo(true);
    const component = TestBed.createComponent(WorkoutSessionEditPage).componentInstance;
    await component.ngOnInit();
    return component;
  }

  it('save() leaves the form with navigateBack, so the "new" page is popped off the stack (backlog/148)', async () => {
    const component = await setup('new');

    await component.save();

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledOnceWith('/tabs/workout/log');
  });

  it('a stale id no longer in the repository redirects back to the log', async () => {
    await setup('gone');

    expect(back).toHaveBeenCalledOnceWith('/tabs/workout/log');
  });
});

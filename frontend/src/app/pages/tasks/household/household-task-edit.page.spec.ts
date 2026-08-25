import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskNameConflictError, HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { HouseholdTaskEditPage } from './household-task-edit.page';

function room(overrides: Partial<HouseholdRoom> = {}): HouseholdRoom {
  return { id: 'r1', name: 'Konyha', sortOrder: 0, deleted: false, ...overrides };
}

function task(overrides: Partial<HouseholdTask> = {}): HouseholdTask {
  return {
    id: 't1',
    roomId: 'r1',
    name: 'Mosogatás',
    energyLevel: HouseholdTask.EnergyLevelEnum.Low,
    estimatedMinutes: 10,
    intervalDays: 7,
    nextDue: '2026-06-01',
    lastCompletedAt: null,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

describe('HouseholdTaskEditPage', () => {
  let fixture: ComponentFixture<HouseholdTaskEditPage>;
  let taskRepository: jasmine.SpyObj<Pick<HouseholdTaskRepository, 'load' | 'save' | 'remove'>> & {
    items: ReturnType<typeof signal<HouseholdTask[]>>;
  };
  let roomRepository: jasmine.SpyObj<Pick<HouseholdRoomRepository, 'load' | 'save'>> & { items: ReturnType<typeof signal<HouseholdRoom[]>> };

  async function createFixture(routeId: string): Promise<void> {
    taskRepository = jasmine.createSpyObj('HouseholdTaskRepository', ['load', 'save', 'remove']) as never;
    taskRepository.items = signal<HouseholdTask[]>([]);
    roomRepository = jasmine.createSpyObj('HouseholdRoomRepository', ['load', 'save']) as never;
    roomRepository.items = signal<HouseholdRoom[]>([room({ id: 'r1' }), room({ id: 'r2', name: 'Fürdő' })]);

    await TestBed.configureTestingModule({
      imports: [HouseholdTaskEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: routeId }) } } },
        { provide: HouseholdTaskRepository, useValue: taskRepository },
        { provide: HouseholdRoomRepository, useValue: roomRepository },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdTaskEditPage);
  }

  it('create mode: requires at least one selected room', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    fixture.componentInstance.form.patchValue({ name: 'Porszívózás' });

    await fixture.componentInstance.save();

    expect(taskRepository.save).not.toHaveBeenCalled();
    expect(fixture.componentInstance.roomSelectionError()).not.toBeNull();
  });

  it('create mode: creates one independent task per selected room', async () => {
    await createFixture('new');
    await fixture.componentInstance.ngOnInit();
    taskRepository.save.and.resolveTo(task());
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance.form.patchValue({ name: 'Porszívózás' });
    fixture.componentInstance.toggleRoom('r1');
    fixture.componentInstance.toggleRoom('r2');

    await fixture.componentInstance.save();

    expect(taskRepository.save).toHaveBeenCalledTimes(2);
    expect(taskRepository.save).toHaveBeenCalledWith(jasmine.objectContaining({ roomId: 'r1', name: 'Porszívózás' }));
    expect(taskRepository.save).toHaveBeenCalledWith(jasmine.objectContaining({ roomId: 'r2', name: 'Porszívózás' }));
    expect(navigateSpy).toHaveBeenCalledWith('/tabs/tasks/household');
  });

  it(
    'create mode: "az a helyiség hibás, a többi létrejöhet" — a per-room name conflict does not stop the other rooms\' creates',
    async () => {
      await createFixture('new');
      await fixture.componentInstance.ngOnInit();
      taskRepository.save.and.callFake(async (input) => {
        if (input.roomId === 'r1') {
          throw new HouseholdTaskNameConflictError('existing-id');
        }
        return task({ roomId: input.roomId });
      });
      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
      fixture.componentInstance.form.patchValue({ name: 'Porszívózás' });
      fixture.componentInstance.toggleRoom('r1');
      fixture.componentInstance.toggleRoom('r2');

      await fixture.componentInstance.save();

      expect(taskRepository.save).toHaveBeenCalledTimes(2);
      expect(navigateSpy).not.toHaveBeenCalled();
      // provideTranslateService() has no translations loaded in tests, so translate.instant() just
      // echoes the key back untranslated (this codebase's established testing convention) — assert
      // on the composed key, not interpolated text.
      expect(fixture.componentInstance.roomSelectionError()).toContain('TASKS.HOUSEHOLD.TASK_NAME_CONFLICT_ROOMS');
    },
  );

  it('edit mode: patches the form from the already-loaded repository item', async () => {
    await createFixture('t1');
    taskRepository.items.set([task({ id: 't1', name: 'Porszívózás', roomId: 'r2', lastCompletedAt: '2026-01-01T00:00:00Z' })]);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.taskId()).toBe('t1');
    expect(fixture.componentInstance.form.controls.name.value).toBe('Porszívózás');
    expect(fixture.componentInstance.form.controls.roomId.value).toBe('r2');
  });

  it('edit mode: save() preserves the existing lastCompletedAt (not exposed in the form)', async () => {
    await createFixture('t1');
    taskRepository.items.set([task({ id: 't1', lastCompletedAt: '2026-01-01T00:00:00Z' })]);
    await fixture.componentInstance.ngOnInit();
    taskRepository.save.and.resolveTo(task());
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    await fixture.componentInstance.save();

    expect(taskRepository.save).toHaveBeenCalledWith(jasmine.objectContaining({ id: 't1', lastCompletedAt: '2026-01-01T00:00:00Z' }));
  });

  it('delete(): the confirmation handler removes the task via the repository', async () => {
    await createFixture('t1');
    taskRepository.items.set([task({ id: 't1' })]);
    await fixture.componentInstance.ngOnInit();
    taskRepository.remove.and.resolveTo();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete();
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(taskRepository.remove).toHaveBeenCalledWith('t1');
  });
});

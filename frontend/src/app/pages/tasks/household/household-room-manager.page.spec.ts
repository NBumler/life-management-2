import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { HouseholdRoomManagerPage } from './household-room-manager.page';

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

describe('HouseholdRoomManagerPage', () => {
  let fixture: ComponentFixture<HouseholdRoomManagerPage>;
  let roomRepository: jasmine.SpyObj<Pick<HouseholdRoomRepository, 'load' | 'save' | 'remove' | 'reorder'>> & {
    items: ReturnType<typeof signal<HouseholdRoom[]>>;
  };
  let taskRepository: jasmine.SpyObj<Pick<HouseholdTaskRepository, 'load'>> & { items: ReturnType<typeof signal<HouseholdTask[]>> };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    roomRepository = jasmine.createSpyObj('HouseholdRoomRepository', ['load', 'save', 'remove', 'reorder']) as never;
    roomRepository.items = signal<HouseholdRoom[]>([]);
    taskRepository = jasmine.createSpyObj('HouseholdTaskRepository', ['load']) as never;
    taskRepository.items = signal<HouseholdTask[]>([]);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [HouseholdRoomManagerPage],
      providers: [
        provideTranslateService(),
        { provide: HouseholdRoomRepository, useValue: roomRepository },
        { provide: HouseholdTaskRepository, useValue: taskRepository },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdRoomManagerPage);
  });

  it('rooms(): sorted by sortOrder', () => {
    roomRepository.items.set([room({ id: 'b', sortOrder: 1 }), room({ id: 'a', sortOrder: 0 })]);

    expect(fixture.componentInstance.rooms().map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('moveDown(): swaps sortOrder with the next room and persists both', async () => {
    roomRepository.items.set([room({ id: 'a', sortOrder: 0 }), room({ id: 'b', sortOrder: 1 })]);
    roomRepository.reorder.and.resolveTo();

    fixture.componentInstance.moveDown(0);
    await Promise.resolve();

    expect(roomRepository.reorder).toHaveBeenCalledWith([
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 0 },
    ]);
  });

  it('moveUp(): does nothing for the first room', async () => {
    roomRepository.items.set([room({ id: 'a', sortOrder: 0 })]);

    fixture.componentInstance.moveUp(0);
    await Promise.resolve();

    expect(roomRepository.reorder).not.toHaveBeenCalled();
  });

  it('onIonReorder(): applies the web drag-and-drop completion and persists sequential sortOrder (Sablonok/Pakolás mintára)', () => {
    const rooms = [room({ id: 'a', sortOrder: 0 }), room({ id: 'b', sortOrder: 1 }), room({ id: 'c', sortOrder: 2 })];
    roomRepository.items.set(rooms);
    roomRepository.reorder.and.resolveTo();
    const reordered = [rooms[2], rooms[0], rooms[1]];
    const complete = jasmine.createSpy('complete').and.returnValue(reordered);
    const event = new CustomEvent('ionItemReorder', { detail: { complete } }) as CustomEvent<{ complete: jasmine.Spy }>;

    fixture.componentInstance.onIonReorder(event as never);

    expect(complete).toHaveBeenCalledWith(rooms);
    expect(roomRepository.reorder).toHaveBeenCalledWith([
      { id: 'c', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ]);
  });

  it('delete(): lists the affected live task names in the confirmation message', async () => {
    taskRepository.items.set([task({ id: 't1', roomId: 'r1', name: 'Mosogatás' }), task({ id: 't2', roomId: 'r1', name: 'Takarítás' })]);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(room({ id: 'r1', name: 'Konyha' }));

    const options = alertController.create.calls.mostRecent().args[0] as { message: string };
    expect(options.message).toContain('TASKS.HOUSEHOLD.DELETE_ROOM_CONFIRM_MESSAGE');
    expect(options.message).toContain('TASKS.HOUSEHOLD.DELETE_ROOM_CONFIRM_CASCADE');
  });

  it('delete(): omits the cascade hint when the room has no live tasks', async () => {
    taskRepository.items.set([]);
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(room({ id: 'r1' }));

    const options = alertController.create.calls.mostRecent().args[0] as { message: string };
    expect(options.message).toBe('TASKS.HOUSEHOLD.DELETE_ROOM_CONFIRM_MESSAGE');
  });

  it('the delete confirmation handler removes the room via the repository', async () => {
    roomRepository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(room({ id: 'r1' }));
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    destructive.handler!();

    expect(roomRepository.remove).toHaveBeenCalledWith('r1');
  });
});

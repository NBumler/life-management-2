import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { HouseholdRoom } from '../../../api/model/householdRoom';
import { HouseholdTask } from '../../../api/model/householdTask';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { today } from '../../../shared/local-date';
import { HouseholdTaskListPage } from './household-task-list.page';

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

describe('HouseholdTaskListPage', () => {
  let fixture: ComponentFixture<HouseholdTaskListPage>;
  let taskRepository: jasmine.SpyObj<Pick<HouseholdTaskRepository, 'load' | 'complete'>> & {
    items: ReturnType<typeof signal<HouseholdTask[]>>;
  };
  let roomRepository: jasmine.SpyObj<Pick<HouseholdRoomRepository, 'load'>> & { items: ReturnType<typeof signal<HouseholdRoom[]>> };

  beforeEach(async () => {
    taskRepository = jasmine.createSpyObj('HouseholdTaskRepository', ['load', 'complete']) as never;
    taskRepository.items = signal<HouseholdTask[]>([]);
    roomRepository = jasmine.createSpyObj('HouseholdRoomRepository', ['load']) as never;
    roomRepository.items = signal<HouseholdRoom[]>([room()]);

    await TestBed.configureTestingModule({
      imports: [HouseholdTaskListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: HouseholdTaskRepository, useValue: taskRepository },
        { provide: HouseholdRoomRepository, useValue: roomRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdTaskListPage);
  });

  it('groups tasks into overdue/today/later sections', () => {
    taskRepository.items.set([task({ id: 'a', nextDue: '2020-01-01' }), task({ id: 'b', nextDue: today() })]);

    const sections = fixture.componentInstance.sections();

    expect(sections.overdue.map((t) => t.id)).toEqual(['a']);
    expect(sections.today.map((t) => t.id)).toEqual(['b']);
  });

  it('filters by room, energy, and max minutes with AND semantics', () => {
    taskRepository.items.set([
      task({ id: 'match', roomId: 'r1', energyLevel: HouseholdTask.EnergyLevelEnum.Low, estimatedMinutes: 5 }),
      task({ id: 'wrong-energy', roomId: 'r1', energyLevel: HouseholdTask.EnergyLevelEnum.High, estimatedMinutes: 5 }),
      task({ id: 'too-long', roomId: 'r1', energyLevel: HouseholdTask.EnergyLevelEnum.Low, estimatedMinutes: 30 }),
    ]);
    fixture.componentInstance.roomFilter.set('r1');
    fixture.componentInstance.energyFilter.set(HouseholdTask.EnergyLevelEnum.Low);
    fixture.componentInstance.maxMinutesFilter.set(10);

    const allSections = fixture.componentInstance.sections();
    const allIds = [...allSections.overdue, ...allSections.today, ...allSections.later].map((t) => t.id);

    expect(allIds).toEqual(['match']);
  });

  it('searches both task name and room name', () => {
    taskRepository.items.set([task({ id: 'a', name: 'Porszívózás', roomId: 'r1' })]);
    fixture.componentInstance.query.set('konyha');

    const sections = fixture.componentInstance.sections();
    const allIds = [...sections.overdue, ...sections.today, ...sections.later].map((t) => t.id);

    expect(allIds).toEqual(['a']);
  });

  it('isEmpty() vs hasNoResults(): distinguishes no-tasks-at-all from a filtered-out search', () => {
    expect(fixture.componentInstance.isEmpty()).toBe(true);
    taskRepository.items.set([task({ name: 'Mosogatás' })]);
    fixture.componentInstance.query.set('teljesen-más');

    expect(fixture.componentInstance.isEmpty()).toBe(false);
    expect(fixture.componentInstance.hasNoResults()).toBe(true);
  });

  it('complete(): delegates to the repository with today and now', async () => {
    taskRepository.complete.and.resolveTo(task());
    const t = task();

    await fixture.componentInstance.complete(t);

    expect(taskRepository.complete).toHaveBeenCalledWith(t, jasmine.any(String), jasmine.any(String));
  });
});

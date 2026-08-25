import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { HouseholdTask } from '../../api/model/householdTask';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { HouseholdTaskNameConflictError, HouseholdTaskRepository } from './household-task.repository';

describe('HouseholdTaskRepository', () => {
  let repository: HouseholdTaskRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

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

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listHouseholdTasks', 'upsertHouseholdTask', 'deleteHouseholdTask']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(HouseholdTaskRepository);
  });

  it('load(): reads all tasks from the storage backend', async () => {
    storage.listHouseholdTasks.and.resolveTo([task({ id: 'a' }), task({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((t) => t.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new task with a fresh id when none is given', async () => {
    storage.upsertHouseholdTask.and.resolveTo(task({ id: 'new-1' }));

    const saved = await repository.save({
      roomId: 'r1',
      name: 'Mosogatás',
      energyLevel: HouseholdTask.EnergyLevelEnum.Low,
      estimatedMinutes: 10,
      intervalDays: 7,
      nextDue: '2026-06-01',
      lastCompletedAt: null,
      notes: null,
    });

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((t) => t.id)).toEqual(['new-1']);
  });

  it('save(): throws HouseholdTaskNameConflictError when another live task in the same room has the same normalized name', async () => {
    storage.listHouseholdTasks.and.resolveTo([task({ id: 'existing', roomId: 'r1', name: 'Mosogatás' })]);
    await repository.load();

    await expectAsync(
      repository.save({
        roomId: 'r1',
        name: 'mosogatás',
        energyLevel: HouseholdTask.EnergyLevelEnum.Low,
        estimatedMinutes: 10,
        intervalDays: 7,
        nextDue: '2026-06-01',
        lastCompletedAt: null,
        notes: null,
      }),
    ).toBeRejectedWith(jasmine.any(HouseholdTaskNameConflictError));
    expect(storage.upsertHouseholdTask).not.toHaveBeenCalled();
  });

  it('save(): allows the same name in a different room', async () => {
    storage.listHouseholdTasks.and.resolveTo([task({ id: 'existing', roomId: 'r1', name: 'Mosogatás' })]);
    await repository.load();
    storage.upsertHouseholdTask.and.resolveTo(task({ id: 'new-1', roomId: 'r2', name: 'Mosogatás' }));

    const saved = await repository.save({
      roomId: 'r2',
      name: 'Mosogatás',
      energyLevel: HouseholdTask.EnergyLevelEnum.Low,
      estimatedMinutes: 10,
      intervalDays: 7,
      nextDue: '2026-06-01',
      lastCompletedAt: null,
      notes: null,
    });

    expect(saved.id).toBe('new-1');
  });

  it('complete(): rolls nextDue forward from today (not from the old nextDue) and sets lastCompletedAt', async () => {
    storage.listHouseholdTasks.and.resolveTo([task({ id: 't1', nextDue: '2026-01-01', intervalDays: 7 })]);
    await repository.load();
    storage.upsertHouseholdTask.and.callFake(async (t) => t);

    const existing = repository.items()[0];
    await repository.complete(existing, '2026-06-01', '2026-06-01T09:00:00Z');

    const sentDraft = storage.upsertHouseholdTask.calls.mostRecent().args[0] as HouseholdTask;
    expect(sentDraft.nextDue).toBe('2026-06-08');
    expect(sentDraft.lastCompletedAt).toBe('2026-06-01T09:00:00Z');
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listHouseholdTasks.and.resolveTo([task({ id: 'a' })]);
    await repository.load();
    storage.deleteHouseholdTask.and.resolveTo(task({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteHouseholdTask).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertHouseholdTask.and.resolveTo(task());
    storage.deleteHouseholdTask.and.resolveTo(task({ deleted: true }));

    await repository.save({
      roomId: 'r1',
      name: 'Mosogatás',
      energyLevel: HouseholdTask.EnergyLevelEnum.Low,
      estimatedMinutes: 10,
      intervalDays: 7,
      nextDue: '2026-06-01',
      lastCompletedAt: null,
      notes: null,
    });
    await repository.remove('t1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertHouseholdTask.and.resolveTo(task());

    await repository.save({
      roomId: 'r1',
      name: 'Mosogatás',
      energyLevel: HouseholdTask.EnergyLevelEnum.Low,
      estimatedMinutes: 10,
      intervalDays: 7,
      nextDue: '2026-06-01',
      lastCompletedAt: null,
      notes: null,
    });

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

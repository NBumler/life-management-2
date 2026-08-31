import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { BoulderProblem } from '../../api/model/boulderProblem';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { BoulderProblemRepository, BoulderProblemSaveInput } from './boulder-problem.repository';

function problem(overrides: Partial<BoulderProblem> = {}): BoulderProblem {
  return { id: 'p1', sectorId: 's1', name: 'Kockakő', guidebookGrade: '7A', deleted: false, ...overrides };
}

function saveInput(overrides: Partial<BoulderProblemSaveInput> = {}): BoulderProblemSaveInput {
  return { sectorId: 's1', name: 'Kockakő', guidebookGrade: '7A', ...overrides };
}

describe('BoulderProblemRepository', () => {
  let repository: BoulderProblemRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listBoulderProblems', 'upsertBoulderProblem', 'deleteBoulderProblem']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(BoulderProblemRepository);
  });

  it('load(): reads all boulder problems from the storage backend', async () => {
    storage.listBoulderProblems.and.resolveTo([problem({ id: 'a' }), problem({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((p) => p.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('forSector(): returns only the live problems of that sector, by name', async () => {
    storage.listBoulderProblems.and.resolveTo([
      problem({ id: 'b', sectorId: 's1', name: 'Béta' }),
      problem({ id: 'a', sectorId: 's1', name: 'Alfa' }),
      problem({ id: 'dead', sectorId: 's1', deleted: true }),
      problem({ id: 'other', sectorId: 's2' }),
    ]);
    await repository.load();

    expect(repository.forSector('s1').map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('save(): creates a new problem with a fresh id, no uniqueness rule (a duplicate name is allowed)', async () => {
    storage.listBoulderProblems.and.resolveTo([problem({ id: 'existing', sectorId: 's1', name: 'Kockakő' })]);
    await repository.load();
    storage.upsertBoulderProblem.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ sectorId: 's1', name: 'Kockakő' }));

    expect(saved.id).not.toBe('existing');
    expect(repository.items().length).toBe(2);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listBoulderProblems.and.resolveTo([problem({ id: 'a' })]);
    await repository.load();
    storage.deleteBoulderProblem.and.resolveTo(problem({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteBoulderProblem).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertBoulderProblem.and.callFake(async (draft) => draft);
    storage.deleteBoulderProblem.and.resolveTo(problem({ deleted: true }));

    await repository.save(saveInput({ id: 'p1' }));
    await repository.remove('p1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertBoulderProblem.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 'p1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming BoulderProblem (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listBoulderProblems.and.resolveTo([problem({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['BoulderProblem']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listBoulderProblems).toHaveBeenCalledTimes(2);
  });
});

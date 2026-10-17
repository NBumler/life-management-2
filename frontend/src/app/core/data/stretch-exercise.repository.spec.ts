import { TestBed } from '@angular/core/testing';

import { StretchExercise } from '../../api/model/stretchExercise';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { StretchExerciseNameConflictError, StretchExerciseRepository } from './stretch-exercise.repository';

function stretch(overrides: Partial<StretchExercise> = {}): StretchExercise {
  return {
    id: 's1',
    name: 'Combhajlító nyújtás',
    category: StretchExercise.CategoryEnum.Legs,
    isFavorite: false,
    defaultHoldSeconds: 30,
    defaultPerSide: true,
    deleted: false,
    ...overrides,
  };
}

function saveInput(overrides: Partial<Parameters<StretchExerciseRepository['save']>[0]> = {}) {
  return {
    name: 'Combhajlító nyújtás',
    category: StretchExercise.CategoryEnum.Legs,
    description: null,
    equipment: null,
    isFavorite: false,
    defaultHoldSeconds: 30,
    defaultPerSide: true,
    ...overrides,
  };
}

describe('StretchExerciseRepository (backlog/167)', () => {
  let repository: StretchExerciseRepository;
  let storage: jasmine.SpyObj<StorageBackend>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listStretchExercises', 'upsertStretchExercise', 'deleteStretchExercise']);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(StretchExerciseRepository);
  });

  it('load(): reads the catalog sorted by name, with no seed', async () => {
    storage.listStretchExercises.and.resolveTo([stretch({ id: 'b', name: 'Vádli' }), stretch({ id: 'a', name: 'Csípő' })]);

    await repository.load();

    expect(repository.items().map((s) => s.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
    expect(storage.listStretchExercises).toHaveBeenCalledTimes(1);
  });

  it('save(): writes every stretching field through the storage backend and updates items()', async () => {
    storage.listStretchExercises.and.resolveTo([]);
    await repository.load();
    storage.upsertStretchExercise.and.callFake(async (dto) => dto);

    const saved = await repository.save(saveInput({ defaultHoldSeconds: 45, equipment: 'Heveder', description: 'Lassan' }));

    const sent = storage.upsertStretchExercise.calls.mostRecent().args[0];
    expect(sent.id).toBeTruthy();
    expect(sent.defaultHoldSeconds).toBe(45);
    expect(sent.defaultPerSide).toBe(true);
    expect(sent.equipment).toBe('Heveder');
    expect(sent.description).toBe('Lassan');
    expect(repository.items()).toEqual([saved]);
  });

  it('save(): refuses a name another live stretching exercise already has (normalized)', async () => {
    storage.listStretchExercises.and.resolveTo([stretch({ id: 'x', name: 'Combhajlító nyújtás' })]);
    await repository.load();

    await expectAsync(repository.save(saveInput({ name: '  combhajlító   NYÚJTÁS ' }))).toBeRejectedWith(
      jasmine.any(StretchExerciseNameConflictError),
    );
    expect(storage.upsertStretchExercise).not.toHaveBeenCalled();
  });

  it('setFavorite(): re-saves the row with only the flag flipped', async () => {
    storage.listStretchExercises.and.resolveTo([stretch({ id: 's1', defaultHoldSeconds: 60 })]);
    await repository.load();
    storage.upsertStretchExercise.and.callFake(async (dto) => dto);

    await repository.setFavorite('s1', true);

    const sent = storage.upsertStretchExercise.calls.mostRecent().args[0];
    expect(sent.isFavorite).toBe(true);
    expect(sent.defaultHoldSeconds).toBe(60);
    expect(sent.defaultPerSide).toBe(true);
  });

  it('remove(): deletes through the backend and drops the row from items()', async () => {
    storage.listStretchExercises.and.resolveTo([stretch({ id: 's1' })]);
    await repository.load();
    storage.deleteStretchExercise.and.resolveTo(stretch({ id: 's1', deleted: true }));

    await repository.remove('s1');

    expect(storage.deleteStretchExercise).toHaveBeenCalledWith('s1');
    expect(repository.items()).toEqual([]);
  });
});

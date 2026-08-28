import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { Exercise } from '../../api/model/exercise';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { ExerciseNameConflictError, ExerciseRepository } from './exercise.repository';

describe('ExerciseRepository', () => {
  let repository: ExerciseRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  function exercise(overrides: Partial<Exercise> = {}): Exercise {
    return {
      id: 'e1',
      name: 'Fekvenyomás',
      category: Exercise.CategoryEnum.Chest,
      kind: Exercise.KindEnum.WeightedReps,
      defaultRestTimeSeconds: null,
      isFavorite: false,
      equipment: null,
      deleted: false,
      ...overrides,
    };
  }

  function saveInput(overrides: Partial<Parameters<ExerciseRepository['save']>[0]> = {}) {
    return {
      name: 'Fekvenyomás',
      category: Exercise.CategoryEnum.Chest,
      kind: Exercise.KindEnum.WeightedReps,
      defaultRestTimeSeconds: null,
      isFavorite: false,
      equipment: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listExercises', 'upsertExercise', 'deleteExercise', 'seedExercises']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);
    storage.seedExercises.and.resolveTo(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(ExerciseRepository);
  });

  it('load(): reads all exercises and sorts them by name', async () => {
    storage.listExercises.and.resolveTo([exercise({ id: 'b', name: 'Béta' }), exercise({ id: 'a', name: 'Alfa' })]);

    await repository.load();

    expect(repository.items().map((e) => e.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('load(): asks the storage backend to seed the catalog on first run when it is empty', async () => {
    storage.listExercises.and.resolveTo([]);

    await repository.load();

    expect(storage.seedExercises).toHaveBeenCalledTimes(1);
  });

  it('load(): does not seed when the catalog already has rows', async () => {
    storage.listExercises.and.resolveTo([exercise()]);

    await repository.load();

    expect(storage.seedExercises).not.toHaveBeenCalled();
  });

  it('load(): only attempts to seed once per session', async () => {
    storage.listExercises.and.resolveTo([]);

    await repository.load();
    await repository.load();

    expect(storage.seedExercises).toHaveBeenCalledTimes(1);
  });

  it('save(): creates a new exercise with a fresh id when none is given', async () => {
    storage.listExercises.and.resolveTo([]);
    await repository.load();
    storage.upsertExercise.and.resolveTo(exercise({ id: 'new-1', name: 'Guggolás' }));

    const saved = await repository.save(saveInput({ name: 'Guggolás' }));

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((e) => e.id)).toEqual(['new-1']);
  });

  it('save(): throws ExerciseNameConflictError before writing, when another live exercise has the same normalized name', async () => {
    storage.listExercises.and.resolveTo([exercise({ id: 'existing', name: 'Fekvenyomás' })]);
    await repository.load();

    await expectAsync(repository.save(saveInput({ name: 'fekvenyomás' }))).toBeRejectedWith(
      jasmine.any(ExerciseNameConflictError),
    );
    expect(storage.upsertExercise).not.toHaveBeenCalled();
  });

  it('save(): allows renaming an exercise to its own current name', async () => {
    storage.listExercises.and.resolveTo([exercise({ id: 'existing', name: 'Fekvenyomás' })]);
    await repository.load();
    storage.upsertExercise.and.resolveTo(exercise({ id: 'existing', name: 'Fekvenyomás', isFavorite: true }));

    const saved = await repository.save(saveInput({ id: 'existing', name: 'Fekvenyomás', isFavorite: true }));

    expect(saved.isFavorite).toBe(true);
  });

  it('setFavorite(): re-saves the exercise with the flipped flag', async () => {
    storage.listExercises.and.resolveTo([exercise({ id: 'e1', isFavorite: false })]);
    await repository.load();
    storage.upsertExercise.and.resolveTo(exercise({ id: 'e1', isFavorite: true }));

    await repository.setFavorite('e1', true);

    expect(storage.upsertExercise).toHaveBeenCalledTimes(1);
    expect(storage.upsertExercise.calls.mostRecent().args[0].isFavorite).toBe(true);
  });

  it('setFavorite(): is a no-op when the flag already matches', async () => {
    storage.listExercises.and.resolveTo([exercise({ id: 'e1', isFavorite: true })]);
    await repository.load();

    await repository.setFavorite('e1', true);

    expect(storage.upsertExercise).not.toHaveBeenCalled();
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listExercises.and.resolveTo([exercise({ id: 'a' })]);
    await repository.load();
    storage.deleteExercise.and.resolveTo(exercise({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteExercise).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listExercises.and.resolveTo([exercise()]);
    await repository.load();
    storage.upsertExercise.and.resolveTo(exercise());
    storage.deleteExercise.and.resolveTo(exercise({ deleted: true }));

    await repository.save(saveInput({ id: 'e1' }));
    await repository.remove('e1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listExercises.and.resolveTo([exercise()]);
    await repository.load();
    storage.upsertExercise.and.resolveTo(exercise());

    await repository.save(saveInput({ id: 'e1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

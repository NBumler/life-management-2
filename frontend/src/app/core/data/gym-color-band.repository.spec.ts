import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { GymColorBand } from '../../api/model/gymColorBand';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { GymColorBandHexConflictError, GymColorBandRepository, GymColorBandSaveInput } from './gym-color-band.repository';

function band(overrides: Partial<GymColorBand> = {}): GymColorBand {
  return {
    id: 'b1',
    gymId: 'g1',
    name: 'Piros',
    hexColor: '#ff00aa',
    variant: GymColorBand.VariantEnum.Neutral,
    gradeLower: '6A',
    gradeUpper: '6B',
    absoluteDifficultyIndexLower: 40,
    absoluteDifficultyIndexUpper: 44,
    deleted: false,
    ...overrides,
  };
}

function saveInput(overrides: Partial<GymColorBandSaveInput> = {}): GymColorBandSaveInput {
  return {
    gymId: 'g1',
    name: 'Piros',
    hexColor: '#ff00aa',
    variant: GymColorBand.VariantEnum.Neutral,
    gradeLower: '6A',
    gradeUpper: '6B',
    absoluteDifficultyIndexLower: 40,
    absoluteDifficultyIndexUpper: 44,
    ...overrides,
  };
}

describe('GymColorBandRepository', () => {
  let repository: GymColorBandRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listGymColorBands', 'upsertGymColorBand', 'deleteGymColorBand']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(GymColorBandRepository);
  });

  it('load(): reads all bands from the storage backend', async () => {
    storage.listGymColorBands.and.resolveTo([band({ id: 'a' }), band({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((b) => b.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('forGym(): returns only the live bands of that gym, low grade index first', async () => {
    storage.listGymColorBands.and.resolveTo([
      band({ id: 'hi', gymId: 'g1', absoluteDifficultyIndexLower: 50 }),
      band({ id: 'lo', gymId: 'g1', absoluteDifficultyIndexLower: 20 }),
      band({ id: 'dead', gymId: 'g1', deleted: true }),
      band({ id: 'other', gymId: 'g2' }),
    ]);
    await repository.load();

    expect(repository.forGym('g1').map((b) => b.id)).toEqual(['lo', 'hi']);
  });

  it('save(): stores the canonical hex form', async () => {
    storage.upsertGymColorBand.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ hexColor: '#F0A' }));

    expect(saved.hexColor).toBe('#ff00aa');
  });

  it('save(): throws GymColorBandHexConflictError when a live band of the same gym uses the same canonical hex', async () => {
    storage.listGymColorBands.and.resolveTo([band({ id: 'existing', gymId: 'g1', hexColor: '#ff00aa' })]);
    await repository.load();

    await expectAsync(repository.save(saveInput({ gymId: 'g1', hexColor: '#F0A' }))).toBeRejectedWith(
      jasmine.any(GymColorBandHexConflictError),
    );
    expect(storage.upsertGymColorBand).not.toHaveBeenCalled();
  });

  it('save(): allows the same hex in a different gym', async () => {
    storage.listGymColorBands.and.resolveTo([band({ id: 'existing', gymId: 'g1', hexColor: '#ff00aa' })]);
    await repository.load();
    storage.upsertGymColorBand.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ gymId: 'g2', hexColor: '#ff00aa' }));

    expect(saved.gymId).toBe('g2');
  });

  it('save(): ignores a tombstoned same-hex band in the same gym', async () => {
    storage.listGymColorBands.and.resolveTo([
      band({ id: 'dead', gymId: 'g1', hexColor: '#ff00aa', deleted: true }),
    ]);
    await repository.load();
    storage.upsertGymColorBand.and.callFake(async (draft) => draft);

    const saved = await repository.save(saveInput({ gymId: 'g1', hexColor: '#ff00aa' }));

    expect(saved.id).toBeDefined();
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listGymColorBands.and.resolveTo([band({ id: 'a' })]);
    await repository.load();
    storage.deleteGymColorBand.and.resolveTo(band({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteGymColorBand).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertGymColorBand.and.callFake(async (draft) => draft);
    storage.deleteGymColorBand.and.resolveTo(band({ deleted: true }));

    await repository.save(saveInput({ id: 'b1' }));
    await repository.remove('b1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertGymColorBand.and.callFake(async (draft) => draft);

    await repository.save(saveInput({ id: 'b1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming GymColorBand (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listGymColorBands.and.resolveTo([band({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['GymColorBand']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listGymColorBands).toHaveBeenCalledTimes(2);
  });
});

import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { HikeRoute } from '../../api/model/hikeRoute';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { HikeRouteRepository } from './hike-route.repository';

function route(overrides: Partial<HikeRoute> = {}): HikeRoute {
  return {
    id: 'r1',
    name: 'Kilátó túra',
    coordinates: [
      [19.0, 47.0],
      [19.1, 47.1],
    ],
    deleted: false,
    ...overrides,
  };
}

describe('HikeRouteRepository', () => {
  let repository: HikeRouteRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listHikeRoutes', 'upsertHikeRoute', 'deleteHikeRoute']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(HikeRouteRepository);
  });

  it('load(): reads all routes from the storage backend', async () => {
    storage.listHikeRoutes.and.resolveTo([route({ id: 'a' }), route({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((r) => r.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new route with a fresh id when none is given', async () => {
    storage.upsertHikeRoute.and.resolveTo(route({ id: 'new-1' }));

    const saved = await repository.save({
      name: 'Kilátó túra',
      coordinates: [
        [19.0, 47.0],
        [19.1, 47.1],
      ],
    });

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((r) => r.id)).toEqual(['new-1']);
    const sentDraft = storage.upsertHikeRoute.calls.mostRecent().args[0] as HikeRoute;
    expect(sentDraft.id).not.toBe('');
  });

  it('save(): reuses the given id for an update', async () => {
    storage.upsertHikeRoute.and.callFake(async (draft) => draft);

    await repository.save({
      id: 'existing-1',
      name: 'Kilátó túra',
      coordinates: [
        [19.0, 47.0],
        [19.1, 47.1],
      ],
    });

    expect(storage.upsertHikeRoute).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'existing-1' }));
  });

  it('save(): passes through the computed metrics fields when given, else null', async () => {
    storage.upsertHikeRoute.and.callFake(async (draft) => draft);

    await repository.save({
      name: 'Kilátó túra',
      coordinates: [
        [19.0, 47.0],
        [19.1, 47.1],
      ],
      distanceMeters: 1000,
      elevationGainMeters: 50,
      elevationLossMeters: 10,
      estimatedDurationMinutes: 20,
      elevationProfile: [{ distanceMeters: 0, elevationMeters: 300 }],
    });
    await repository.save({
      name: 'Kilátó túra 2',
      coordinates: [
        [19.0, 47.0],
        [19.1, 47.1],
      ],
    });

    const [withMetrics, withoutMetrics] = storage.upsertHikeRoute.calls.allArgs().map((args) => args[0] as HikeRoute);
    expect(withMetrics.distanceMeters).toBe(1000);
    expect(withMetrics.elevationProfile).toEqual([{ distanceMeters: 0, elevationMeters: 300 }]);
    expect(withoutMetrics.distanceMeters).toBeNull();
    expect(withoutMetrics.elevationProfile).toBeNull();
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listHikeRoutes.and.resolveTo([route({ id: 'a' })]);
    await repository.load();
    storage.deleteHikeRoute.and.resolveTo(route({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteHikeRoute).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertHikeRoute.and.resolveTo(route());
    storage.deleteHikeRoute.and.resolveTo(route({ deleted: true }));

    await repository.save({ name: 'X', coordinates: [[19.0, 47.0], [19.1, 47.1]] });
    await repository.remove('r1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertHikeRoute.and.resolveTo(route());

    await repository.save({ name: 'X', coordinates: [[19.0, 47.0], [19.1, 47.1]] });

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

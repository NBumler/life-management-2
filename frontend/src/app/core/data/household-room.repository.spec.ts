import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { HouseholdRoom } from '../../api/model/householdRoom';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { HouseholdRoomNameConflictError, HouseholdRoomRepository } from './household-room.repository';

describe('HouseholdRoomRepository', () => {
  let repository: HouseholdRoomRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  function room(overrides: Partial<HouseholdRoom> = {}): HouseholdRoom {
    return { id: 'r1', name: 'Konyha', sortOrder: 0, deleted: false, ...overrides };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listHouseholdRooms', 'upsertHouseholdRoom', 'deleteHouseholdRoom']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(HouseholdRoomRepository);
  });

  it('load(): reads all rooms from the storage backend', async () => {
    storage.listHouseholdRooms.and.resolveTo([room({ id: 'a' }), room({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((r) => r.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new room with a fresh id when none is given', async () => {
    storage.listHouseholdRooms.and.resolveTo([]);
    await repository.load();
    storage.upsertHouseholdRoom.and.resolveTo(room({ id: 'new-1', name: 'Fürdő' }));

    const saved = await repository.save('Fürdő', 0);

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((r) => r.id)).toEqual(['new-1']);
  });

  it('save(): keeps the list sorted by sortOrder', async () => {
    storage.listHouseholdRooms.and.resolveTo([]);
    await repository.load();
    storage.upsertHouseholdRoom.and.resolveTo(room({ id: 'z', name: 'Z', sortOrder: 1 }));
    await repository.save('Z', 1);
    storage.upsertHouseholdRoom.and.resolveTo(room({ id: 'a', name: 'A', sortOrder: 0 }));
    await repository.save('A', 0);

    expect(repository.items().map((r) => r.id)).toEqual(['a', 'z']);
  });

  it('save(): throws HouseholdRoomNameConflictError before writing, when another live room has the same normalized name', async () => {
    storage.listHouseholdRooms.and.resolveTo([room({ id: 'existing', name: 'Konyha' })]);
    await repository.load();

    await expectAsync(repository.save('konyha', 0)).toBeRejectedWith(jasmine.any(HouseholdRoomNameConflictError));
    expect(storage.upsertHouseholdRoom).not.toHaveBeenCalled();
  });

  it('reorder(): persists only the rooms whose sortOrder actually changed', async () => {
    storage.listHouseholdRooms.and.resolveTo([room({ id: 'a', name: 'Konyha', sortOrder: 0 }), room({ id: 'b', name: 'Fürdő', sortOrder: 1 })]);
    await repository.load();
    storage.upsertHouseholdRoom.and.callFake(async (r) => r);

    await repository.reorder([
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 2 },
    ]);

    expect(storage.upsertHouseholdRoom).toHaveBeenCalledTimes(1);
    expect(storage.upsertHouseholdRoom).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'b', sortOrder: 2 }));
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listHouseholdRooms.and.resolveTo([room({ id: 'a' })]);
    await repository.load();
    storage.deleteHouseholdRoom.and.resolveTo(room({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteHouseholdRoom).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listHouseholdRooms.and.resolveTo([]);
    await repository.load();
    storage.upsertHouseholdRoom.and.resolveTo(room());
    storage.deleteHouseholdRoom.and.resolveTo(room({ deleted: true }));

    await repository.save('Konyha', 0);
    await repository.remove('r1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listHouseholdRooms.and.resolveTo([]);
    await repository.load();
    storage.upsertHouseholdRoom.and.resolveTo(room());

    await repository.save('Konyha', 0);

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

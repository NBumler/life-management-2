import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { WeightHistoryRepository } from './weight-history.repository';

describe('WeightHistoryRepository', () => {
  let repository: WeightHistoryRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  function entry(overrides: Partial<WeightHistoryEntry> = {}): WeightHistoryEntry {
    return { id: 'e1', recordedAt: '2026-08-01T00:00:00Z', weightKg: 80, deleted: false, ...overrides };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', [
      'listWeightHistory',
      'upsertWeightHistoryEntry',
      'deleteWeightHistoryEntry',
    ]);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(WeightHistoryRepository);
  });

  it('load(): reads all entries from the storage backend', async () => {
    storage.listWeightHistory.and.resolveTo([entry({ id: 'a' }), entry({ id: 'b' })]);

    await repository.load();

    expect(repository.entries().map((e) => e.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('add(): upserts and inserts the entry sorted by recordedAt descending', async () => {
    storage.upsertWeightHistoryEntry.and.resolveTo(entry({ id: 'new-1', recordedAt: '2026-08-19T00:00:00Z' }));

    await repository.add('2026-08-19T00:00:00Z', 79);

    expect(repository.entries().map((e) => e.id)).toEqual(['new-1']);
  });

  it('add(): keeps the list sorted with the newest entry first', async () => {
    storage.upsertWeightHistoryEntry.and.resolveTo(entry({ id: 'old', recordedAt: '2026-08-01T00:00:00Z' }));
    await repository.add('2026-08-01T00:00:00Z', 80);
    storage.upsertWeightHistoryEntry.and.resolveTo(entry({ id: 'new', recordedAt: '2026-08-19T00:00:00Z' }));
    await repository.add('2026-08-19T00:00:00Z', 78);

    expect(repository.entries().map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('update(): replaces the entry with the same id in place', async () => {
    storage.upsertWeightHistoryEntry.and.resolveTo(entry({ id: 'e1', weightKg: 80 }));
    await repository.add('2026-08-01T00:00:00Z', 80);
    storage.upsertWeightHistoryEntry.and.resolveTo(entry({ id: 'e1', weightKg: 81 }));

    await repository.update('e1', '2026-08-01T00:00:00Z', 81);

    expect(repository.entries().length).toBe(1);
    expect(repository.entries()[0].weightKg).toBe(81);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.upsertWeightHistoryEntry.and.resolveTo(entry({ id: 'e1' }));
    await repository.add('2026-08-01T00:00:00Z', 80);
    storage.deleteWeightHistoryEntry.and.resolveTo(entry({ id: 'e1', deleted: true }));

    await repository.remove('e1');

    expect(repository.entries()).toEqual([]);
    expect(storage.deleteWeightHistoryEntry).toHaveBeenCalledWith('e1');
  });

  it('triggers a debounced drain on native for both add and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertWeightHistoryEntry.and.resolveTo(entry());
    storage.deleteWeightHistoryEntry.and.resolveTo(entry({ deleted: true }));

    await repository.add('2026-08-01T00:00:00Z', 80);
    await repository.remove('e1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertWeightHistoryEntry.and.resolveTo(entry());

    await repository.add('2026-08-01T00:00:00Z', 80);

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

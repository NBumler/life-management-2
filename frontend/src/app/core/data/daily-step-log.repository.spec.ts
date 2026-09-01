import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { DailyStepLog } from '../../api/model/dailyStepLog';
import { AuthSessionService } from '../session/auth-session.service';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { DailyStepLogRepository } from './daily-step-log.repository';

function log(overrides: Partial<DailyStepLog> = {}): DailyStepLog {
  return { id: 'd1', date: '2026-09-01', stepCount: 5000, deleted: false, ...overrides };
}

describe('DailyStepLogRepository', () => {
  let repository: DailyStepLogRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listDailyStepLogs', 'upsertDailyStepLog', 'deleteDailyStepLog']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);
    storage.upsertDailyStepLog.and.callFake(async (dto) => dto);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: AuthSessionService, useValue: { userId: () => 'user-1' } },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(DailyStepLogRepository);
  });

  it('stepsForDay(): returns the stored count, or 0 for a missing / soft-deleted day', async () => {
    storage.listDailyStepLogs.and.resolveTo([
      log({ id: 'a', date: '2026-09-01', stepCount: 8000 }),
      log({ id: 'b', date: '2026-08-31', stepCount: 1000, deleted: true }),
    ]);
    await repository.load();

    expect(repository.stepsForDay('2026-09-01')).toBe(8000);
    expect(repository.stepsForDay('2026-08-31')).toBe(0);
    expect(repository.stepsForDay('2026-08-30')).toBe(0);
  });

  it('saveManual(): overwrites the stored value for the day, larger or smaller, reusing the row id', async () => {
    storage.listDailyStepLogs.and.resolveTo([log({ id: 'existing', date: '2026-09-01', stepCount: 9000 })]);
    await repository.load();

    await repository.saveManual('2026-09-01', 120);

    const sent = storage.upsertDailyStepLog.calls.mostRecent().args[0];
    expect(sent.id).toBe('existing');
    expect(sent.stepCount).toBe(120);
    expect(repository.stepsForDay('2026-09-01')).toBe(120);
  });

  it('saveManual(): mints a deterministic v5 id for a brand-new day', async () => {
    storage.listDailyStepLogs.and.resolveTo([]);
    await repository.load();

    await repository.saveManual('2026-09-02', 4200);

    const sent = storage.upsertDailyStepLog.calls.mostRecent().args[0];
    expect(sent.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('maxWinsUpsert(): writes only when the incoming count beats the stored one', async () => {
    storage.listDailyStepLogs.and.resolveTo([log({ id: 'a', date: '2026-09-01', stepCount: 6000 })]);
    await repository.load();

    await repository.maxWinsUpsert('2026-09-01', 5000);
    expect(storage.upsertDailyStepLog).not.toHaveBeenCalled();

    await repository.maxWinsUpsert('2026-09-01', 9000);
    expect(storage.upsertDailyStepLog.calls.mostRecent().args[0].stepCount).toBe(9000);
  });

  it('maxWinsUpsert(): a missing day counts as 0, so any positive count writes', async () => {
    storage.listDailyStepLogs.and.resolveTo([]);
    await repository.load();

    await repository.maxWinsUpsert('2026-09-03', 10);
    expect(storage.upsertDailyStepLog.calls.mostRecent().args[0].stepCount).toBe(10);
  });

  it('triggers a debounced drain on native only', async () => {
    const isNative = spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listDailyStepLogs.and.resolveTo([]);
    await repository.load();

    await repository.saveManual('2026-09-01', 100);
    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(1);

    isNative.and.returnValue(false);
    await repository.saveManual('2026-09-01', 200);
    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(1);
  });
});

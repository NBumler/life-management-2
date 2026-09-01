import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DailyStepLog } from '../../api/model/dailyStepLog';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { addDaysIso, today } from '../../shared/local-date';
import { ActivityStepSyncService } from './activity-step-sync.service';
import { HealthConnectStepSource } from './health-connect-step-source.service';

function log(date: string, stepCount: number): DailyStepLog {
  return { id: `id-${date}`, date, stepCount, deleted: false };
}

describe('ActivityStepSyncService', () => {
  let service: ActivityStepSyncService;
  let source: jasmine.SpyObj<HealthConnectStepSource>;
  let repo: jasmine.SpyObj<Pick<DailyStepLogRepository, 'load' | 'maxWinsUpsert'>> & {
    items: ReturnType<typeof signal<DailyStepLog[]>>;
  };

  beforeEach(() => {
    source = jasmine.createSpyObj('HealthConnectStepSource', ['isAvailable', 'hasPermission', 'requestPermission', 'readDailySteps']);
    repo = jasmine.createSpyObj('DailyStepLogRepository', ['load', 'maxWinsUpsert']) as never;
    repo.items = signal<DailyStepLog[]>([]);
    repo.load.and.resolveTo();
    repo.maxWinsUpsert.and.resolveTo(null);

    TestBed.configureTestingModule({
      providers: [
        { provide: HealthConnectStepSource, useValue: source },
        { provide: DailyStepLogRepository, useValue: repo },
      ],
    });
    service = TestBed.inject(ActivityStepSyncService);
  });

  it('syncNow(): does nothing unless permission is granted', async () => {
    await service.syncNow();
    expect(source.readDailySteps).not.toHaveBeenCalled();
    expect(repo.maxWinsUpsert).not.toHaveBeenCalled();
  });

  it('syncNow(): upserts today plus every gap day in the 7-day window, skipping days that already have a row', async () => {
    service.permission.set('granted');
    const todayIso = today();
    const alreadyLogged = addDaysIso(todayIso, -2);
    repo.load.and.callFake(async () => repo.items.set([log(alreadyLogged, 4242)]));
    source.readDailySteps.and.callFake(async (date: string) => (date === todayIso ? 9000 : 5000));

    await service.syncNow();

    const upsertedDates = repo.maxWinsUpsert.calls.allArgs().map(([d]) => d as string);
    expect(upsertedDates).toContain(todayIso);
    expect(upsertedDates).not.toContain(alreadyLogged);
    // today + 7 look-back days, minus the one already present
    expect(upsertedDates.length).toBe(1 + 7 - 1);
    expect(service.lastSyncAt()).not.toBeNull();
  });

  it('syncNow(): skips a day Health Connect can not answer for', async () => {
    service.permission.set('granted');
    const todayIso = today();
    source.readDailySteps.and.callFake(async (date: string) => (date === todayIso ? 8000 : null));

    await service.syncNow();

    const upsertedDates = repo.maxWinsUpsert.calls.allArgs().map(([d]) => d as string);
    expect(upsertedDates).toEqual([todayIso]);
  });

  it('requestPermission(): flips the signal and syncs on grant', async () => {
    service.permission.set('denied');
    source.requestPermission.and.resolveTo(true);
    source.readDailySteps.and.resolveTo(0);

    await service.requestPermission();

    expect(service.permission()).toBe('granted');
    expect(source.readDailySteps).toHaveBeenCalled();
  });

  it('requestPermission(): stays denied when the user declines, without syncing', async () => {
    service.permission.set('denied');
    source.requestPermission.and.resolveTo(false);

    await service.requestPermission();

    expect(service.permission()).toBe('denied');
    expect(source.readDailySteps).not.toHaveBeenCalled();
  });
});

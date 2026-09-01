import { TestBed } from '@angular/core/testing';

import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { AuthSessionService } from '../session/auth-session.service';
import { addDaysIso, today } from '../../shared/local-date';
import { ActivityStepSyncService } from './activity-step-sync.service';
import { HealthConnectStepSource } from './health-connect-step-source.service';

describe('ActivityStepSyncService', () => {
  let service: ActivityStepSyncService;
  let source: jasmine.SpyObj<HealthConnectStepSource>;
  let repo: jasmine.SpyObj<Pick<DailyStepLogRepository, 'load' | 'maxWinsUpsert' | 'allKnownDates'>>;
  let userId: string | null;

  beforeEach(() => {
    source = jasmine.createSpyObj('HealthConnectStepSource', [
      'isAvailable',
      'hasPermission',
      'requestPermission',
      'hasBackgroundPermission',
      'requestBackgroundPermission',
      'readDailySteps',
    ]);
    source.hasBackgroundPermission.and.resolveTo(false);
    source.requestBackgroundPermission.and.resolveTo(false);
    repo = jasmine.createSpyObj('DailyStepLogRepository', ['load', 'maxWinsUpsert', 'allKnownDates']);
    repo.load.and.resolveTo();
    repo.maxWinsUpsert.and.resolveTo(null);
    repo.allKnownDates.and.resolveTo([]);
    userId = 'user-1';

    TestBed.configureTestingModule({
      providers: [
        { provide: HealthConnectStepSource, useValue: source },
        { provide: DailyStepLogRepository, useValue: repo },
        { provide: AuthSessionService, useValue: { userId: () => userId } },
      ],
    });
    service = TestBed.inject(ActivityStepSyncService);
  });

  it('syncNow(): does nothing unless permission is granted', async () => {
    await service.syncNow();
    expect(source.readDailySteps).not.toHaveBeenCalled();
    expect(repo.maxWinsUpsert).not.toHaveBeenCalled();
  });

  it('syncNow(): does nothing while logged out, even with permission granted', async () => {
    service.permission.set('granted');
    userId = null;

    await service.syncNow();

    expect(repo.load).not.toHaveBeenCalled();
    expect(source.readDailySteps).not.toHaveBeenCalled();
  });

  it('syncNow(): upserts today plus every gap day in the 7-day window, skipping days that already have a row', async () => {
    service.permission.set('granted');
    const todayIso = today();
    const alreadyLogged = addDaysIso(todayIso, -2);
    repo.allKnownDates.and.resolveTo([alreadyLogged]);
    source.readDailySteps.and.callFake(async (date: string) => (date === todayIso ? 9000 : 5000));

    await service.syncNow();

    const upsertedDates = repo.maxWinsUpsert.calls.allArgs().map(([d]) => d as string);
    expect(upsertedDates).toContain(todayIso);
    expect(upsertedDates).not.toContain(alreadyLogged);
    // today + 7 look-back days, minus the one already present
    expect(upsertedDates.length).toBe(1 + 7 - 1);
    expect(service.lastSyncAt()).not.toBeNull();
  });

  it('syncNow(): a tombstoned day is a known date, so it is not re-pulled', async () => {
    service.permission.set('granted');
    const todayIso = today();
    const deletedDay = addDaysIso(todayIso, -3);
    // allKnownDates includes tombstoned rows — the deleted day must stay out of the backfill.
    repo.allKnownDates.and.resolveTo([deletedDay]);
    source.readDailySteps.and.resolveTo(4000);

    await service.syncNow();

    const upsertedDates = repo.maxWinsUpsert.calls.allArgs().map(([d]) => d as string);
    expect(upsertedDates).not.toContain(deletedDay);
  });

  it('syncNow(): skips a day Health Connect can not answer for', async () => {
    service.permission.set('granted');
    const todayIso = today();
    source.readDailySteps.and.callFake(async (date: string) => (date === todayIso ? 8000 : null));

    await service.syncNow();

    const upsertedDates = repo.maxWinsUpsert.calls.allArgs().map(([d]) => d as string);
    expect(upsertedDates).toEqual([todayIso]);
  });

  it('syncNow(): swallows a repository failure instead of rejecting (it is called fire-and-forget)', async () => {
    service.permission.set('granted');
    repo.load.and.rejectWith(new Error('sqlite is closed'));
    const consoleError = spyOn(console, 'error');

    await expectAsync(service.syncNow()).toBeResolved();
    expect(consoleError).toHaveBeenCalled();
    expect(service.lastSyncAt()).toBeNull();
  });

  it('resume: re-probes the grant before syncing, so a grant made from system settings is picked up', async () => {
    service.permission.set('denied');
    source.hasPermission.and.resolveTo(true);
    source.readDailySteps.and.resolveTo(0);

    await (service as unknown as { resumeSync(): Promise<void> }).resumeSync();

    expect(service.permission()).toBe('granted');
    expect(repo.load).toHaveBeenCalled();
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

  it('resume: reports backgroundPermission granted only when both the foreground and background grants are present', async () => {
    service.permission.set('denied');
    source.hasPermission.and.resolveTo(true);
    source.hasBackgroundPermission.and.resolveTo(true);
    source.readDailySteps.and.resolveTo(0);

    await (service as unknown as { resumeSync(): Promise<void> }).resumeSync();

    expect(service.backgroundPermission()).toBe('granted');
  });

  it('resume: backgroundPermission is denied when the foreground grant is missing (never probed)', async () => {
    service.permission.set('granted');
    source.hasPermission.and.resolveTo(false);
    source.hasBackgroundPermission.and.resolveTo(true);

    await (service as unknown as { resumeSync(): Promise<void> }).resumeSync();

    expect(service.backgroundPermission()).toBe('denied');
    expect(source.hasBackgroundPermission).not.toHaveBeenCalled();
  });

  it('requestBackgroundPermission(): no-op without the foreground grant', async () => {
    service.permission.set('denied');

    await service.requestBackgroundPermission();

    expect(source.requestBackgroundPermission).not.toHaveBeenCalled();
  });

  it('requestBackgroundPermission(): flips the signal on grant', async () => {
    service.permission.set('granted');
    source.requestBackgroundPermission.and.resolveTo(true);

    await service.requestBackgroundPermission();

    expect(service.backgroundPermission()).toBe('granted');
  });
});

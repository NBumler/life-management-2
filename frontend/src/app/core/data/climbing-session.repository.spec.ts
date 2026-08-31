import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { ClimbingSession } from '../../api/model/climbingSession';
import { ClimbingSessionDraft, StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { ClimbingSessionRepository } from './climbing-session.repository';

function session(overrides: Partial<ClimbingSession> = {}): ClimbingSession {
  return {
    id: 's1',
    date: '2026-08-20',
    locationType: ClimbingSession.LocationTypeEnum.Indoor,
    discipline: ClimbingSession.DisciplineEnum.Boulder,
    deleted: false,
    attempts: [],
    ...overrides,
  };
}

function draft(overrides: Partial<ClimbingSessionDraft> = {}): ClimbingSessionDraft {
  return {
    id: '',
    date: '2026-08-20',
    locationType: ClimbingSession.LocationTypeEnum.Indoor,
    discipline: ClimbingSession.DisciplineEnum.Boulder,
    totalSessionDurationMinutes: null,
    pumpRating: null,
    headspaceRating: null,
    notes: null,
    climbingPartners: null,
    weatherConditions: null,
    gymId: 'g1',
    gymName: 'Blokk',
    cragId: null,
    cragName: null,
    sectorId: null,
    sectorName: null,
    rockType: null,
    aspect: null,
    attempts: [],
    ...overrides,
  };
}

describe('ClimbingSessionRepository', () => {
  let repository: ClimbingSessionRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', [
      'listClimbingSessions',
      'saveClimbingSession',
      'deleteClimbingSession',
    ]);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(ClimbingSessionRepository);
  });

  it('load(): reads sessions and sorts them newest-first', async () => {
    storage.listClimbingSessions.and.resolveTo([
      session({ id: 'old', date: '2026-08-01' }),
      session({ id: 'new', date: '2026-08-31' }),
    ]);

    await repository.load();

    expect(repository.items().map((s) => s.id)).toEqual(['new', 'old']);
    expect(repository.loaded()).toBe(true);
  });

  it('forContext(): filters to live sessions of one dashboard context', async () => {
    storage.listClimbingSessions.and.resolveTo([
      session({ id: 'ib', locationType: ClimbingSession.LocationTypeEnum.Indoor, discipline: ClimbingSession.DisciplineEnum.Boulder }),
      session({ id: 'ir', locationType: ClimbingSession.LocationTypeEnum.Indoor, discipline: ClimbingSession.DisciplineEnum.Rope }),
      session({ id: 'gone', deleted: true }),
    ]);
    await repository.load();

    const rows = repository.forContext(ClimbingSession.LocationTypeEnum.Indoor, ClimbingSession.DisciplineEnum.Boulder);

    expect(rows.map((s) => s.id)).toEqual(['ib']);
  });

  it('save(): assigns a fresh id for a create and keeps the list sorted', async () => {
    storage.listClimbingSessions.and.resolveTo([session({ id: 'a', date: '2026-08-10' })]);
    await repository.load();
    storage.saveClimbingSession.and.callFake(async (d) => session({ id: d.id, date: d.date }));

    const saved = await repository.save(draft({ date: '2026-08-25' }));

    expect(saved.id).not.toBe('');
    expect(repository.items().map((s) => s.id)).toEqual([saved.id, 'a']);
  });

  it('remove(): deletes via the backend and drops it from the signal', async () => {
    storage.listClimbingSessions.and.resolveTo([session({ id: 'a' })]);
    await repository.load();
    storage.deleteClimbingSession.and.resolveTo(session({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteClimbingSession).toHaveBeenCalledWith('a');
  });

  it('drains on native for save + remove, not on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.saveClimbingSession.and.callFake(async (d) => session({ id: d.id || 'x' }));
    storage.deleteClimbingSession.and.resolveTo(session({ deleted: true }));

    await repository.save(draft({ id: 's1' }));
    await repository.remove('s1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('a DataChangeNotifier tick naming AscentAttempt (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listClimbingSessions.and.resolveTo([session({ id: 'a' })]);
    await repository.load();
    TestBed.flushEffects();

    TestBed.inject(DataChangeNotifier).notifyChanged(['AscentAttempt']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listClimbingSessions).toHaveBeenCalledTimes(2);
  });
});

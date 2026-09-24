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
    weatherConditions: [],
    gymId: 'g1',
    gymName: 'Blokk',
    cragId: null,
    cragName: null,
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

  it('partnerSuggestions(): distinct live-session partner names, most-used first then most-recent (backlog 069)', async () => {
    storage.listClimbingSessions.and.resolveTo([
      session({ id: 'a', date: '2026-08-01', climbingPartners: ['Anna', 'Béla'] }),
      session({ id: 'b', date: '2026-08-10', climbingPartners: ['anna', '  Cecil  '] }),
      session({ id: 'c', date: '2026-09-01', climbingPartners: ['Dóra'], deleted: true }),
      session({ id: 'd', date: '2026-08-20', climbingPartners: ['Béla', ' '] }),
    ]);
    await repository.load();

    // Anna/anna 2×; Béla 2× but its latest session (08-20) is newer than anna's (08-10); Cecil 1×; Dóra excluded (tombstone).
    // The most-recently-used spelling wins the dedup ('anna' from the 08-10 session, not 'Anna' from 08-01).
    expect(repository.partnerSuggestions()).toEqual(['Béla', 'anna', 'Cecil']);
  });

  describe('priorSuccessfulAscentDate() (backlog 092)', () => {
    function attempt(over: Partial<ClimbingSession['attempts'][number]> = {}): ClimbingSession['attempts'][number] {
      return { id: 'a1', sessionId: 's', isSuccess: true, orderIndex: 0, pitches: [], deleted: false, ...over };
    }

    beforeEach(async () => {
      storage.listClimbingSessions.and.resolveTo([
        session({ id: 'sent1', date: '2026-06-01', attempts: [attempt({ routeId: 'R', isSuccess: true })] }),
        session({ id: 'sent2', date: '2026-07-01', attempts: [attempt({ routeId: 'R', isSuccess: true })] }),
        session({ id: 'fail', date: '2026-07-15', attempts: [attempt({ routeId: 'R', isSuccess: false })] }),
        session({ id: 'other', date: '2026-06-10', attempts: [attempt({ routeId: 'OTHER', isSuccess: true })] }),
        session({ id: 'tomb', date: '2026-06-20', deleted: true, attempts: [attempt({ routeId: 'R', isSuccess: true })] }),
      ]);
      await repository.load();
    });

    it('returns the most recent earlier successful ascent of the same linked route', () => {
      expect(repository.priorSuccessfulAscentDate('R', '2026-08-01')).toBe('2026-07-01');
    });

    it('ignores sessions on or after the reference date, failures, and tombstones', () => {
      // only sent1 (06-01) is strictly before 06-15; sent2/fail are later, tomb is deleted.
      expect(repository.priorSuccessfulAscentDate('R', '2026-06-15')).toBe('2026-06-01');
    });

    it('excludes the session being edited', () => {
      expect(repository.priorSuccessfulAscentDate('R', '2026-08-01', 'sent2')).toBe('2026-06-01');
    });

    it('returns null for an ad-hoc attempt (no ref) or an unclimbed route', () => {
      expect(repository.priorSuccessfulAscentDate(null, '2026-08-01')).toBeNull();
      expect(repository.priorSuccessfulAscentDate('NEVER', '2026-08-01')).toBeNull();
    });
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

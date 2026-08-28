import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { WorkoutSession } from '../../api/model/workoutSession';
import { StorageBackend, STORAGE_BACKEND, WorkoutSessionDraft } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { WorkoutSessionRepository, byWorkoutRecency } from './workout-session.repository';

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    date: '2026-08-28',
    startTime: null,
    endTime: null,
    durationMinutes: null,
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    title: null,
    notes: null,
    location: null,
    planId: null,
    roundsCount: null,
    exercises: [],
    deleted: false,
    ...overrides,
  };
}

function draft(overrides: Partial<WorkoutSessionDraft> = {}): WorkoutSessionDraft {
  return {
    id: '',
    date: '2026-08-28',
    startTime: null,
    endTime: null,
    durationMinutes: null,
    workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
    title: null,
    notes: null,
    location: null,
    planId: null,
    roundsCount: null,
    exercises: [],
    ...overrides,
  };
}

describe('byWorkoutRecency', () => {
  it('orders newer session dates first', () => {
    const rows = [session({ id: 'a', date: '2026-08-01' }), session({ id: 'b', date: '2026-08-20' })].sort(byWorkoutRecency);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('breaks a same-day tie by createdAt desc', () => {
    const rows = [
      session({ id: 'a', date: '2026-08-20', createdAt: '2026-08-20T08:00:00Z' }),
      session({ id: 'b', date: '2026-08-20', createdAt: '2026-08-20T18:00:00Z' }),
    ].sort(byWorkoutRecency);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('WorkoutSessionRepository', () => {
  let repository: WorkoutSessionRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listWorkoutSessions', 'saveWorkoutSession', 'deleteWorkoutSession']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(WorkoutSessionRepository);
  });

  it('load(): reads sessions and sorts them newest first', async () => {
    storage.listWorkoutSessions.and.resolveTo([session({ id: 'a', date: '2026-08-01' }), session({ id: 'b', date: '2026-08-20' })]);

    await repository.load();

    expect(repository.items().map((s) => s.id)).toEqual(['b', 'a']);
    expect(repository.loaded()).toBeTrue();
  });

  it('save(): creates a session with a fresh id when none is given', async () => {
    storage.listWorkoutSessions.and.resolveTo([]);
    await repository.load();
    storage.saveWorkoutSession.and.resolveTo(session({ id: 'new-1' }));

    const saved = await repository.save(draft());

    expect(storage.saveWorkoutSession).toHaveBeenCalled();
    expect(storage.saveWorkoutSession.calls.mostRecent().args[0].id).not.toBe('');
    expect(saved.id).toBe('new-1');
    expect(repository.items().map((s) => s.id)).toEqual(['new-1']);
  });

  it('save(): keeps an explicit id for an update', async () => {
    storage.listWorkoutSessions.and.resolveTo([session({ id: 'existing' })]);
    await repository.load();
    storage.saveWorkoutSession.and.resolveTo(session({ id: 'existing', title: 'Leg day' }));

    const saved = await repository.save(draft({ id: 'existing', title: 'Leg day' }));

    expect(storage.saveWorkoutSession.calls.mostRecent().args[0].id).toBe('existing');
    expect(saved.title).toBe('Leg day');
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listWorkoutSessions.and.resolveTo([session({ id: 'a' })]);
    await repository.load();
    storage.deleteWorkoutSession.and.resolveTo(session({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteWorkoutSession).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listWorkoutSessions.and.resolveTo([session({ id: 's1' })]);
    await repository.load();
    storage.saveWorkoutSession.and.resolveTo(session({ id: 's1' }));
    storage.deleteWorkoutSession.and.resolveTo(session({ id: 's1', deleted: true }));

    await repository.save(draft({ id: 's1' }));
    await repository.remove('s1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listWorkoutSessions.and.resolveTo([session({ id: 's1' })]);
    await repository.load();
    storage.saveWorkoutSession.and.resolveTo(session({ id: 's1' }));

    await repository.save(draft({ id: 's1' }));

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });

  it('a DataChangeNotifier tick naming WorkoutSession (post-pull) invalidates the native cache', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listWorkoutSessions.and.resolveTo([session({ id: 's1', updatedAt: 'v1' })]);
    await repository.load();
    TestBed.flushEffects();
    storage.listWorkoutSessions.and.resolveTo([session({ id: 's1', updatedAt: 'v2' })]);

    TestBed.inject(DataChangeNotifier).notifyChanged(['WorkoutSession']);
    TestBed.flushEffects();
    await new Promise((resolve) => setTimeout(resolve));

    expect(storage.listWorkoutSessions).toHaveBeenCalledTimes(2);
  });
});

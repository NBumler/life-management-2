import { TestBed } from '@angular/core/testing';

import { StretchSession } from '../../api/model/stretchSession';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { StretchSessionRepository } from './stretch-session.repository';

const session = (id: string, date: string, overrides: Partial<StretchSession> = {}): StretchSession => ({
  id,
  date,
  durationMinutes: 10,
  deleted: false,
  items: [],
  ...overrides,
});

describe('StretchSessionRepository (backlog/169)', () => {
  let repository: StretchSessionRepository;
  let storage: jasmine.SpyObj<StorageBackend>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listStretchSessions', 'saveStretchSession', 'deleteStretchSession']);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(StretchSessionRepository);
  });

  it('load(): newest day first; byWorkoutSession() finds the live stretch of a strength session', async () => {
    storage.listStretchSessions.and.resolveTo([
      session('old', '2026-10-15'),
      session('new', '2026-10-17', { workoutSessionId: 'w1' }),
      session('gone', '2026-10-16', { workoutSessionId: 'w2', deleted: true }),
    ]);

    await repository.load();

    expect(repository.items().map((s) => s.id)).toEqual(['new', 'gone', 'old']);
    expect(repository.byWorkoutSession('w1')?.id).toBe('new');
    expect(repository.byWorkoutSession('w2')).toBeUndefined();
  });

  it('save() then remove() keep items() in step with the store', async () => {
    storage.saveStretchSession.and.callFake(async (draft) => session(draft.id, draft.date));
    storage.deleteStretchSession.and.resolveTo(session('x', '2026-10-17', { deleted: true }));

    const saved = await repository.save({
      id: '',
      date: '2026-10-17',
      startTime: null,
      endTime: null,
      durationMinutes: 10,
      stretchPlanId: null,
      workoutSessionId: null,
      notes: null,
      items: [],
    });
    expect(saved.id).toBeTruthy();
    expect(repository.items().length).toBe(1);

    await repository.remove(saved.id);
    expect(repository.items()).toEqual([]);
  });
});

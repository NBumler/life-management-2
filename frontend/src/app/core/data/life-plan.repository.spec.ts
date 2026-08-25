import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { LifePlan } from '../../api/model/lifePlan';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { LifePlanRepository, computeLifePlanCompletedAt } from './life-plan.repository';

function plan(overrides: Partial<LifePlan> = {}): LifePlan {
  return { id: 'p1', title: 'Motoros jogosítvány', notes: null, status: LifePlan.StatusEnum.Planned, targetDate: null, completedAt: null, deleted: false, ...overrides };
}

describe('computeLifePlanCompletedAt', () => {
  it('sets a timestamp when moving into DONE from a non-DONE status', () => {
    expect(computeLifePlanCompletedAt(LifePlan.StatusEnum.Planned, LifePlan.StatusEnum.Done, null)).not.toBeNull();
  });

  it('sets a timestamp when creating directly as DONE (no previous status)', () => {
    expect(computeLifePlanCompletedAt(null, LifePlan.StatusEnum.Done, null)).not.toBeNull();
  });

  it('clears completedAt when leaving DONE', () => {
    expect(computeLifePlanCompletedAt(LifePlan.StatusEnum.Done, LifePlan.StatusEnum.Planned, '2026-01-01T00:00:00Z')).toBeNull();
  });

  it('leaves completedAt untouched for any other transition', () => {
    expect(computeLifePlanCompletedAt(LifePlan.StatusEnum.Planned, LifePlan.StatusEnum.InProgress, null)).toBeNull();
    expect(computeLifePlanCompletedAt(LifePlan.StatusEnum.Done, LifePlan.StatusEnum.Done, '2026-01-01T00:00:00Z')).toBe('2026-01-01T00:00:00Z');
  });
});

describe('LifePlanRepository', () => {
  let repository: LifePlanRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listLifePlans', 'upsertLifePlan', 'deleteLifePlan']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(LifePlanRepository);
  });

  it('load(): reads all plans from the storage backend', async () => {
    storage.listLifePlans.and.resolveTo([plan({ id: 'a' }), plan({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((p) => p.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new plan with a fresh id when none is given', async () => {
    storage.upsertLifePlan.and.resolveTo(plan({ id: 'new-1' }));

    const saved = await repository.save({ title: 'Rope-solo', notes: null, status: LifePlan.StatusEnum.Planned, targetDate: null });

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((p) => p.id)).toEqual(['new-1']);
  });

  it('save(): computes completedAt from the previously loaded state when the status changes to DONE', async () => {
    storage.listLifePlans.and.resolveTo([plan({ id: 'p1', status: LifePlan.StatusEnum.InProgress })]);
    await repository.load();
    storage.upsertLifePlan.and.callFake(async (draft) => draft);

    await repository.save({ id: 'p1', title: 'Motoros jogosítvány', notes: null, status: LifePlan.StatusEnum.Done, targetDate: null });

    const sentDraft = storage.upsertLifePlan.calls.mostRecent().args[0] as LifePlan;
    expect(sentDraft.completedAt).not.toBeNull();
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listLifePlans.and.resolveTo([plan({ id: 'a' })]);
    await repository.load();
    storage.deleteLifePlan.and.resolveTo(plan({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteLifePlan).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertLifePlan.and.resolveTo(plan());
    storage.deleteLifePlan.and.resolveTo(plan({ deleted: true }));

    await repository.save({ title: 'X', notes: null, status: LifePlan.StatusEnum.Planned, targetDate: null });
    await repository.remove('p1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertLifePlan.and.resolveTo(plan());

    await repository.save({ title: 'X', notes: null, status: LifePlan.StatusEnum.Planned, targetDate: null });

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

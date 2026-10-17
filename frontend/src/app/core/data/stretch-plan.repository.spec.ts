import { TestBed } from '@angular/core/testing';

import { StretchPlan } from '../../api/model/stretchPlan';
import { StretchPlanItem } from '../../api/model/stretchPlanItem';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { StretchPlanRepository, liveStretchItems } from './stretch-plan.repository';

function item(id: string, orderIndex: number, deleted = false): StretchPlanItem {
  return {
    id,
    planId: 'p1',
    stretchExerciseId: `ex-${id}`,
    stretchName: id,
    stretchCategory: StretchPlanItem.StretchCategoryEnum.Legs,
    orderIndex,
    holdSeconds: 30,
    perSide: true,
    repetitions: 2,
    notes: null,
    deleted,
  };
}

function plan(overrides: Partial<StretchPlan> = {}): StretchPlan {
  return { id: 'p1', name: 'Esti', active: true, deleted: false, items: [], ...overrides };
}

describe('StretchPlanRepository (backlog/168)', () => {
  let repository: StretchPlanRepository;
  let storage: jasmine.SpyObj<StorageBackend>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listStretchPlans', 'saveStretchPlan', 'deleteStretchPlan']);
    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']) },
      ],
    });
    repository = TestBed.inject(StretchPlanRepository);
  });

  it('load(): oldest first; activePlans() drops inactive and deleted ones', async () => {
    storage.listStretchPlans.and.resolveTo([
      plan({ id: 'b', createdAt: '2026-10-02T00:00:00Z' }),
      plan({ id: 'a', createdAt: '2026-10-01T00:00:00Z', active: false }),
      plan({ id: 'c', createdAt: '2026-10-03T00:00:00Z', deleted: true }),
    ]);

    await repository.load();

    expect(repository.items().map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(repository.activePlans().map((p) => p.id)).toEqual(['b']);
  });

  it('save(): a draft without an id gets a fresh one', async () => {
    storage.saveStretchPlan.and.callFake(async (draft) => plan({ id: draft.id }));

    const saved = await repository.save({ id: '', name: 'Új', notes: null, active: true, goalLabel: null, items: [] });

    expect(saved.id).toBeTruthy();
    expect(repository.items().map((p) => p.id)).toEqual([saved.id]);
  });

  it('setActive(): re-sends only the live items in order, with the flag flipped', async () => {
    storage.saveStretchPlan.and.callFake(async (draft) => plan({ id: draft.id, active: draft.active }));
    const existing = plan({ items: [item('second', 1), item('gone', 0, true), item('first', 0)] });

    await repository.setActive(existing, false);

    const draft = storage.saveStretchPlan.calls.mostRecent().args[0];
    expect(draft.active).toBe(false);
    expect(draft.items.map((i) => i.id)).toEqual(['first', 'second']);
    expect(draft.items[0]).toEqual(jasmine.objectContaining({ holdSeconds: 30, perSide: true, repetitions: 2 }));
  });

  it('liveStretchItems(): live rows only, by orderIndex', () => {
    expect(liveStretchItems(plan({ items: [item('b', 2), item('x', 0, true), item('a', 1)] })).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('remove(): deletes through the backend and drops the plan', async () => {
    storage.listStretchPlans.and.resolveTo([plan()]);
    await repository.load();
    storage.deleteStretchPlan.and.resolveTo(plan({ deleted: true }));

    await repository.remove('p1');

    expect(storage.deleteStretchPlan).toHaveBeenCalledWith('p1');
    expect(repository.items()).toEqual([]);
  });
});

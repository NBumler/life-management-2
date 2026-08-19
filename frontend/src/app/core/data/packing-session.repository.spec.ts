import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { PackingTemplateRepository } from './packing-template.repository';
import { PackingSessionRepository } from './packing-session.repository';

describe('PackingSessionRepository', () => {
  let repository: PackingSessionRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;
  let templateRepository: jasmine.SpyObj<Pick<PackingTemplateRepository, 'getDetail'>>;

  function session(overrides: Partial<PackingSession> = {}): PackingSession {
    return { id: 's1', destination: null, sourceTemplateIds: [], deleted: false, ...overrides };
  }

  function sessionDetail(overrides: Partial<PackingSessionDetail> = {}): PackingSessionDetail {
    return { id: 's1', destination: null, sourceTemplateIds: [], deleted: false, items: [], ...overrides };
  }

  function templateDetail(overrides: Partial<PackingTemplateDetail> = {}): PackingTemplateDetail {
    return { id: 't1', name: 'Tél', notes: null, deleted: false, items: [], ...overrides };
  }

  function sessionItem(overrides: Partial<PackingSessionItem> = {}): PackingSessionItem {
    return { id: 'i1', sessionId: 's1', gearItemId: 'g1', status: PackingSessionItem.StatusEnum.NotPacked, sortOrder: 0, deleted: false, ...overrides };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', [
      'listPackingSessions',
      'getPackingSessionDetail',
      'startPackingSession',
      'updatePackingSessionDestination',
      'closePackingSession',
      'addPackingSessionItem',
      'updatePackingSessionItem',
    ]);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);
    templateRepository = jasmine.createSpyObj('PackingTemplateRepository', ['getDetail']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
        { provide: PackingTemplateRepository, useValue: templateRepository },
      ],
    });
    repository = TestBed.inject(PackingSessionRepository);
  });

  it('load(): reads all sessions from the storage backend', async () => {
    storage.listPackingSessions.and.resolveTo([session({ id: 'a' }), session({ id: 'b' })]);

    await repository.load();

    expect(repository.sessions().map((s) => s.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  describe('start()', () => {
    it('unions the live items of the chosen templates, deduping by gearItemId (first occurrence wins)', async () => {
      templateRepository.getDetail.and.callFake((id: string) =>
        Promise.resolve(
          id === 't1'
            ? templateDetail({
                id: 't1',
                items: [
                  { id: 'ti1', templateId: 't1', gearItemId: 'g1', sortOrder: 0, deleted: false },
                  { id: 'ti2', templateId: 't1', gearItemId: 'g2', sortOrder: 1, deleted: false },
                ],
              })
            : templateDetail({
                id: 't2',
                items: [
                  { id: 'ti3', templateId: 't2', gearItemId: 'g2', sortOrder: 0, deleted: false }, // duplicate of g2 — dropped
                  { id: 'ti4', templateId: 't2', gearItemId: 'g3', sortOrder: 1, deleted: false },
                ],
              }),
        ),
      );
      storage.startPackingSession.and.callFake((draft) => Promise.resolve(sessionDetail({ id: draft.id, items: [] })));

      await repository.start(['t1', 't2'], 'Tátra');

      const draft = storage.startPackingSession.calls.mostRecent().args[0];
      expect(draft.items.map((i) => i.gearItemId)).toEqual(['g1', 'g2', 'g3']);
      expect(draft.sourceTemplateIds).toEqual(['t1', 't2']);
      expect(draft.destination).toBe('Tátra');
    });

    it('excludes soft-deleted template items from the union', async () => {
      templateRepository.getDetail.and.resolveTo(
        templateDetail({
          items: [
            { id: 'ti1', templateId: 't1', gearItemId: 'g1', sortOrder: 0, deleted: false },
            { id: 'ti2', templateId: 't1', gearItemId: 'g2', sortOrder: 1, deleted: true },
          ],
        }),
      );
      storage.startPackingSession.and.callFake((draft) => Promise.resolve(sessionDetail({ id: draft.id, items: [] })));

      await repository.start(['t1'], null);

      const draft = storage.startPackingSession.calls.mostRecent().args[0];
      expect(draft.items.map((i) => i.gearItemId)).toEqual(['g1']);
    });

    it('adds the new session to the summary list', async () => {
      storage.listPackingSessions.and.resolveTo([]);
      await repository.load();
      templateRepository.getDetail.and.resolveTo(templateDetail({ items: [] }));
      storage.startPackingSession.and.resolveTo(sessionDetail({ id: 'new-1', destination: 'X' }));

      await repository.start([], 'X');

      expect(repository.sessions().map((s) => s.id)).toEqual(['new-1']);
    });
  });

  it('close(): closes via the storage backend and drops it from the signal', async () => {
    storage.listPackingSessions.and.resolveTo([session({ id: 'a' })]);
    await repository.load();
    storage.closePackingSession.and.resolveTo(session({ id: 'a', deleted: true }));

    await repository.close('a');

    expect(repository.sessions()).toEqual([]);
    expect(storage.closePackingSession).toHaveBeenCalledWith('a');
  });

  it('updateItemStatus(): persists the new status via the storage backend', async () => {
    const updated = sessionItem({ status: PackingSessionItem.StatusEnum.Packed });
    storage.updatePackingSessionItem.and.resolveTo(updated);

    const result = await repository.updateItemStatus(sessionItem(), PackingSessionItem.StatusEnum.Packed);

    expect(result.status).toBe(PackingSessionItem.StatusEnum.Packed);
    expect(storage.updatePackingSessionItem).toHaveBeenCalledWith(jasmine.objectContaining({ status: PackingSessionItem.StatusEnum.Packed }));
  });

  describe('reorderItems()', () => {
    it('only persists items whose index actually changed', async () => {
      storage.updatePackingSessionItem.and.callFake((item) => Promise.resolve(item));
      // Original order (by sortOrder): i1(0), i2(1), i3(2). New order passed in: i1, i3, i2 — i1
      // stays at index 0 (unchanged), i3 moves from 2 to index 1, i2 moves from 1 to index 2.
      const unchanged = sessionItem({ id: 'i1', sortOrder: 0 });
      const moved = sessionItem({ id: 'i2', sortOrder: 1 });
      const alsoMoved = sessionItem({ id: 'i3', sortOrder: 2 });

      await repository.reorderItems([unchanged, alsoMoved, moved]);

      expect(storage.updatePackingSessionItem).toHaveBeenCalledTimes(2);
      const calledIds = storage.updatePackingSessionItem.calls.allArgs().map(([item]) => item.id);
      expect(calledIds).toEqual(['i3', 'i2']);
    });

    it('does nothing and does not trigger a drain when the order is unchanged', async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      const items = [sessionItem({ id: 'i1', sortOrder: 0 }), sessionItem({ id: 'i2', sortOrder: 1 })];

      const result = await repository.reorderItems(items);

      expect(result).toEqual([]);
      expect(storage.updatePackingSessionItem).not.toHaveBeenCalled();
      expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
    });
  });

  it('triggers a debounced drain on native for close() and updateItemStatus()', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listPackingSessions.and.resolveTo([session({ id: 'a' })]);
    await repository.load();
    storage.closePackingSession.and.resolveTo(session({ id: 'a', deleted: true }));
    storage.updatePackingSessionItem.and.resolveTo(sessionItem());

    await repository.close('a');
    await repository.updateItemStatus(sessionItem(), PackingSessionItem.StatusEnum.Packed);

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.updatePackingSessionItem.and.resolveTo(sessionItem());

    await repository.updateItemStatus(sessionItem(), PackingSessionItem.StatusEnum.Packed);

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

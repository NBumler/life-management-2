import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { PackingTemplateNameConflictError, PackingTemplateRepository } from './packing-template.repository';

describe('PackingTemplateRepository', () => {
  let repository: PackingTemplateRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  function template(overrides: Partial<PackingTemplate> = {}): PackingTemplate {
    return { id: 't1', name: 'Tél', notes: null, deleted: false, ...overrides };
  }

  function detail(overrides: Partial<PackingTemplateDetail> = {}): PackingTemplateDetail {
    return { id: 't1', name: 'Tél', notes: null, deleted: false, items: [], ...overrides };
  }

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', [
      'listPackingTemplates',
      'getPackingTemplateDetail',
      'savePackingTemplate',
      'deletePackingTemplate',
    ]);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(PackingTemplateRepository);
  });

  it('load(): reads all templates from the storage backend', async () => {
    storage.listPackingTemplates.and.resolveTo([template({ id: 'a', name: 'Alfa' }), template({ id: 'b', name: 'Béta' })]);

    await repository.load();

    expect(repository.templates().map((t) => t.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new template with a fresh id when none is given, adding it to the loaded summary list', async () => {
    storage.listPackingTemplates.and.resolveTo([]);
    await repository.load();
    storage.savePackingTemplate.and.resolveTo(detail({ id: 'new-1', name: 'Bundazsák' }));

    const saved = await repository.save({ name: 'Bundazsák', notes: null, items: [] });

    expect(saved.id).toBe('new-1');
    expect(repository.templates().map((t) => t.id)).toEqual(['new-1']);
  });

  it('save(): reflects the saved tree\'s live item count on the refreshed summary row (backlog/026)', async () => {
    storage.listPackingTemplates.and.resolveTo([]);
    await repository.load();
    storage.savePackingTemplate.and.resolveTo(
      detail({
        id: 'new-1',
        name: 'Bundazsák',
        items: [
          { id: 'i1', templateId: 'new-1', gearItemId: 'g1', sortOrder: 0, deleted: false },
          { id: 'i2', templateId: 'new-1', gearItemId: 'g2', sortOrder: 1, deleted: false },
          { id: 'i3', templateId: 'new-1', gearItemId: 'g3', sortOrder: 2, deleted: true }, // tombstone, not counted
        ],
      }),
    );

    await repository.save({ name: 'Bundazsák', notes: null, items: [] });

    expect(repository.templates()[0].itemCount).toBe(2);
  });

  it('save(): throws PackingTemplateNameConflictError before writing, when another live template has the same normalized name', async () => {
    storage.listPackingTemplates.and.resolveTo([template({ id: 'existing', name: 'Tél' })]);
    await repository.load();

    await expectAsync(repository.save({ name: 'tél', notes: null, items: [] })).toBeRejectedWith(
      jasmine.any(PackingTemplateNameConflictError),
    );
    expect(storage.savePackingTemplate).not.toHaveBeenCalled();
  });

  it('save(): allows renaming a template to its own current name', async () => {
    storage.listPackingTemplates.and.resolveTo([template({ id: 'existing', name: 'Tél' })]);
    await repository.load();
    storage.savePackingTemplate.and.resolveTo(detail({ id: 'existing', name: 'Tél' }));

    const saved = await repository.save({ id: 'existing', name: 'Tél', notes: null, items: [] });

    expect(saved.id).toBe('existing');
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listPackingTemplates.and.resolveTo([template({ id: 'a' })]);
    await repository.load();
    storage.deletePackingTemplate.and.resolveTo(detail({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.templates()).toEqual([]);
    expect(storage.deletePackingTemplate).toHaveBeenCalledWith('a');
  });

  describe('duplicate()', () => {
    it('copies the live items with fresh ids and a "(másolat)" name, going through save()', async () => {
      storage.listPackingTemplates.and.resolveTo([template({ id: 't1', name: 'Tél' })]);
      await repository.load();
      storage.getPackingTemplateDetail.and.resolveTo(
        detail({
          id: 't1',
          name: 'Tél',
          items: [
            { id: 'i1', templateId: 't1', gearItemId: 'g1', sortOrder: 0, deleted: false },
            { id: 'i2', templateId: 't1', gearItemId: 'g2', sortOrder: 1, deleted: true }, // must be excluded
          ],
        }),
      );
      storage.savePackingTemplate.and.callFake((draft) => Promise.resolve(detail({ id: draft.id, name: draft.name, items: [] })));

      const duplicated = await repository.duplicate('t1');

      expect(duplicated.name).toBe('Tél (másolat)');
      const saveArg = storage.savePackingTemplate.calls.mostRecent().args[0];
      expect(saveArg.items).toHaveSize(1);
      expect(saveArg.items[0].gearItemId).toBe('g1');
      expect(saveArg.items[0].id).not.toBe('i1'); // fresh id, not reused
    });

    it('auto-numbers the copy name when "(másolat)" already exists', async () => {
      storage.listPackingTemplates.and.resolveTo([template({ id: 't1', name: 'Tél' }), template({ id: 't2', name: 'Tél (másolat)' })]);
      await repository.load();
      storage.getPackingTemplateDetail.and.resolveTo(detail({ id: 't1', name: 'Tél', items: [] }));
      storage.savePackingTemplate.and.callFake((draft) => Promise.resolve(detail({ id: draft.id, name: draft.name, items: [] })));

      const duplicated = await repository.duplicate('t1');

      expect(duplicated.name).toBe('Tél (másolat) 2');
    });
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.listPackingTemplates.and.resolveTo([]);
    await repository.load();
    storage.savePackingTemplate.and.resolveTo(detail());
    storage.deletePackingTemplate.and.resolveTo(detail({ deleted: true }));

    await repository.save({ name: 'Tél', notes: null, items: [] });
    await repository.remove('t1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.listPackingTemplates.and.resolveTo([]);
    await repository.load();
    storage.savePackingTemplate.and.resolveTo(detail());

    await repository.save({ name: 'Tél', notes: null, items: [] });

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});

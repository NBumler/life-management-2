import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AuthSessionService } from '../../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../../core/storage/local-database.service';
import { STORAGE_BACKEND, StorageBackend } from '../../../core/storage/storage-backend';
import { OfflineQueueService } from '../../../core/sync/offline-queue.service';
import { OutboxEntityDescriptor, OutboxEntityRegistryService } from '../../../core/sync/outbox-entity-registry';
import { OutboxItem } from '../../../core/sync/outbox-item';
import { SyncEngineService } from '../../../core/sync/sync-engine.service';
import { SyncPage } from './sync.page';

// documentation/Features/Szinkronizációs központ.md: this page's Fix/Drop/Unskip logic used to hand-list
// entity types itself (only UserProfile/WeightHistoryEntry — every GearCheck entity silently fell
// through). It now defers entirely to OutboxEntityRegistryService, whose own correctness is covered by
// outbox-entity-registry.spec.ts — these tests only check that the page *uses* that registry correctly.
describe('SyncPage', () => {
  let fixture: ComponentFixture<SyncPage>;
  let offlineQueue: jasmine.SpyObj<Pick<OfflineQueueService, 'listAll' | 'refreshCounts' | 'skip' | 'unskip' | 'fix' | 'drop' | 'findDependents'>> & {
    items: ReturnType<typeof signal<OutboxItem[]>>;
    pendingCount: ReturnType<typeof signal<number>>;
    errorCount: ReturnType<typeof signal<number>>;
  };
  let syncEngine: {
    requestDrain: jasmine.Spy;
    connectionState: ReturnType<typeof signal<string>>;
    draining: ReturnType<typeof signal<boolean>>;
    lastSuccessfulSyncAt: ReturnType<typeof signal<string | null>>;
  };
  let entityRegistry: jasmine.SpyObj<OutboxEntityRegistryService>;
  let alertController: jasmine.SpyObj<AlertController>;
  let toastController: jasmine.SpyObj<ToastController>;

  function outboxItem(overrides: Partial<OutboxItem> = {}): OutboxItem {
    return {
      sequence: 1,
      id: 'item-1',
      createdAt: new Date().toISOString(),
      userId: 'user-1',
      method: 'PUT',
      url: '/api/gear-items/entity-x',
      payload: { id: 'entity-x', name: 'Kötél', notes: null },
      payloadVersion: 1,
      entityType: 'GearItem',
      targetEntityId: 'entity-x',
      dependsOn: [],
      status: 'ERROR',
      attemptCount: 1,
      lastAttemptAt: null,
      httpStatus: 422,
      errorCode: 'UNIQUE_VIOLATION',
      errorMessage: 'már foglalt',
      errorField: 'name',
      ...overrides,
    };
  }

  function descriptor(overrides: Partial<OutboxEntityDescriptor> = {}): OutboxEntityDescriptor {
    return {
      table: 'gear_item',
      currentPayload: async () => null,
      buildFixWriteTask: (payload) => ({ statement: 'UPDATE gear_item SET name = ?', values: [payload['name']] }),
      nameUniqueness: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    offlineQueue = jasmine.createSpyObj('OfflineQueueService', ['listAll', 'refreshCounts', 'skip', 'unskip', 'fix', 'drop', 'findDependents']) as never;
    offlineQueue.items = signal<OutboxItem[]>([]);
    offlineQueue.pendingCount = signal(0);
    offlineQueue.errorCount = signal(0);
    offlineQueue.findDependents.and.resolveTo([]);

    syncEngine = {
      requestDrain: jasmine.createSpy('requestDrain'),
      connectionState: signal('ONLINE'),
      draining: signal(false),
      lastSuccessfulSyncAt: signal<string | null>(null),
    };

    entityRegistry = jasmine.createSpyObj('OutboxEntityRegistryService', ['get']);
    entityRegistry.get.and.returnValue(descriptor());

    alertController = jasmine.createSpyObj('AlertController', ['create']);
    toastController = jasmine.createSpyObj('ToastController', ['create']);

    await TestBed.configureTestingModule({
      imports: [SyncPage],
      providers: [
        provideTranslateService(),
        { provide: OfflineQueueService, useValue: offlineQueue },
        { provide: SyncEngineService, useValue: syncEngine },
        { provide: AuthSessionService, useValue: { userId: () => 'user-1' } as unknown as AuthSessionService },
        { provide: LocalDatabaseService, useValue: jasmine.createSpyObj('LocalDatabaseService', ['query']) },
        { provide: STORAGE_BACKEND, useValue: jasmine.createSpyObj('StorageBackend', ['getPackingTemplateDetail', 'getPackingSessionDetail']) as StorageBackend },
        { provide: OutboxEntityRegistryService, useValue: entityRegistry },
        { provide: AlertController, useValue: alertController },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncPage);
  });

  describe('fixEditable — gates the Fix button per registry entry, not per status alone', () => {
    it('is true when the registry has Fix support for the entity type', () => {
      entityRegistry.get.and.returnValue(descriptor({ buildFixWriteTask: (p) => ({ statement: '', values: [p] }) }));
      expect(fixture.componentInstance.fixEditable('GearItem')).toBe(true);
    });

    it('is false for a nested-aggregate entity (e.g. PackingTemplate) — matches Szinkronizációs központ.md "Fix szerkesztő"', () => {
      entityRegistry.get.and.returnValue(descriptor({ buildFixWriteTask: null }));
      expect(fixture.componentInstance.fixEditable('PackingTemplate')).toBe(false);
    });
  });

  describe('submitFix', () => {
    it('resolves the write task from the registry and calls offlineQueue.fix with it', async () => {
      const writeTask = { statement: 'UPDATE gear_item SET name = ?', values: ['Sisak'] };
      entityRegistry.get.and.returnValue(descriptor({ buildFixWriteTask: () => writeTask }));
      const item = outboxItem();
      fixture.componentInstance.startFix(item);
      fixture.componentInstance.fixForm.patchValue({ name: 'Sisak' });

      await fixture.componentInstance.submitFix();

      expect(offlineQueue.fix).toHaveBeenCalledWith(item, jasmine.objectContaining({ name: 'Sisak' }), writeTask);
    });

    it('does nothing when the entity type has no Fix support (defensive — the button is hidden, but guards anyway)', async () => {
      entityRegistry.get.and.returnValue(descriptor({ buildFixWriteTask: null }));
      const item = outboxItem({ entityType: 'PackingTemplate' });
      fixture.componentInstance.startFix(item);

      await fixture.componentInstance.submitFix();

      expect(offlineQueue.fix).not.toHaveBeenCalled();
    });

    it('blocks the save and flags a conflict when the registry finds a name collision, without touching the outbox', async () => {
      entityRegistry.get.and.returnValue(
        descriptor({
          nameUniqueness: { field: 'name', findConflict: async () => 'other-item-id' },
        }),
      );
      const item = outboxItem();
      fixture.componentInstance.startFix(item);
      fixture.componentInstance.fixForm.patchValue({ name: 'Sisak' });

      await fixture.componentInstance.submitFix();

      expect(offlineQueue.fix).not.toHaveBeenCalled();
      expect(fixture.componentInstance.fixNameConflict()).toBe(true);
    });

    it('proceeds when the registry reports no conflict', async () => {
      const writeTask = { statement: 'UPDATE gear_item SET name = ?', values: ['Sisak'] };
      entityRegistry.get.and.returnValue(
        descriptor({
          buildFixWriteTask: () => writeTask,
          nameUniqueness: { field: 'name', findConflict: async () => null },
        }),
      );
      const item = outboxItem();
      fixture.componentInstance.startFix(item);
      fixture.componentInstance.fixForm.patchValue({ name: 'Sisak' });

      await fixture.componentInstance.submitFix();

      expect(offlineQueue.fix).toHaveBeenCalled();
      expect(fixture.componentInstance.fixNameConflict()).toBe(false);
    });
  });

  describe('drop', () => {
    it('builds the drop task from the registry-resolved table, not a hardcoded one', async () => {
      entityRegistry.get.and.returnValue(descriptor({ table: 'packing_session' }));
      offlineQueue.drop.and.resolveTo([]);
      const created = { present: jasmine.createSpy('present').and.resolveTo() };
      alertController.create.and.resolveTo(created as never);
      const item = outboxItem({ entityType: 'PackingSession', method: 'PUT', targetEntityId: 'sess-1' });

      await fixture.componentInstance.drop(item);
      const options = alertController.create.calls.mostRecent().args[0] as { buttons: { handler?: () => void }[] };
      options.buttons[1].handler?.();
      await Promise.resolve();

      const [, entityTasks] = offlineQueue.drop.calls.mostRecent().args;
      const [entityTask] = Array.isArray(entityTasks) ? entityTasks : [entityTasks];
      expect(entityTask.statement).toContain('UPDATE packing_session SET _needs_refetch = 1, _dirty = 0');
      expect(entityTask.values).toEqual(['sess-1']);
    });
  });

  describe('syncNow', () => {
    it('starts a drain when online', async () => {
      syncEngine.connectionState.set('ONLINE');
      await fixture.componentInstance.syncNow();
      expect(syncEngine.requestDrain).toHaveBeenCalled();
      expect(toastController.create).not.toHaveBeenCalled();
    });

    it('shows feedback and leaves the queue untouched when there is no backend (documentation/Features/Szinkronizációs központ.md)', async () => {
      syncEngine.connectionState.set('BACKEND_OFFLINE');
      const toast = { present: jasmine.createSpy('present').and.resolveTo() };
      toastController.create.and.resolveTo(toast as never);

      await fixture.componentInstance.syncNow();

      expect(syncEngine.requestDrain).not.toHaveBeenCalled();
      expect(toastController.create).toHaveBeenCalled();
      expect(toast.present).toHaveBeenCalled();
    });
  });
});

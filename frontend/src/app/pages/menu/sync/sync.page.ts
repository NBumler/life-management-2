import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthSessionService } from '../../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../../core/storage/local-database.service';
import { STORAGE_BACKEND } from '../../../core/storage/storage-backend';
import { OfflineQueueService } from '../../../core/sync/offline-queue.service';
import { buildOutboxDropTask, OutboxEntityRegistryService } from '../../../core/sync/outbox-entity-registry';
import { OutboxItem } from '../../../core/sync/outbox-item';
import { SyncEngineService } from '../../../core/sync/sync-engine.service';

/**
 * documentation/Features/Szinkronizációs központ.md — the outbox's control surface. Fix's generic
 * payload-driven form only handles flat scalar fields (nested array/object fields are filtered out
 * per item, and nested-aggregate entities have no Fix at all — see OutboxEntityRegistryService).
 */
@Component({
  selector: 'app-sync',
  templateUrl: 'sync.page.html',
  styleUrls: ['sync.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonIcon,
    IonButton,
    IonSpinner,
    IonModal,
    TranslatePipe,
    JsonPipe,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncPage implements ViewWillEnter {
  private readonly fb = inject(FormBuilder);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly authSession = inject(AuthSessionService);
  private readonly db = inject(LocalDatabaseService);
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly entityRegistry = inject(OutboxEntityRegistryService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  readonly connectionState = this.syncEngine.connectionState;
  readonly draining = this.syncEngine.draining;
  readonly lastSuccessfulSyncAt = this.syncEngine.lastSuccessfulSyncAt;
  readonly pendingCount = this.offlineQueue.pendingCount;
  readonly errorCount = this.offlineQueue.errorCount;
  /** documentation/Features/Szinkronizációs központ.md: reactive outbox read — no poll timer. */
  readonly items = this.offlineQueue.items;

  readonly payloadViewItem = signal<OutboxItem | null>(null);

  readonly fixItem = signal<OutboxItem | null>(null);
  readonly fixNameConflict = signal(false);
  fixForm: FormGroup = this.fb.group({});
  fixFieldKeys: string[] = [];

  async ionViewWillEnter(): Promise<void> {
    await this.refresh();
  }

  fixEditable(entityType: OutboxItem['entityType']): boolean {
    return this.entityRegistry.get(entityType).buildFixWriteTask !== null;
  }

  async syncNow(): Promise<void> {
    if (this.connectionState() !== 'ONLINE') {
      const toast = await this.toastController.create({
        message: this.translate.instant('SYNC.SYNC_NOW_OFFLINE'),
        duration: 3000,
        position: 'bottom',
      });
      await toast.present();
      return;
    }
    this.syncEngine.requestDrain();
  }

  viewPayload(item: OutboxItem): void {
    this.payloadViewItem.set(item);
  }

  async skip(item: OutboxItem): Promise<void> {
    await this.offlineQueue.skip(item.id);
  }

  async unskip(item: OutboxItem): Promise<void> {
    const currentPayload = await this.currentEntityPayload(item);
    await this.offlineQueue.unskip(item, currentPayload);
  }

  startFix(item: OutboxItem): void {
    if (!this.fixEditable(item.entityType)) {
      return;
    }
    const payload = (item.payload ?? {}) as Record<string, unknown>;
    const group: Record<string, FormControl> = {};
    this.fixFieldKeys = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && typeof value === 'object') {
        continue; // nested array/object fields aren't Fix-editable — see OutboxEntityRegistryService doc.
      }
      this.fixFieldKeys.push(key);
      group[key] = new FormControl(value);
    }
    this.fixForm = new FormGroup(group);
    this.fixNameConflict.set(false);
    this.fixItem.set(item);
  }

  async submitFix(): Promise<void> {
    const item = this.fixItem();
    if (item === null || !this.fixEditable(item.entityType)) {
      return;
    }
    const descriptor = this.entityRegistry.get(item.entityType);
    const rawPayload = (item.payload ?? {}) as Record<string, unknown>;
    const newPayload = { ...rawPayload, ...this.fixForm.getRawValue() };

    if (descriptor.nameUniqueness) {
      const { field, findConflict } = descriptor.nameUniqueness;
      const value = String(newPayload[field] ?? '');
      const conflictId = await findConflict(value, item.targetEntityId);
      if (conflictId !== null) {
        this.fixNameConflict.set(true);
        return;
      }
    }

    const entityTask = descriptor.buildFixWriteTask;
    if (entityTask === null) {
      return;
    }
    await this.offlineQueue.fix(item, newPayload, entityTask(newPayload));
    this.fixItem.set(null);
  }

  async drop(item: OutboxItem): Promise<void> {
    const dependents = await this.offlineQueue.findDependents(item.targetEntityId);
    const alert = await this.alertController.create({
      header: this.translate.instant('SYNC.DROP_CONFIRM_TITLE'),
      message:
        dependents.length > 0
          ? this.translate.instant('SYNC.DROP_CONFIRM_CASCADE', { count: dependents.length })
          : this.translate.instant('SYNC.DROP_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.doDrop(item) },
      ],
    });
    await alert.present();
  }

  private async doDrop(item: OutboxItem): Promise<void> {
    const descriptor = this.entityRegistry.get(item.entityType);
    const entityTask = buildOutboxDropTask(descriptor, item.method, item.targetEntityId);
    await this.offlineQueue.drop(item, entityTask);
  }

  private async refresh(): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      return;
    }
    await this.offlineQueue.listAll(userId);
    await this.offlineQueue.refreshCounts(userId);
  }

  private async currentEntityPayload(item: OutboxItem): Promise<unknown> {
    if (item.method === 'DELETE') {
      return null;
    }
    const descriptor = this.entityRegistry.get(item.entityType);
    return descriptor.currentPayload({ db: this.db, storage: this.storage, targetEntityId: item.targetEntityId, method: item.method });
  }
}

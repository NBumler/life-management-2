import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';
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
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { UserProfile } from '../../../api/model/userProfile';
import { WeightHistoryEntry } from '../../../api/model/weightHistoryEntry';
import {
  ProfileRow,
  WeightHistoryRow,
  profileLocalWriteTask,
  profileRowToDto,
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
} from '../../../core/data/local-rows';
import { AuthSessionService } from '../../../core/session/auth-session.service';
import { LocalDatabaseService, SqlTask } from '../../../core/storage/local-database.service';
import { OfflineQueueService } from '../../../core/sync/offline-queue.service';
import { OutboxItem } from '../../../core/sync/outbox-item';
import { SyncEngineService } from '../../../core/sync/sync-engine.service';

const DRAIN_POLL_MS = 1000;

/**
 * documentation/Features/Szinkronizációs központ.md — the outbox's control surface. Fix's generic
 * payload-driven form only handles flat scalar fields (no nested aggregates exist yet in this
 * phase's scope, so every field qualifies).
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
export class SyncPage implements ViewWillEnter, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly authSession = inject(AuthSessionService);
  private readonly db = inject(LocalDatabaseService);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly connectionState = this.syncEngine.connectionState;
  readonly draining = this.syncEngine.draining;
  readonly pendingCount = this.offlineQueue.pendingCount;
  readonly errorCount = this.offlineQueue.errorCount;
  readonly items = signal<OutboxItem[]>([]);

  readonly payloadViewItem = signal<OutboxItem | null>(null);

  readonly fixItem = signal<OutboxItem | null>(null);
  fixForm: FormGroup = this.fb.group({});
  fixFieldKeys: string[] = [];

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // documentation/Features/Szinkronizációs központ.md: state changes should show up "live" while a
    // drain runs. True per-row SQLite reactivity isn't wired up yet, so this polls while draining.
    effect(() => {
      if (this.draining()) {
        this.pollTimer ??= setInterval(() => void this.refresh(), DRAIN_POLL_MS);
      } else if (this.pollTimer !== null) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
        void this.refresh();
      }
    });
  }

  /**
   * documentation/Features/Szinkronizációs központ.md: the list must reflect the outbox every time
   * this page is entered. `ngOnInit` alone isn't enough — Ionic reuses the cached page instance when
   * navigating back into an already-visited tab route, so it only fires once per instance, not per
   * visit; `ionViewWillEnter` fires on every entry, cached instance or not.
   */
  async ionViewWillEnter(): Promise<void> {
    await this.refresh();
  }

  ngOnDestroy(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
    }
  }

  async syncNow(): Promise<void> {
    this.syncEngine.requestDrain();
  }

  viewPayload(item: OutboxItem): void {
    this.payloadViewItem.set(item);
  }

  async skip(item: OutboxItem): Promise<void> {
    await this.offlineQueue.skip(item.id);
    await this.refresh();
  }

  async unskip(item: OutboxItem): Promise<void> {
    const currentPayload = await this.currentEntityPayload(item);
    await this.offlineQueue.unskip(item, currentPayload);
    await this.refresh();
  }

  startFix(item: OutboxItem): void {
    const payload = (item.payload ?? {}) as Record<string, unknown>;
    const group: Record<string, FormControl> = {};
    this.fixFieldKeys = [];
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && typeof value === 'object') {
        continue; // nested aggregates aren't Fix-editable per spec — none exist in this phase anyway.
      }
      this.fixFieldKeys.push(key);
      group[key] = new FormControl(value);
    }
    this.fixForm = new FormGroup(group);
    this.fixItem.set(item);
  }

  async submitFix(): Promise<void> {
    const item = this.fixItem();
    if (item === null) {
      return;
    }
    const rawPayload = (item.payload ?? {}) as Record<string, unknown>;
    const newPayload = { ...rawPayload, ...this.fixForm.getRawValue() };
    const entityTask = this.buildEntityWriteTask(item, newPayload);
    await this.offlineQueue.fix(item, newPayload, entityTask);
    this.fixItem.set(null);
    await this.refresh();
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
    const entityTask = this.buildDropEntityTask(item);
    await this.offlineQueue.drop(item, entityTask);
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      return;
    }
    this.items.set(await this.offlineQueue.listAll(userId));
    await this.offlineQueue.refreshCounts(userId);
  }

  /** The outbox payload is the DTO shape the server expects (camelCase) — must be re-derived from the row, not the raw SQL columns. */
  private async currentEntityPayload(item: OutboxItem): Promise<unknown> {
    if (item.method === 'DELETE') {
      return null;
    }
    if (item.entityType === 'UserProfile') {
      const rows = await this.db.query<ProfileRow>('SELECT * FROM user_profile WHERE id = ?', [item.targetEntityId]);
      return rows[0] ? profileRowToDto(rows[0]) : item.payload;
    }
    if (item.entityType === 'WeightHistoryEntry') {
      const rows = await this.db.query<WeightHistoryRow>('SELECT * FROM weight_history_entry WHERE id = ?', [item.targetEntityId]);
      return rows[0] ? weightHistoryRowToDto(rows[0]) : item.payload;
    }
    return item.payload;
  }

  private buildEntityWriteTask(item: OutboxItem, payload: Record<string, unknown>): SqlTask {
    if (item.entityType === 'UserProfile') {
      return profileLocalWriteTask(payload as unknown as UserProfile);
    }
    if (item.entityType === 'WeightHistoryEntry') {
      return weightHistoryLocalWriteTask(payload as unknown as WeightHistoryEntry);
    }
    throw new Error(`SyncPage: no entity writer for "${item.entityType}"`);
  }

  private buildDropEntityTask(item: OutboxItem): SqlTask {
    const table = item.entityType === 'UserProfile' ? 'user_profile' : 'weight_history_entry';
    if (item.method === 'POST') {
      return { statement: `DELETE FROM ${table} WHERE id = ?`, values: [item.targetEntityId] };
    }
    return { statement: `UPDATE ${table} SET _needs_refetch = 1, _dirty = 0 WHERE id = ?`, values: [item.targetEntityId] };
  }
}

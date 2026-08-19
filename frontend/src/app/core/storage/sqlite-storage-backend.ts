import { Injectable, inject } from '@angular/core';

import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import {
  ProfileRow,
  WeightHistoryRow,
  profileLocalWriteTask,
  profileRowToDto,
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
} from '../data/local-rows';
import { AuthSessionService } from '../session/auth-session.service';
import { OfflineQueueService } from '../sync/offline-queue.service';
import { LocalDatabaseService, SqlTask } from './local-database.service';
import { StorageBackend } from './storage-backend';

/** Native (offlineCapable = true): local-first — every write lands in SQLite + the outbox in one transaction (§5). */
@Injectable({ providedIn: 'root' })
export class SqliteStorageBackend implements StorageBackend {
  private readonly db = inject(LocalDatabaseService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly authSession = inject(AuthSessionService);

  async getProfile(): Promise<UserProfile | null> {
    const rows = await this.db.query<ProfileRow>('SELECT * FROM user_profile WHERE deleted = 0 LIMIT 1');
    return rows.length > 0 ? profileRowToDto(rows[0]) : null;
  }

  async upsertProfile(profile: UserProfile): Promise<UserProfile> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'PUT',
      url: '/api/profile',
      payload: profile,
      entityType: 'UserProfile',
      targetEntityId: profile.id,
    });
    await this.db.executeTransaction([profileLocalWriteTask(profile), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return (await this.getProfile()) as UserProfile;
  }

  async listWeightHistory(): Promise<WeightHistoryEntry[]> {
    const rows = await this.db.query<WeightHistoryRow>('SELECT * FROM weight_history_entry WHERE deleted = 0 ORDER BY recorded_at DESC');
    return rows.map(weightHistoryRowToDto);
  }

  async upsertWeightHistoryEntry(entry: WeightHistoryEntry): Promise<WeightHistoryEntry> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM weight_history_entry WHERE id = ?', [entry.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/profile/weight-history' : `/api/profile/weight-history/${entry.id}`,
      payload: entry,
      entityType: 'WeightHistoryEntry',
      targetEntityId: entry.id,
    });
    await this.db.executeTransaction([weightHistoryLocalWriteTask(entry), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readWeightHistoryEntry(entry.id);
  }

  async deleteWeightHistoryEntry(id: string): Promise<WeightHistoryEntry> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/profile/weight-history/${id}`,
      payload: null,
      entityType: 'WeightHistoryEntry',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM weight_history_entry WHERE id = ?', values: [id] }
      : {
          statement: "UPDATE weight_history_entry SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?",
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, recordedAt: '', weightKg: 0, deleted: true };
    }
    return this.readWeightHistoryEntry(id);
  }

  private async readWeightHistoryEntry(id: string): Promise<WeightHistoryEntry> {
    const rows = await this.db.query<WeightHistoryRow>('SELECT * FROM weight_history_entry WHERE id = ?', [id]);
    return weightHistoryRowToDto(rows[0]);
  }

  private requireUserId(): string {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('SqliteStorageBackend: no authenticated user');
    }
    return userId;
  }
}

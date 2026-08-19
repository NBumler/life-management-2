import { Injectable, inject } from '@angular/core';

import { GearItem } from '../../api/model/gearItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import {
  GearItemRow,
  PackingTemplateItemRow,
  PackingTemplateRow,
  ProfileRow,
  WeightHistoryRow,
  gearItemLocalWriteTask,
  gearItemRowToDto,
  packingTemplateItemLocalRemoveTask,
  packingTemplateItemLocalWriteTask,
  packingTemplateItemRowToDto,
  packingTemplateLocalWriteTask,
  packingTemplateRowToDto,
  profileLocalWriteTask,
  profileRowToDto,
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
} from '../data/local-rows';
import { AuthSessionService } from '../session/auth-session.service';
import { OfflineQueueService } from '../sync/offline-queue.service';
import { LocalDatabaseService, SqlTask } from './local-database.service';
import { PackingTemplateDraft, StorageBackend } from './storage-backend';

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

  async listGearItems(): Promise<GearItem[]> {
    const rows = await this.db.query<GearItemRow>('SELECT * FROM gear_item WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(gearItemRowToDto);
  }

  async upsertGearItem(item: GearItem): Promise<GearItem> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM gear_item WHERE id = ?', [item.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/gear-items' : `/api/gear-items/${item.id}`,
      payload: item,
      entityType: 'GearItem',
      targetEntityId: item.id,
    });
    await this.db.executeTransaction([gearItemLocalWriteTask(item), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readGearItem(item.id);
  }

  async deleteGearItem(id: string): Promise<GearItem> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/gear-items/${id}`,
      payload: null,
      entityType: 'GearItem',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM gear_item WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE gear_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    // documentation/Architektúra/Backend-offline first.md §5 "Kliensoldali cascade": the referencing
    // rows are soft-deleted locally in the same transaction, with no separate outbox entry — the
    // server does its own cascade on the GearItem DELETE, and the post-drain pull confirms it.
    const cascadeRows = await this.db.query<{ id: string }>(
      'SELECT id FROM packing_template_item WHERE gear_item_id = ? AND deleted = 0',
      [id],
    );
    const cascadeTasks = cascadeRows.map((row) => packingTemplateItemLocalRemoveTask(row.id));
    await this.db.executeTransaction([entityTask, ...cascadeTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', deleted: true };
    }
    return this.readGearItem(id);
  }

  private async readGearItem(id: string): Promise<GearItem> {
    const rows = await this.db.query<GearItemRow>('SELECT * FROM gear_item WHERE id = ?', [id]);
    return gearItemRowToDto(rows[0]);
  }

  async listPackingTemplates(): Promise<PackingTemplate[]> {
    const rows = await this.db.query<PackingTemplateRow>('SELECT * FROM packing_template WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(packingTemplateRowToDto);
  }

  async getPackingTemplateDetail(id: string): Promise<PackingTemplateDetail> {
    return this.readPackingTemplateDetail(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": template + items in one local transaction and one outbox entry. */
  async savePackingTemplate(draft: PackingTemplateDraft): Promise<PackingTemplateDetail> {
    const userId = this.requireUserId();
    const existingTemplateRows = await this.db.query('SELECT 1 FROM packing_template WHERE id = ?', [draft.id]);
    const isNewTemplate = existingTemplateRows.length === 0;

    const existingItemRows = await this.db.query<PackingTemplateItemRow>(
      'SELECT * FROM packing_template_item WHERE template_id = ?',
      [draft.id],
    );
    const incomingIds = new Set(draft.items.map((item) => item.id));

    const localTasks: SqlTask[] = [packingTemplateLocalWriteTask({ id: draft.id, name: draft.name, notes: draft.notes })];
    for (const item of draft.items) {
      localTasks.push(packingTemplateItemLocalWriteTask({ id: item.id, templateId: draft.id, gearItemId: item.gearItemId, sortOrder: item.sortOrder }));
    }
    for (const existing of existingItemRows) {
      if (existing.deleted === 0 && !incomingIds.has(existing.id)) {
        localTasks.push(packingTemplateItemLocalRemoveTask(existing.id));
      }
    }

    const dependsOn = await this.findLocalOnlyIds('gear_item', draft.items.map((item) => item.gearItemId));
    const payload: PackingTemplateDetail = {
      id: draft.id,
      name: draft.name,
      notes: draft.notes,
      deleted: false,
      items: draft.items.map((item) => ({ id: item.id, templateId: draft.id, gearItemId: item.gearItemId, sortOrder: item.sortOrder, deleted: false })),
    };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNewTemplate ? 'POST' : 'PUT',
      url: isNewTemplate ? '/api/packing-templates' : `/api/packing-templates/${draft.id}`,
      payload,
      entityType: 'PackingTemplate',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readPackingTemplateDetail(draft.id);
  }

  async deletePackingTemplate(id: string): Promise<PackingTemplateDetail> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/packing-templates/${id}`,
      payload: null,
      entityType: 'PackingTemplate',
      targetEntityId: id,
    });
    const liveItemRows = await this.db.query<{ id: string }>('SELECT id FROM packing_template_item WHERE template_id = ? AND deleted = 0', [id]);
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      tasks.push({ statement: 'DELETE FROM packing_template WHERE id = ?', values: [id] });
      for (const row of liveItemRows) {
        tasks.push({ statement: 'DELETE FROM packing_template_item WHERE id = ?', values: [row.id] });
      }
    } else {
      tasks.push({
        statement: 'UPDATE packing_template SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveItemRows) {
        tasks.push(packingTemplateItemLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', deleted: true, items: [] };
    }
    return this.readPackingTemplateDetail(id);
  }

  private async readPackingTemplateDetail(id: string): Promise<PackingTemplateDetail> {
    const templateRows = await this.db.query<PackingTemplateRow>('SELECT * FROM packing_template WHERE id = ?', [id]);
    const itemRows = await this.db.query<PackingTemplateItemRow>(
      'SELECT * FROM packing_template_item WHERE template_id = ? AND deleted = 0 ORDER BY sort_order',
      [id],
    );
    return { ...packingTemplateRowToDto(templateRows[0]), items: itemRows.map(packingTemplateItemRowToDto) };
  }

  /** documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": ids among `candidateIds` whose row hasn't reached the server yet. */
  private async findLocalOnlyIds(table: 'gear_item', candidateIds: string[]): Promise<string[]> {
    if (candidateIds.length === 0) {
      return [];
    }
    const placeholders = candidateIds.map(() => '?').join(',');
    const rows = await this.db.query<{ id: string }>(
      `SELECT id FROM ${table} WHERE _local_only = 1 AND id IN (${placeholders})`,
      candidateIds,
    );
    return rows.map((row) => row.id);
  }

  private requireUserId(): string {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('SqliteStorageBackend: no authenticated user');
    }
    return userId;
  }
}

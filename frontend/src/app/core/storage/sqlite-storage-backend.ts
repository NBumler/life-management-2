import { Injectable, inject } from '@angular/core';

import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { Meal } from '../../api/model/meal';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { Recipe } from '../../api/model/recipe';
import { ShoppingList } from '../../api/model/shoppingList';
import { StoredFood } from '../../api/model/storedFood';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import {
  CalendarEventRow,
  FoodRow,
  GearItemRow,
  HouseholdRoomRow,
  HouseholdTaskRow,
  LifePlanRow,
  MealItemRow,
  MealRow,
  PackingSessionItemRow,
  PackingSessionRow,
  PackingTemplateItemRow,
  PackingTemplateRow,
  ProfileRow,
  RecipeIngredientRow,
  RecipeRow,
  ShoppingListItemRow,
  ShoppingListRow,
  StoredFoodRow,
  WeightHistoryRow,
  calendarEventLocalWriteTask,
  calendarEventRowToDto,
  foodLocalWriteTask,
  foodRowToDto,
  gearItemLocalWriteTask,
  gearItemRowToDto,
  householdRoomLocalWriteTask,
  householdRoomRowToDto,
  householdTaskLocalRemoveTask,
  householdTaskLocalWriteTask,
  householdTaskRowToDto,
  lifePlanLocalWriteTask,
  lifePlanRowToDto,
  mealItemLocalRemoveTask,
  mealItemLocalWriteTask,
  mealItemRowToDto,
  mealLocalWriteTask,
  mealRowToDto,
  packingSessionItemLocalRemoveTask,
  packingSessionItemLocalWriteTask,
  packingSessionItemRowToDto,
  packingSessionLocalWriteTask,
  packingSessionRowToDto,
  packingTemplateItemLocalRemoveTask,
  packingTemplateItemLocalWriteTask,
  packingTemplateItemRowToDto,
  packingTemplateLocalWriteTask,
  packingTemplateRowToDto,
  profileLocalWriteTask,
  profileRowToDto,
  recipeIngredientLocalRemoveTask,
  recipeIngredientLocalWriteTask,
  recipeIngredientRowToDto,
  recipeLocalWriteTask,
  recipeRowToDto,
  shoppingListItemLocalRemoveTask,
  shoppingListArchiveLocalTask,
  shoppingListItemLocalWriteTask,
  shoppingListItemRowToDto,
  shoppingListLocalWriteTask,
  shoppingListRowToDto,
  storedFoodLocalRemoveTask,
  storedFoodLocalWriteTask,
  storedFoodRowToDto,
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
} from '../data/local-rows';
import { AuthSessionService } from '../session/auth-session.service';
import { OfflineQueueService } from '../sync/offline-queue.service';
import { uuidV4 } from '../sync/uuid';
import { LocalDatabaseService, SqlTask } from './local-database.service';
import {
  GearItemReferenceCounts,
  MealDraft,
  PackingSessionStartDraft,
  PackingTemplateDraft,
  RecipeDraft,
  ShoppingListCompleteDraft,
  ShoppingListCompleteResult,
  ShoppingListDraft,
  StorageBackend,
  buildShoppingListCompleteRequestPayload,
  expandMealItemSaveItem,
  expandShoppingListItemSaveItem,
} from './storage-backend';

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
    const cascadeTemplateItemRows = await this.db.query<{ id: string }>(
      'SELECT id FROM packing_template_item WHERE gear_item_id = ? AND deleted = 0',
      [id],
    );
    const cascadeSessionItemRows = await this.db.query<{ id: string }>(
      'SELECT id FROM packing_session_item WHERE gear_item_id = ? AND deleted = 0',
      [id],
    );
    const cascadeTasks = [
      ...cascadeTemplateItemRows.map((row) => packingTemplateItemLocalRemoveTask(row.id)),
      ...cascadeSessionItemRows.map((row) => packingSessionItemLocalRemoveTask(row.id)),
    ];
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

  async countGearItemReferences(gearItemId: string): Promise<GearItemReferenceCounts> {
    const templateRows = await this.db.query<{ count: number }>(
      'SELECT COUNT(DISTINCT template_id) AS count FROM packing_template_item WHERE gear_item_id = ? AND deleted = 0',
      [gearItemId],
    );
    const sessionRows = await this.db.query<{ count: number }>(
      'SELECT COUNT(DISTINCT session_id) AS count FROM packing_session_item WHERE gear_item_id = ? AND deleted = 0',
      [gearItemId],
    );
    return { templateCount: templateRows[0]?.count ?? 0, sessionCount: sessionRows[0]?.count ?? 0 };
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
  private async findLocalOnlyIds(table: 'gear_item' | 'household_room' | 'food' | 'recipe', candidateIds: string[]): Promise<string[]> {
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

  async listPackingSessions(): Promise<PackingSession[]> {
    const rows = await this.db.query<PackingSessionRow>('SELECT * FROM packing_session WHERE deleted = 0 ORDER BY created_at DESC');
    return rows.map(packingSessionRowToDto);
  }

  async getPackingSessionDetail(id: string): Promise<PackingSessionDetail> {
    return this.readPackingSessionDetail(id);
  }

  /** documentation/Subfeatures/Pakolás.md "Indítás": session + its initial deduped item set in one local transaction and one outbox entry. */
  async startPackingSession(draft: PackingSessionStartDraft): Promise<PackingSessionDetail> {
    const userId = this.requireUserId();
    const localTasks: SqlTask[] = [
      packingSessionLocalWriteTask({ id: draft.id, destination: draft.destination, sourceTemplateIds: draft.sourceTemplateIds }),
    ];
    for (const item of draft.items) {
      localTasks.push(
        packingSessionItemLocalWriteTask({
          id: item.id,
          sessionId: draft.id,
          gearItemId: item.gearItemId,
          status: PackingSessionItem.StatusEnum.NotPacked,
          sortOrder: item.sortOrder,
        }),
      );
    }

    const dependsOn = await this.findLocalOnlyIds('gear_item', draft.items.map((item) => item.gearItemId));
    const payload: PackingSessionDetail = {
      id: draft.id,
      destination: draft.destination,
      sourceTemplateIds: draft.sourceTemplateIds,
      deleted: false,
      items: draft.items.map((item) => ({
        id: item.id,
        sessionId: draft.id,
        gearItemId: item.gearItemId,
        status: PackingSessionItem.StatusEnum.NotPacked,
        sortOrder: item.sortOrder,
        deleted: false,
      })),
    };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'POST',
      url: '/api/packing-sessions',
      payload,
      entityType: 'PackingSession',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readPackingSessionDetail(draft.id);
  }

  async updatePackingSessionDestination(id: string, destination: string | null): Promise<PackingSession> {
    const userId = this.requireUserId();
    const currentRows = await this.db.query<PackingSessionRow>('SELECT * FROM packing_session WHERE id = ?', [id]);
    const current = packingSessionRowToDto(currentRows[0]);
    const sourceTemplateIds = current.sourceTemplateIds ?? [];
    const payload: PackingSession = { id, destination, sourceTemplateIds, deleted: false };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'PUT',
      url: `/api/packing-sessions/${id}`,
      payload,
      entityType: 'PackingSession',
      targetEntityId: id,
    });
    await this.db.executeTransaction([packingSessionLocalWriteTask({ id, destination, sourceTemplateIds }), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    const updatedRows = await this.db.query<PackingSessionRow>('SELECT * FROM packing_session WHERE id = ?', [id]);
    return packingSessionRowToDto(updatedRows[0]);
  }

  /** "Lezárás": soft delete + local cascade to the session's own items, no separate outbox entry for them (mirrors PackingTemplate's delete). */
  async closePackingSession(id: string): Promise<PackingSession> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/packing-sessions/${id}`,
      payload: null,
      entityType: 'PackingSession',
      targetEntityId: id,
    });
    const liveItemRows = await this.db.query<{ id: string }>('SELECT id FROM packing_session_item WHERE session_id = ? AND deleted = 0', [id]);
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      tasks.push({ statement: 'DELETE FROM packing_session WHERE id = ?', values: [id] });
      for (const row of liveItemRows) {
        tasks.push({ statement: 'DELETE FROM packing_session_item WHERE id = ?', values: [row.id] });
      }
    } else {
      tasks.push({
        statement: 'UPDATE packing_session SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveItemRows) {
        tasks.push(packingSessionItemLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, deleted: true };
    }
    const rows = await this.db.query<PackingSessionRow>('SELECT * FROM packing_session WHERE id = ?', [id]);
    return packingSessionRowToDto(rows[0]);
  }

  /** "Extra eszköz": own outbox entry, not part of a nested session save (see PackingSessionItem.yaml). */
  async addPackingSessionItem(sessionId: string, gearItemId: string, sortOrder: number): Promise<PackingSessionItem> {
    const userId = this.requireUserId();
    const id = uuidV4();
    const dependsOn = await this.findLocalOnlyIds('gear_item', [gearItemId]);
    const payload: PackingSessionItem = {
      id,
      sessionId,
      gearItemId,
      status: PackingSessionItem.StatusEnum.NotPacked,
      sortOrder,
      deleted: false,
    };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'POST',
      url: '/api/packing-session-items',
      payload,
      entityType: 'PackingSessionItem',
      targetEntityId: id,
      dependsOn,
    });
    await this.db.executeTransaction([
      packingSessionItemLocalWriteTask({ id, sessionId, gearItemId, status: 'NOT_PACKED', sortOrder }),
      ...enqueue.outboxTasks,
    ]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readPackingSessionItem(id);
  }

  /** Status tap or manual reorder — own outbox entry per item, deliberately not nested. */
  async updatePackingSessionItem(item: PackingSessionItem): Promise<PackingSessionItem> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'PUT',
      url: `/api/packing-session-items/${item.id}`,
      payload: item,
      entityType: 'PackingSessionItem',
      targetEntityId: item.id,
    });
    await this.db.executeTransaction([
      packingSessionItemLocalWriteTask({
        id: item.id,
        sessionId: item.sessionId,
        gearItemId: item.gearItemId,
        status: item.status,
        sortOrder: item.sortOrder,
      }),
      ...enqueue.outboxTasks,
    ]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readPackingSessionItem(item.id);
  }

  private async readPackingSessionDetail(id: string): Promise<PackingSessionDetail> {
    const sessionRows = await this.db.query<PackingSessionRow>('SELECT * FROM packing_session WHERE id = ?', [id]);
    const itemRows = await this.db.query<PackingSessionItemRow>(
      'SELECT * FROM packing_session_item WHERE session_id = ? AND deleted = 0 ORDER BY sort_order',
      [id],
    );
    return { ...packingSessionRowToDto(sessionRows[0]), items: itemRows.map(packingSessionItemRowToDto) };
  }

  private async readPackingSessionItem(id: string): Promise<PackingSessionItem> {
    const rows = await this.db.query<PackingSessionItemRow>('SELECT * FROM packing_session_item WHERE id = ?', [id]);
    return packingSessionItemRowToDto(rows[0]);
  }

  async listLifePlans(): Promise<LifePlan[]> {
    const rows = await this.db.query<LifePlanRow>('SELECT * FROM life_plan WHERE deleted = 0 ORDER BY created_at ASC');
    return rows.map(lifePlanRowToDto);
  }

  async upsertLifePlan(plan: LifePlan): Promise<LifePlan> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM life_plan WHERE id = ?', [plan.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/life-plans' : `/api/life-plans/${plan.id}`,
      payload: plan,
      entityType: 'LifePlan',
      targetEntityId: plan.id,
    });
    await this.db.executeTransaction([lifePlanLocalWriteTask(plan), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readLifePlan(plan.id);
  }

  async deleteLifePlan(id: string): Promise<LifePlan> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/life-plans/${id}`,
      payload: null,
      entityType: 'LifePlan',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM life_plan WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE life_plan SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, title: '', status: LifePlan.StatusEnum.Planned, deleted: true };
    }
    return this.readLifePlan(id);
  }

  private async readLifePlan(id: string): Promise<LifePlan> {
    const rows = await this.db.query<LifePlanRow>('SELECT * FROM life_plan WHERE id = ?', [id]);
    return lifePlanRowToDto(rows[0]);
  }

  async listHouseholdRooms(): Promise<HouseholdRoom[]> {
    const rows = await this.db.query<HouseholdRoomRow>('SELECT * FROM household_room WHERE deleted = 0 ORDER BY sort_order ASC');
    return rows.map(householdRoomRowToDto);
  }

  async upsertHouseholdRoom(room: HouseholdRoom): Promise<HouseholdRoom> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM household_room WHERE id = ?', [room.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/household-rooms' : `/api/household-rooms/${room.id}`,
      payload: room,
      entityType: 'HouseholdRoom',
      targetEntityId: room.id,
    });
    await this.db.executeTransaction([householdRoomLocalWriteTask(room), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readHouseholdRoom(room.id);
  }

  /**
   * documentation/Subfeatures/Háztartási feladatok.md "Törlés": cascades to every live task in the
   * room, mirroring GearItem's local cascade to referencing rows — the server does its own cascade
   * on the DELETE, and the post-drain pull confirms each task's tombstone independently.
   */
  async deleteHouseholdRoom(id: string): Promise<HouseholdRoom> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/household-rooms/${id}`,
      payload: null,
      entityType: 'HouseholdRoom',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM household_room WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE household_room SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    const cascadeTaskRows = await this.db.query<{ id: string }>(
      'SELECT id FROM household_task WHERE room_id = ? AND deleted = 0',
      [id],
    );
    const cascadeTasks = cascadeTaskRows.map((row) => householdTaskLocalRemoveTask(row.id));
    await this.db.executeTransaction([entityTask, ...cascadeTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', sortOrder: 0, deleted: true };
    }
    return this.readHouseholdRoom(id);
  }

  private async readHouseholdRoom(id: string): Promise<HouseholdRoom> {
    const rows = await this.db.query<HouseholdRoomRow>('SELECT * FROM household_room WHERE id = ?', [id]);
    return householdRoomRowToDto(rows[0]);
  }

  async listHouseholdTasks(): Promise<HouseholdTask[]> {
    const rows = await this.db.query<HouseholdTaskRow>('SELECT * FROM household_task WHERE deleted = 0 ORDER BY next_due ASC');
    return rows.map(householdTaskRowToDto);
  }

  async upsertHouseholdTask(task: HouseholdTask): Promise<HouseholdTask> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM household_task WHERE id = ?', [task.id]);
    const isNew = existing.length === 0;
    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a task created
    // right after an inline new room must wait for that room's own POST to land first.
    const dependsOn = await this.findLocalOnlyIds('household_room', [task.roomId]);
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/household-tasks' : `/api/household-tasks/${task.id}`,
      payload: task,
      entityType: 'HouseholdTask',
      targetEntityId: task.id,
      dependsOn,
    });
    await this.db.executeTransaction([householdTaskLocalWriteTask(task), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readHouseholdTask(task.id);
  }

  async deleteHouseholdTask(id: string): Promise<HouseholdTask> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/household-tasks/${id}`,
      payload: null,
      entityType: 'HouseholdTask',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM household_task WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE household_task SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, roomId: '', name: '', energyLevel: HouseholdTask.EnergyLevelEnum.Medium, estimatedMinutes: 1, intervalDays: 1, nextDue: '', deleted: true };
    }
    return this.readHouseholdTask(id);
  }

  private async readHouseholdTask(id: string): Promise<HouseholdTask> {
    const rows = await this.db.query<HouseholdTaskRow>('SELECT * FROM household_task WHERE id = ?', [id]);
    return householdTaskRowToDto(rows[0]);
  }

  async listEvents(): Promise<CalendarEvent[]> {
    const rows = await this.db.query<CalendarEventRow>('SELECT * FROM calendar_event WHERE deleted = 0 ORDER BY date ASC');
    return rows.map(calendarEventRowToDto);
  }

  async upsertEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM calendar_event WHERE id = ?', [event.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/events' : `/api/events/${event.id}`,
      payload: event,
      entityType: 'CalendarEvent',
      targetEntityId: event.id,
    });
    await this.db.executeTransaction([calendarEventLocalWriteTask(event), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readEvent(event.id);
  }

  async deleteEvent(id: string): Promise<CalendarEvent> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/events/${id}`,
      payload: null,
      entityType: 'CalendarEvent',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM calendar_event WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE calendar_event SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, title: '', allDay: true, date: '', interval: 1, deleted: true };
    }
    return this.readEvent(id);
  }

  private async readEvent(id: string): Promise<CalendarEvent> {
    const rows = await this.db.query<CalendarEventRow>('SELECT * FROM calendar_event WHERE id = ?', [id]);
    return calendarEventRowToDto(rows[0]);
  }

  /** documentation/Subfeatures/Élelmiszerek.md: shared/global catalog — every live row, not scoped by user. */
  async listFoods(): Promise<Food[]> {
    const rows = await this.db.query<FoodRow>('SELECT * FROM food WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(foodRowToDto);
  }

  async upsertFood(food: Food): Promise<Food> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM food WHERE id = ?', [food.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/foods' : `/api/foods/${food.id}`,
      payload: food,
      entityType: 'Food',
      targetEntityId: food.id,
    });
    await this.db.executeTransaction([foodLocalWriteTask(food), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readFood(food.id);
  }

  /**
   * documentation/Subfeatures/Élelmiszer tárolás.md "Törlés": cascades to every live storage item
   * referencing this catalog entry, mirroring HouseholdRoom's local cascade to its tasks — the
   * server does its own cascade on the DELETE, and the post-drain pull confirms each one independently.
   */
  async deleteFood(id: string): Promise<Food> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/foods/${id}`,
      payload: null,
      entityType: 'Food',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM food WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE food SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    const cascadeStoredFoodRows = await this.db.query<{ id: string }>(
      'SELECT id FROM stored_food WHERE food_id = ? AND deleted = 0',
      [id],
    );
    const cascadeRecipeIngredientRows = await this.db.query<{ id: string }>(
      'SELECT id FROM recipe_ingredient WHERE food_id = ? AND deleted = 0',
      [id],
    );
    const cascadeTasks = [
      ...cascadeStoredFoodRows.map((row) => storedFoodLocalRemoveTask(row.id)),
      ...cascadeRecipeIngredientRows.map((row) => recipeIngredientLocalRemoveTask(row.id)),
    ];
    await this.db.executeTransaction([entityTask, ...cascadeTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', deleted: true };
    }
    return this.readFood(id);
  }

  private async readFood(id: string): Promise<Food> {
    const rows = await this.db.query<FoodRow>('SELECT * FROM food WHERE id = ?', [id]);
    return foodRowToDto(rows[0]);
  }

  async listStoredFoods(): Promise<StoredFood[]> {
    const rows = await this.db.query<StoredFoodRow>('SELECT * FROM stored_food WHERE deleted = 0 ORDER BY expires_on ASC');
    return rows.map(storedFoodRowToDto);
  }

  async upsertStoredFood(item: StoredFood): Promise<StoredFood> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM stored_food WHERE id = ?', [item.id]);
    const isNew = existing.length === 0;
    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a storage item
    // created right after an inline new Food (barcode/import flow) must wait for that Food's own
    // POST to land first.
    const dependsOn = await this.findLocalOnlyIds('food', [item.foodId]);
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/stored-foods' : `/api/stored-foods/${item.id}`,
      payload: item,
      entityType: 'StoredFood',
      targetEntityId: item.id,
      dependsOn,
    });
    await this.db.executeTransaction([storedFoodLocalWriteTask(item), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readStoredFood(item.id);
  }

  async deleteStoredFood(id: string): Promise<StoredFood> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/stored-foods/${id}`,
      payload: null,
      entityType: 'StoredFood',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM stored_food WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE stored_food SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, foodId: '', quantityAmount: 0, quantityUnit: '', storageLocation: StoredFood.StorageLocationEnum.Room, expiresOn: '', opened: false, deleted: true };
    }
    return this.readStoredFood(id);
  }

  private async readStoredFood(id: string): Promise<StoredFood> {
    const rows = await this.db.query<StoredFoodRow>('SELECT * FROM stored_food WHERE id = ?', [id]);
    return storedFoodRowToDto(rows[0]);
  }

  async listRecipes(): Promise<Recipe[]> {
    const recipeRows = await this.db.query<RecipeRow>('SELECT * FROM recipe WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    // Recipe.ingredients contract (recipe.ts): every row, live or tombstoned — matches HttpStorageBackend/the
    // backend's own toDto. Every caller already filters `!deleted` itself when rendering or summing.
    const ingredientRows = await this.db.query<RecipeIngredientRow>('SELECT * FROM recipe_ingredient ORDER BY sort_order');
    const ingredientsByRecipe = new Map<string, Recipe['ingredients']>();
    for (const row of ingredientRows) {
      const dto = recipeIngredientRowToDto(row);
      const list = ingredientsByRecipe.get(dto.recipeId) ?? [];
      list.push(dto);
      ingredientsByRecipe.set(dto.recipeId, list);
    }
    return recipeRows.map((row) => ({ ...recipeRowToDto(row), ingredients: ingredientsByRecipe.get(row.id) ?? [] }));
  }

  getRecipe(id: string): Promise<Recipe> {
    return this.readRecipe(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": recipe + ingredients in one local transaction and one outbox entry. */
  async saveRecipe(draft: RecipeDraft): Promise<Recipe> {
    const userId = this.requireUserId();
    const existingRecipeRows = await this.db.query('SELECT 1 FROM recipe WHERE id = ?', [draft.id]);
    const isNew = existingRecipeRows.length === 0;

    const existingIngredientRows = await this.db.query<RecipeIngredientRow>(
      'SELECT * FROM recipe_ingredient WHERE recipe_id = ?',
      [draft.id],
    );
    const incomingIds = new Set(draft.ingredients.map((ingredient) => ingredient.id));

    const localTasks: SqlTask[] = [recipeLocalWriteTask({ id: draft.id, name: draft.name, note: draft.note })];
    for (const ingredient of draft.ingredients) {
      localTasks.push(
        recipeIngredientLocalWriteTask({
          id: ingredient.id,
          recipeId: draft.id,
          foodId: ingredient.foodId,
          quantityAmount: ingredient.quantityAmount,
          quantityUnit: ingredient.quantityUnit,
          sortOrder: ingredient.sortOrder,
        }),
      );
    }
    for (const existing of existingIngredientRows) {
      if (existing.deleted === 0 && !incomingIds.has(existing.id)) {
        localTasks.push(recipeIngredientLocalRemoveTask(existing.id));
      }
    }

    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a new ingredient
    // referencing a Food created in the same offline session must wait for that Food's own POST first.
    const dependsOn = await this.findLocalOnlyIds('food', draft.ingredients.map((ingredient) => ingredient.foodId));
    const payload: Recipe = {
      id: draft.id,
      name: draft.name,
      note: draft.note,
      deleted: false,
      ingredients: draft.ingredients.map((ingredient) => ({
        id: ingredient.id,
        recipeId: draft.id,
        foodId: ingredient.foodId,
        quantityAmount: ingredient.quantityAmount,
        quantityUnit: ingredient.quantityUnit,
        sortOrder: ingredient.sortOrder,
        deleted: false,
      })),
    };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/recipes' : `/api/recipes/${draft.id}`,
      payload,
      entityType: 'Recipe',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readRecipe(draft.id);
  }

  async deleteRecipe(id: string): Promise<Recipe> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/recipes/${id}`,
      payload: null,
      entityType: 'Recipe',
      targetEntityId: id,
    });
    const liveIngredientRows = await this.db.query<{ id: string }>(
      'SELECT id FROM recipe_ingredient WHERE recipe_id = ? AND deleted = 0',
      [id],
    );
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      tasks.push({ statement: 'DELETE FROM recipe WHERE id = ?', values: [id] });
      for (const row of liveIngredientRows) {
        tasks.push({ statement: 'DELETE FROM recipe_ingredient WHERE id = ?', values: [row.id] });
      }
    } else {
      tasks.push({
        statement: 'UPDATE recipe SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveIngredientRows) {
        tasks.push(recipeIngredientLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', deleted: true, ingredients: [] };
    }
    return this.readRecipe(id);
  }

  private async readRecipe(id: string): Promise<Recipe> {
    const recipeRows = await this.db.query<RecipeRow>('SELECT * FROM recipe WHERE id = ?', [id]);
    const ingredientRows = await this.db.query<RecipeIngredientRow>(
      'SELECT * FROM recipe_ingredient WHERE recipe_id = ? ORDER BY sort_order',
      [id],
    );
    return { ...recipeRowToDto(recipeRows[0]), ingredients: ingredientRows.map(recipeIngredientRowToDto) };
  }

  async listMeals(): Promise<Meal[]> {
    const mealRows = await this.db.query<MealRow>('SELECT * FROM meal WHERE deleted = 0 ORDER BY eaten_at ASC');
    // Meal.items contract (meal.ts): every row, live or tombstoned — matches HttpStorageBackend/the
    // backend's own toDto. Every caller already filters `!deleted` itself when rendering or summing.
    const itemRows = await this.db.query<MealItemRow>('SELECT * FROM meal_item ORDER BY sort_order');
    const itemsByMeal = new Map<string, Meal['items']>();
    for (const row of itemRows) {
      const dto = mealItemRowToDto(row);
      const list = itemsByMeal.get(dto.mealId) ?? [];
      list.push(dto);
      itemsByMeal.set(dto.mealId, list);
    }
    return mealRows.map((row) => ({ ...mealRowToDto(row), items: itemsByMeal.get(row.id) ?? [] }));
  }

  getMeal(id: string): Promise<Meal> {
    return this.readMeal(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": meal + items in one local transaction and one outbox entry. */
  async saveMeal(draft: MealDraft): Promise<Meal> {
    const userId = this.requireUserId();
    const existingMealRows = await this.db.query('SELECT 1 FROM meal WHERE id = ?', [draft.id]);
    const isNew = existingMealRows.length === 0;

    const existingItemRows = await this.db.query<MealItemRow>('SELECT * FROM meal_item WHERE meal_id = ?', [draft.id]);
    const incomingIds = new Set(draft.items.map((item) => item.id));

    const localTasks: SqlTask[] = [mealLocalWriteTask({ id: draft.id, eatenAt: draft.eatenAt, timeZoneId: draft.timeZoneId, note: draft.note })];
    for (const item of draft.items) {
      localTasks.push(mealItemLocalWriteTask(expandMealItemSaveItem(item, draft.id)));
    }
    for (const existing of existingItemRows) {
      if (existing.deleted === 0 && !incomingIds.has(existing.id)) {
        localTasks.push(mealItemLocalRemoveTask(existing.id));
      }
    }

    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a new item
    // referencing a Food/Recipe created in the same offline session must wait for that row's own POST first.
    const recipeIds = draft.items.filter((item) => item.type === 'RECIPE').map((item) => item.recipeId);
    const foodIds = draft.items.filter((item) => item.type === 'FOOD').map((item) => item.foodId);
    const [localOnlyRecipeIds, localOnlyFoodIds] = await Promise.all([
      this.findLocalOnlyIds('recipe', recipeIds),
      this.findLocalOnlyIds('food', foodIds),
    ]);
    const dependsOn = [...localOnlyRecipeIds, ...localOnlyFoodIds];

    const payload: Meal = {
      id: draft.id,
      eatenAt: draft.eatenAt,
      timeZoneId: draft.timeZoneId,
      note: draft.note,
      deleted: false,
      items: draft.items.map((item) => ({ ...expandMealItemSaveItem(item, draft.id), deleted: false }) as Meal['items'][number]),
    };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/meals' : `/api/meals/${draft.id}`,
      payload,
      entityType: 'Meal',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readMeal(draft.id);
  }

  async deleteMeal(id: string): Promise<Meal> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/meals/${id}`,
      payload: null,
      entityType: 'Meal',
      targetEntityId: id,
    });
    const liveItemRows = await this.db.query<{ id: string }>('SELECT id FROM meal_item WHERE meal_id = ? AND deleted = 0', [id]);
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      tasks.push({ statement: 'DELETE FROM meal WHERE id = ?', values: [id] });
      for (const row of liveItemRows) {
        tasks.push({ statement: 'DELETE FROM meal_item WHERE id = ?', values: [row.id] });
      }
    } else {
      tasks.push({
        statement: 'UPDATE meal SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveItemRows) {
        tasks.push(mealItemLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, eatenAt: '', timeZoneId: '', note: null, deleted: true, items: [] };
    }
    return this.readMeal(id);
  }

  private async readMeal(id: string): Promise<Meal> {
    const mealRows = await this.db.query<MealRow>('SELECT * FROM meal WHERE id = ?', [id]);
    const itemRows = await this.db.query<MealItemRow>('SELECT * FROM meal_item WHERE meal_id = ? ORDER BY sort_order', [id]);
    return { ...mealRowToDto(mealRows[0]), items: itemRows.map(mealItemRowToDto) };
  }

  async listShoppingLists(): Promise<ShoppingList[]> {
    const listRows = await this.db.query<ShoppingListRow>('SELECT * FROM shopping_list WHERE deleted = 0 ORDER BY created_at DESC');
    // ShoppingList.items contract (shoppingList.ts): every row, live or tombstoned — matches
    // HttpStorageBackend/the backend's own toDto. Every caller already filters `!deleted` itself.
    const itemRows = await this.db.query<ShoppingListItemRow>('SELECT * FROM shopping_list_item ORDER BY sort_order');
    const itemsByList = new Map<string, ShoppingList['items']>();
    for (const row of itemRows) {
      const dto = shoppingListItemRowToDto(row);
      const list = itemsByList.get(dto.shoppingListId) ?? [];
      list.push(dto);
      itemsByList.set(dto.shoppingListId, list);
    }
    return listRows.map((row) => ({ ...shoppingListRowToDto(row), items: itemsByList.get(row.id) ?? [] }));
  }

  getShoppingList(id: string): Promise<ShoppingList> {
    return this.readShoppingList(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": list + items in one local transaction and one outbox entry. */
  async saveShoppingList(draft: ShoppingListDraft): Promise<ShoppingList> {
    const userId = this.requireUserId();
    const existingListRows = await this.db.query('SELECT 1 FROM shopping_list WHERE id = ?', [draft.id]);
    const isNew = existingListRows.length === 0;

    const existingItemRows = await this.db.query<ShoppingListItemRow>('SELECT * FROM shopping_list_item WHERE shopping_list_id = ?', [draft.id]);
    const incomingIds = new Set(draft.items.map((item) => item.id));

    const localTasks: SqlTask[] = [shoppingListLocalWriteTask({ id: draft.id, name: draft.name })];
    for (const item of draft.items) {
      localTasks.push(shoppingListItemLocalWriteTask(expandShoppingListItemSaveItem(item, draft.id)));
    }
    for (const existing of existingItemRows) {
      if (existing.deleted === 0 && !incomingIds.has(existing.id)) {
        localTasks.push(shoppingListItemLocalRemoveTask(existing.id));
      }
    }

    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a new item
    // referencing a Food created in the same offline session must wait for that row's own POST first.
    const foodIds = draft.items.filter((item) => item.type === 'FOOD').map((item) => item.foodId);
    const dependsOn = await this.findLocalOnlyIds('food', foodIds);

    const payload: ShoppingList = {
      id: draft.id,
      name: draft.name,
      deleted: false,
      items: draft.items.map((item) => ({ ...expandShoppingListItemSaveItem(item, draft.id), deleted: false }) as ShoppingList['items'][number]),
    };
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/shopping-lists' : `/api/shopping-lists/${draft.id}`,
      payload,
      entityType: 'ShoppingList',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readShoppingList(draft.id);
  }

  async deleteShoppingList(id: string): Promise<ShoppingList> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/shopping-lists/${id}`,
      payload: null,
      entityType: 'ShoppingList',
      targetEntityId: id,
    });
    const liveItemRows = await this.db.query<{ id: string }>('SELECT id FROM shopping_list_item WHERE shopping_list_id = ? AND deleted = 0', [id]);
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      tasks.push({ statement: 'DELETE FROM shopping_list WHERE id = ?', values: [id] });
      for (const row of liveItemRows) {
        tasks.push({ statement: 'DELETE FROM shopping_list_item WHERE id = ?', values: [row.id] });
      }
    } else {
      tasks.push({
        statement: 'UPDATE shopping_list SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveItemRows) {
        tasks.push(shoppingListItemLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: null, deleted: true, items: [] };
    }
    return this.readShoppingList(id);
  }

  private async readShoppingList(id: string): Promise<ShoppingList> {
    const listRows = await this.db.query<ShoppingListRow>('SELECT * FROM shopping_list WHERE id = ?', [id]);
    const itemRows = await this.db.query<ShoppingListItemRow>('SELECT * FROM shopping_list_item WHERE shopping_list_id = ? ORDER BY sort_order', [id]);
    return { ...shoppingListRowToDto(listRows[0]), items: itemRows.map(shoppingListItemRowToDto) };
  }

  /** documentation/Architektúra/Backend-offline first.md §11: archive + StoredFood rows + optional spun-off list, all in one local transaction and one outbox entry — mirrors startPackingSession's shape. */
  async completeShoppingList(draft: ShoppingListCompleteDraft): Promise<ShoppingListCompleteResult> {
    const userId = this.requireUserId();
    const nowIso = new Date().toISOString();

    const localTasks: SqlTask[] = [shoppingListArchiveLocalTask(draft.shoppingListId, nowIso)];
    for (const entry of draft.storageEntries) {
      localTasks.push(
        storedFoodLocalWriteTask({
          id: entry.id,
          foodId: entry.foodId,
          quantityAmount: entry.quantityAmount,
          quantityUnit: entry.quantityUnit,
          storageLocation: entry.storageLocation as StoredFood['storageLocation'],
          expiresOn: entry.expiresOn,
          opened: false,
          deleted: false,
        }),
      );
    }
    const foodIdsForDependsOn = draft.storageEntries.map((entry) => entry.foodId);
    if (draft.newActiveList) {
      localTasks.push(shoppingListLocalWriteTask({ id: draft.newActiveList.id, name: draft.newActiveList.name }));
      for (const item of draft.newActiveList.items) {
        localTasks.push(shoppingListItemLocalWriteTask(expandShoppingListItemSaveItem(item, draft.newActiveList.id)));
        if (item.type === 'FOOD') {
          foodIdsForDependsOn.push(item.foodId);
        }
      }
    }
    const dependsOn = await this.findLocalOnlyIds('food', foodIdsForDependsOn);

    // Same wire projection the web path uses — the outbox body and the online body can't drift.
    const payload = buildShoppingListCompleteRequestPayload(draft);
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'POST',
      url: `/api/shopping-lists/${draft.shoppingListId}/complete`,
      payload,
      // documentation/Subfeatures/Bevásárlás teljesítve.md: its own entity type so the completion
      // POST never coalesces with a still-pending list create/update for the same targetEntityId.
      entityType: 'ShoppingListComplete',
      targetEntityId: draft.shoppingListId,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);

    return {
      archivedListId: draft.shoppingListId,
      createdStorageEntryIds: draft.storageEntries.map((entry) => entry.id),
      newActiveListId: draft.newActiveList?.id ?? null,
    };
  }

  private requireUserId(): string {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('SqliteStorageBackend: no authenticated user');
    }
    return userId;
  }
}

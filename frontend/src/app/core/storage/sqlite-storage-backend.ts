import { Injectable, inject } from '@angular/core';

import { CalendarEvent } from '../../api/model/calendarEvent';
import { Exercise } from '../../api/model/exercise';
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
import { SwimLog } from '../../api/model/swimLog';
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { RecurringExpense } from '../../api/model/recurringExpense';
import { AycmPartner } from '../../api/model/aycmPartner';
import { AycmPriceRule } from '../../api/model/aycmPriceRule';
import { AycmCheckIn } from '../../api/model/aycmCheckIn';
import { AycmSettings } from '../../api/model/aycmSettings';
import { Gym } from '../../api/model/gym';
import { GymColorBand } from '../../api/model/gymColorBand';
import { IndoorRoute } from '../../api/model/indoorRoute';
import { Crag } from '../../api/model/crag';
import { Sector } from '../../api/model/sector';
import { Route } from '../../api/model/route';
import { BoulderProblem } from '../../api/model/boulderProblem';
import { ClimbingSession } from '../../api/model/climbingSession';
import { UserProfile } from '../../api/model/userProfile';
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutSession } from '../../api/model/workoutSession';
import { DailyStepLog } from '../../api/model/dailyStepLog';
import { buildSeedExercises } from '../data/exercise-seed';
import {
  CalendarEventRow,
  ExerciseRow,
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
  SwimLogRow,
  BikeRideLogRow,
  RecurringExpenseRow,
  AycmPartnerRow,
  AycmPriceRuleRow,
  AycmCheckInRow,
  AycmSettingsRow,
  GymRow,
  GymColorBandRow,
  IndoorRouteRow,
  CragRow,
  SectorRow,
  RouteRow,
  BoulderProblemRow,
  WeightHistoryRow,
  calendarEventLocalWriteTask,
  calendarEventRowToDto,
  exerciseLocalWriteTask,
  exerciseRowToDto,
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
  swimLogLocalWriteTask,
  swimLogRowToDto,
  bikeRideLogLocalWriteTask,
  bikeRideLogRowToDto,
  recurringExpenseLocalWriteTask,
  recurringExpenseRowToDto,
  aycmPartnerLocalWriteTask,
  aycmPartnerRowToDto,
  aycmPriceRuleLocalWriteTask,
  aycmPriceRuleRowToDto,
  aycmCheckInLocalWriteTask,
  aycmCheckInRowToDto,
  aycmSettingsLocalWriteTask,
  aycmSettingsRowToDto,
  gymLocalWriteTask,
  gymRowToDto,
  gymColorBandLocalWriteTask,
  gymColorBandRowToDto,
  indoorRouteLocalWriteTask,
  indoorRouteRowToDto,
  cragLocalWriteTask,
  cragRowToDto,
  sectorLocalWriteTask,
  sectorRowToDto,
  routeLocalWriteTask,
  routeRowToDto,
  boulderProblemLocalWriteTask,
  boulderProblemRowToDto,
  AscentAttemptRow,
  ClimbingSessionRow,
  PitchLogRow,
  ascentAttemptLocalRemoveTask,
  ascentAttemptLocalWriteTask,
  ascentAttemptRowToDto,
  climbingSessionLocalWriteTask,
  climbingSessionRowToDto,
  pitchLogLocalRemoveTask,
  pitchLogLocalWriteTask,
  pitchLogRowToDto,
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
  WeeklyPlanRow,
  WeeklyPlanSlotRow,
  WorkoutExerciseEntryRow,
  WorkoutPlanExerciseRow,
  WorkoutPlanRow,
  WorkoutPlanSetRow,
  WorkoutSessionRow,
  WorkoutSetEntryRow,
  weeklyPlanLocalWriteTask,
  weeklyPlanRowToDto,
  weeklyPlanSlotLocalRemoveTask,
  weeklyPlanSlotLocalWriteTask,
  weeklyPlanSlotRowToDto,
  workoutExerciseEntryLocalRemoveTask,
  workoutExerciseEntryLocalWriteTask,
  workoutExerciseEntryRowToDto,
  workoutPlanExerciseLocalRemoveTask,
  workoutPlanExerciseLocalWriteTask,
  workoutPlanExerciseRowToDto,
  workoutPlanLocalWriteTask,
  workoutPlanRowToDto,
  workoutPlanSetLocalRemoveTask,
  workoutPlanSetLocalWriteTask,
  workoutPlanSetRowToDto,
  workoutSessionLocalWriteTask,
  workoutSessionRowToDto,
  workoutSetEntryLocalRemoveTask,
  workoutSetEntryLocalWriteTask,
  workoutSetEntryRowToDto,
  DailyStepLogRow,
  dailyStepLogLocalWriteTask,
  dailyStepLogRowToDto,
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
  WeeklyPlanDraft,
  WorkoutPlanDraft,
  WorkoutSessionDraft,
  ClimbingSessionDraft,
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
  private async findLocalOnlyIds(
    table:
      | 'gear_item'
      | 'household_room'
      | 'food'
      | 'recipe'
      | 'exercise_catalog'
      | 'workout_plan'
      | 'gym'
      | 'gym_color_band'
      | 'indoor_route'
      | 'crag'
      | 'sector'
      | 'route'
      | 'boulder_problem'
      | 'aycm_partner',
    candidateIds: string[],
  ): Promise<string[]> {
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

  async listSwimLogs(): Promise<SwimLog[]> {
    const rows = await this.db.query<SwimLogRow>(
      'SELECT * FROM swim_log WHERE deleted = 0 ORDER BY swim_date DESC, created_at DESC',
    );
    return rows.map(swimLogRowToDto);
  }

  async upsertSwimLog(log: SwimLog): Promise<SwimLog> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM swim_log WHERE id = ?', [log.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/swim-logs' : `/api/swim-logs/${log.id}`,
      payload: log,
      entityType: 'SwimLog',
      targetEntityId: log.id,
    });
    await this.db.executeTransaction([swimLogLocalWriteTask(log), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readSwimLog(log.id);
  }

  async deleteSwimLog(id: string): Promise<SwimLog> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/swim-logs/${id}`,
      payload: null,
      entityType: 'SwimLog',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM swim_log WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE swim_log SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, date: '1970-01-01', durationMinutes: 1, intensity: SwimLog.IntensityEnum.Casual, deleted: true };
    }
    return this.readSwimLog(id);
  }

  private async readSwimLog(id: string): Promise<SwimLog> {
    const rows = await this.db.query<SwimLogRow>('SELECT * FROM swim_log WHERE id = ?', [id]);
    return swimLogRowToDto(rows[0]);
  }

  async listBikeRideLogs(): Promise<BikeRideLog[]> {
    const rows = await this.db.query<BikeRideLogRow>(
      'SELECT * FROM bike_ride_log WHERE deleted = 0 ORDER BY ride_date DESC, created_at DESC',
    );
    return rows.map(bikeRideLogRowToDto);
  }

  async upsertBikeRideLog(log: BikeRideLog): Promise<BikeRideLog> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM bike_ride_log WHERE id = ?', [log.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/bike-ride-logs' : `/api/bike-ride-logs/${log.id}`,
      payload: log,
      entityType: 'BikeRideLog',
      targetEntityId: log.id,
    });
    await this.db.executeTransaction([bikeRideLogLocalWriteTask(log), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readBikeRideLog(log.id);
  }

  async deleteBikeRideLog(id: string): Promise<BikeRideLog> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/bike-ride-logs/${id}`,
      payload: null,
      entityType: 'BikeRideLog',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM bike_ride_log WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE bike_ride_log SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, date: '1970-01-01', durationMinutes: 1, intensity: BikeRideLog.IntensityEnum.City, deleted: true };
    }
    return this.readBikeRideLog(id);
  }

  private async readBikeRideLog(id: string): Promise<BikeRideLog> {
    const rows = await this.db.query<BikeRideLogRow>('SELECT * FROM bike_ride_log WHERE id = ?', [id]);
    return bikeRideLogRowToDto(rows[0]);
  }

  async listRecurringExpenses(): Promise<RecurringExpense[]> {
    const rows = await this.db.query<RecurringExpenseRow>(
      'SELECT * FROM recurring_expense WHERE deleted = 0 ORDER BY next_billing_date ASC, name COLLATE NOCASE',
    );
    return rows.map(recurringExpenseRowToDto);
  }

  async upsertRecurringExpense(expense: RecurringExpense): Promise<RecurringExpense> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM recurring_expense WHERE id = ?', [expense.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/recurring-expenses' : `/api/recurring-expenses/${expense.id}`,
      payload: expense,
      entityType: 'RecurringExpense',
      targetEntityId: expense.id,
    });
    await this.db.executeTransaction([recurringExpenseLocalWriteTask(expense), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readRecurringExpense(expense.id);
  }

  async deleteRecurringExpense(id: string): Promise<RecurringExpense> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/recurring-expenses/${id}`,
      payload: null,
      entityType: 'RecurringExpense',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM recurring_expense WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE recurring_expense SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return {
        id,
        name: '',
        amountHuf: 1,
        frequency: RecurringExpense.FrequencyEnum.Monthly,
        category: RecurringExpense.CategoryEnum.Other,
        nextBillingDate: '1970-01-01',
        billingDayOfMonth: 1,
        active: true,
        deleted: true,
      };
    }
    return this.readRecurringExpense(id);
  }

  private async readRecurringExpense(id: string): Promise<RecurringExpense> {
    const rows = await this.db.query<RecurringExpenseRow>('SELECT * FROM recurring_expense WHERE id = ?', [id]);
    return recurringExpenseRowToDto(rows[0]);
  }

  async listAycmPartners(): Promise<AycmPartner[]> {
    const rows = await this.db.query<AycmPartnerRow>(
      'SELECT * FROM aycm_partner WHERE deleted = 0 ORDER BY name COLLATE NOCASE',
    );
    return rows.map(aycmPartnerRowToDto);
  }

  async upsertAycmPartner(partner: AycmPartner): Promise<AycmPartner> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM aycm_partner WHERE id = ?', [partner.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/aycm-partners' : `/api/aycm-partners/${partner.id}`,
      payload: partner,
      entityType: 'AycmPartner',
      targetEntityId: partner.id,
    });
    await this.db.executeTransaction([aycmPartnerLocalWriteTask(partner), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readAycmPartner(partner.id);
  }

  async deleteAycmPartner(id: string): Promise<AycmPartner> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/aycm-partners/${id}`,
      payload: null,
      entityType: 'AycmPartner',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM aycm_partner WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE aycm_partner SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    // documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md: local cascade `deleted` onto the
    // partner's live price rules — the server cascades too, so no separate outbox DELETE per rule.
    const cascadeTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM aycm_price_rule WHERE partner_id = ?', values: [id] }
      : {
          statement:
            'UPDATE aycm_price_rule SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE partner_id = ? AND deleted = 0',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, cascadeTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', deleted: true };
    }
    return this.readAycmPartner(id);
  }

  private async readAycmPartner(id: string): Promise<AycmPartner> {
    const rows = await this.db.query<AycmPartnerRow>('SELECT * FROM aycm_partner WHERE id = ?', [id]);
    return aycmPartnerRowToDto(rows[0]);
  }

  async listAycmPriceRules(partnerId: string): Promise<AycmPriceRule[]> {
    const rows = await this.db.query<AycmPriceRuleRow>(
      'SELECT * FROM aycm_price_rule WHERE partner_id = ? AND deleted = 0 ORDER BY start_time ASC',
      [partnerId],
    );
    return rows.map(aycmPriceRuleRowToDto);
  }

  async upsertAycmPriceRule(rule: AycmPriceRule): Promise<AycmPriceRule> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM aycm_price_rule WHERE id = ?', [rule.id]);
    const isNew = existing.length === 0;
    // documentation/…/AYCM elfogadóhely hozzáadása.md "Frontend": a rule created in the same flow as
    // its (not-yet-synced) partner must wait for the partner's POST first.
    const dependsOn = await this.findLocalOnlyIds('aycm_partner', [rule.partnerId]);
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew
        ? `/api/aycm-partners/${rule.partnerId}/price-rules`
        : `/api/aycm-partners/${rule.partnerId}/price-rules/${rule.id}`,
      payload: rule,
      entityType: 'AycmPriceRule',
      targetEntityId: rule.id,
      dependsOn,
    });
    await this.db.executeTransaction([aycmPriceRuleLocalWriteTask(rule), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readAycmPriceRule(rule.id);
  }

  async deleteAycmPriceRule(partnerId: string, id: string): Promise<AycmPriceRule> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/aycm-partners/${partnerId}/price-rules/${id}`,
      payload: null,
      entityType: 'AycmPriceRule',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM aycm_price_rule WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE aycm_price_rule SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return {
        id,
        partnerId,
        appliesMon: false,
        appliesTue: false,
        appliesWed: false,
        appliesThu: false,
        appliesFri: false,
        appliesSat: false,
        appliesSun: false,
        startTime: '00:00',
        endTime: '00:00',
        listPriceHuf: 0,
        coPaymentHuf: 0,
        deleted: true,
      };
    }
    return this.readAycmPriceRule(id);
  }

  private async readAycmPriceRule(id: string): Promise<AycmPriceRule> {
    const rows = await this.db.query<AycmPriceRuleRow>('SELECT * FROM aycm_price_rule WHERE id = ?', [id]);
    return aycmPriceRuleRowToDto(rows[0]);
  }

  async listAycmCheckIns(): Promise<AycmCheckIn[]> {
    const rows = await this.db.query<AycmCheckInRow>(
      'SELECT * FROM aycm_check_in WHERE deleted = 0 ORDER BY check_in_date DESC, check_in_time DESC',
    );
    return rows.map(aycmCheckInRowToDto);
  }

  async upsertAycmCheckIn(checkIn: AycmCheckIn): Promise<AycmCheckIn> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM aycm_check_in WHERE id = ?', [checkIn.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/aycm-check-ins' : `/api/aycm-check-ins/${checkIn.id}`,
      payload: checkIn,
      entityType: 'AycmCheckIn',
      targetEntityId: checkIn.id,
    });
    await this.db.executeTransaction([aycmCheckInLocalWriteTask(checkIn), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readAycmCheckIn(checkIn.id);
  }

  async deleteAycmCheckIn(id: string): Promise<AycmCheckIn> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/aycm-check-ins/${id}`,
      payload: null,
      entityType: 'AycmCheckIn',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM aycm_check_in WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE aycm_check_in SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return {
        id,
        checkInDate: '1970-01-01',
        checkInTime: '00:00',
        partnerId: '',
        partnerName: '',
        ruleLabel: '',
        listPriceHuf: 0,
        coPaymentHuf: 0,
        visitValueHuf: 0,
        deleted: true,
      };
    }
    return this.readAycmCheckIn(id);
  }

  private async readAycmCheckIn(id: string): Promise<AycmCheckIn> {
    const rows = await this.db.query<AycmCheckInRow>('SELECT * FROM aycm_check_in WHERE id = ?', [id]);
    return aycmCheckInRowToDto(rows[0]);
  }

  async getAycmSettings(): Promise<AycmSettings | null> {
    const rows = await this.db.query<AycmSettingsRow>('SELECT * FROM aycm_settings WHERE deleted = 0 LIMIT 1');
    return rows.length > 0 ? aycmSettingsRowToDto(rows[0]) : null;
  }

  async upsertAycmSettings(settings: AycmSettings): Promise<AycmSettings> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'PUT',
      url: '/api/aycm-settings',
      payload: settings,
      entityType: 'AycmSettings',
      targetEntityId: settings.id,
    });
    await this.db.executeTransaction([aycmSettingsLocalWriteTask(settings), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return (await this.getAycmSettings()) as AycmSettings;
  }

  async listGyms(): Promise<Gym[]> {
    const rows = await this.db.query<GymRow>('SELECT * FROM gym WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(gymRowToDto);
  }

  async upsertGym(gym: Gym): Promise<Gym> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM gym WHERE id = ?', [gym.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/gyms' : `/api/climbing/gyms/${gym.id}`,
      payload: gym,
      entityType: 'Gym',
      targetEntityId: gym.id,
    });
    await this.db.executeTransaction([gymLocalWriteTask(gym), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readGym(gym.id);
  }

  async deleteGym(id: string): Promise<Gym> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/gyms/${id}`,
      payload: null,
      entityType: 'Gym',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM gym WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE gym SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', disciplines: [], deleted: true };
    }
    return this.readGym(id);
  }

  private async readGym(id: string): Promise<Gym> {
    const rows = await this.db.query<GymRow>('SELECT * FROM gym WHERE id = ?', [id]);
    return gymRowToDto(rows[0]);
  }

  async listGymColorBands(): Promise<GymColorBand[]> {
    const rows = await this.db.query<GymColorBandRow>('SELECT * FROM gym_color_band WHERE deleted = 0 ORDER BY absolute_difficulty_index_lower');
    return rows.map(gymColorBandRowToDto);
  }

  async upsertGymColorBand(band: GymColorBand): Promise<GymColorBand> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM gym_color_band WHERE id = ?', [band.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/gym-color-bands' : `/api/climbing/gym-color-bands/${band.id}`,
      payload: band,
      entityType: 'GymColorBand',
      targetEntityId: band.id,
      // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a band created
      // right after an inline new gym must wait for that gym's own POST to land first.
      dependsOn: await this.findLocalOnlyIds('gym', [band.gymId]),
    });
    await this.db.executeTransaction([gymColorBandLocalWriteTask(band), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readGymColorBand(band.id);
  }

  async deleteGymColorBand(id: string): Promise<GymColorBand> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/gym-color-bands/${id}`,
      payload: null,
      entityType: 'GymColorBand',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM gym_color_band WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE gym_color_band SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return {
        id,
        gymId: '',
        name: '',
        hexColor: '#000000',
        variant: GymColorBand.VariantEnum.Neutral,
        gradeLower: '',
        gradeUpper: '',
        absoluteDifficultyIndexLower: 0,
        absoluteDifficultyIndexUpper: 0,
        deleted: true,
      };
    }
    return this.readGymColorBand(id);
  }

  private async readGymColorBand(id: string): Promise<GymColorBand> {
    const rows = await this.db.query<GymColorBandRow>('SELECT * FROM gym_color_band WHERE id = ?', [id]);
    return gymColorBandRowToDto(rows[0]);
  }

  async listIndoorRoutes(): Promise<IndoorRoute[]> {
    const rows = await this.db.query<IndoorRouteRow>('SELECT * FROM indoor_route WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(indoorRouteRowToDto);
  }

  async upsertIndoorRoute(route: IndoorRoute): Promise<IndoorRoute> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM indoor_route WHERE id = ?', [route.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/indoor-routes' : `/api/climbing/indoor-routes/${route.id}`,
      payload: route,
      entityType: 'IndoorRoute',
      targetEntityId: route.id,
      dependsOn: await this.findLocalOnlyIds('gym', [route.gymId]),
    });
    await this.db.executeTransaction([indoorRouteLocalWriteTask(route), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readIndoorRoute(route.id);
  }

  async deleteIndoorRoute(id: string): Promise<IndoorRoute> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/indoor-routes/${id}`,
      payload: null,
      entityType: 'IndoorRoute',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM indoor_route WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE indoor_route SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, gymId: '', name: '', discipline: IndoorRoute.DisciplineEnum.Boulder, grade: '', absoluteDifficultyIndex: 0, deleted: true };
    }
    return this.readIndoorRoute(id);
  }

  private async readIndoorRoute(id: string): Promise<IndoorRoute> {
    const rows = await this.db.query<IndoorRouteRow>('SELECT * FROM indoor_route WHERE id = ?', [id]);
    return indoorRouteRowToDto(rows[0]);
  }

  async listCrags(): Promise<Crag[]> {
    const rows = await this.db.query<CragRow>('SELECT * FROM crag WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(cragRowToDto);
  }

  async upsertCrag(crag: Crag): Promise<Crag> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM crag WHERE id = ?', [crag.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/crags' : `/api/climbing/crags/${crag.id}`,
      payload: crag,
      entityType: 'Crag',
      targetEntityId: crag.id,
    });
    await this.db.executeTransaction([cragLocalWriteTask(crag), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readCrag(crag.id);
  }

  async deleteCrag(id: string): Promise<Crag> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/crags/${id}`,
      payload: null,
      entityType: 'Crag',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM crag WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE crag SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', deleted: true };
    }
    return this.readCrag(id);
  }

  private async readCrag(id: string): Promise<Crag> {
    const rows = await this.db.query<CragRow>('SELECT * FROM crag WHERE id = ?', [id]);
    return cragRowToDto(rows[0]);
  }

  async listSectors(): Promise<Sector[]> {
    const rows = await this.db.query<SectorRow>('SELECT * FROM sector WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(sectorRowToDto);
  }

  async upsertSector(sector: Sector): Promise<Sector> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM sector WHERE id = ?', [sector.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/sectors' : `/api/climbing/sectors/${sector.id}`,
      payload: sector,
      entityType: 'Sector',
      targetEntityId: sector.id,
      // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a sector created
      // right after an inline new crag must wait for that crag's own POST to land first.
      dependsOn: await this.findLocalOnlyIds('crag', [sector.cragId]),
    });
    await this.db.executeTransaction([sectorLocalWriteTask(sector), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readSector(sector.id);
  }

  async deleteSector(id: string): Promise<Sector> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/sectors/${id}`,
      payload: null,
      entityType: 'Sector',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM sector WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE sector SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, cragId: '', name: '', deleted: true };
    }
    return this.readSector(id);
  }

  private async readSector(id: string): Promise<Sector> {
    const rows = await this.db.query<SectorRow>('SELECT * FROM sector WHERE id = ?', [id]);
    return sectorRowToDto(rows[0]);
  }

  async listRoutes(): Promise<Route[]> {
    const rows = await this.db.query<RouteRow>('SELECT * FROM route WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(routeRowToDto);
  }

  async upsertRoute(route: Route): Promise<Route> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM route WHERE id = ?', [route.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/routes' : `/api/climbing/routes/${route.id}`,
      payload: route,
      entityType: 'Route',
      targetEntityId: route.id,
      dependsOn: await this.findLocalOnlyIds('sector', [route.sectorId]),
    });
    await this.db.executeTransaction([routeLocalWriteTask(route), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readRoute(route.id);
  }

  async deleteRoute(id: string): Promise<Route> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/routes/${id}`,
      payload: null,
      entityType: 'Route',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM route WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE route SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, sectorId: '', name: '', guidebookGrade: '', deleted: true };
    }
    return this.readRoute(id);
  }

  private async readRoute(id: string): Promise<Route> {
    const rows = await this.db.query<RouteRow>('SELECT * FROM route WHERE id = ?', [id]);
    return routeRowToDto(rows[0]);
  }

  async listBoulderProblems(): Promise<BoulderProblem[]> {
    const rows = await this.db.query<BoulderProblemRow>('SELECT * FROM boulder_problem WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(boulderProblemRowToDto);
  }

  async upsertBoulderProblem(problem: BoulderProblem): Promise<BoulderProblem> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM boulder_problem WHERE id = ?', [problem.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/boulder-problems' : `/api/climbing/boulder-problems/${problem.id}`,
      payload: problem,
      entityType: 'BoulderProblem',
      targetEntityId: problem.id,
      dependsOn: await this.findLocalOnlyIds('sector', [problem.sectorId]),
    });
    await this.db.executeTransaction([boulderProblemLocalWriteTask(problem), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readBoulderProblem(problem.id);
  }

  async deleteBoulderProblem(id: string): Promise<BoulderProblem> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/boulder-problems/${id}`,
      payload: null,
      entityType: 'BoulderProblem',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM boulder_problem WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE boulder_problem SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, sectorId: '', name: '', guidebookGrade: '', deleted: true };
    }
    return this.readBoulderProblem(id);
  }

  private async readBoulderProblem(id: string): Promise<BoulderProblem> {
    const rows = await this.db.query<BoulderProblemRow>('SELECT * FROM boulder_problem WHERE id = ?', [id]);
    return boulderProblemRowToDto(rows[0]);
  }

  async listExercises(): Promise<Exercise[]> {
    const rows = await this.db.query<ExerciseRow>('SELECT * FROM exercise_catalog WHERE deleted = 0 ORDER BY name COLLATE NOCASE');
    return rows.map(exerciseRowToDto);
  }

  async upsertExercise(exercise: Exercise): Promise<Exercise> {
    const userId = this.requireUserId();
    const existing = await this.db.query('SELECT 1 FROM exercise_catalog WHERE id = ?', [exercise.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/exercises' : `/api/exercises/${exercise.id}`,
      payload: exercise,
      entityType: 'Exercise',
      targetEntityId: exercise.id,
    });
    await this.db.executeTransaction([exerciseLocalWriteTask(exercise), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readExercise(exercise.id);
  }

  async deleteExercise(id: string): Promise<Exercise> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/exercises/${id}`,
      payload: null,
      entityType: 'Exercise',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM exercise_catalog WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE exercise_catalog SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', category: Exercise.CategoryEnum.FullBody, kind: Exercise.KindEnum.WeightedReps, isFavorite: false, deleted: true };
    }
    return this.readExercise(id);
  }

  /** documentation/Subfeatures/Gyakorlat.md "Seed": no-op once the catalog has any row (live or tombstoned). */
  async seedExercises(): Promise<void> {
    const userId = this.requireUserId();
    const rows = await this.db.query<{ count: number }>('SELECT COUNT(*) AS count FROM exercise_catalog');
    if ((rows[0]?.count ?? 0) > 0) {
      return;
    }
    for (const exercise of await buildSeedExercises(userId)) {
      await this.upsertExercise(exercise);
    }
  }

  private async readExercise(id: string): Promise<Exercise> {
    const rows = await this.db.query<ExerciseRow>('SELECT * FROM exercise_catalog WHERE id = ?', [id]);
    return exerciseRowToDto(rows[0]);
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

  async listWorkoutSessions(): Promise<WorkoutSession[]> {
    const sessionRows = await this.db.query<WorkoutSessionRow>(
      'SELECT * FROM workout_session WHERE deleted = 0 ORDER BY session_date DESC, created_at DESC',
    );
    // WorkoutSession.exercises / entry.sets contract: every row, live or tombstoned — matches
    // HttpStorageBackend / the backend's own toDto. Callers filter `!deleted` themselves.
    const exerciseRows = await this.db.query<WorkoutExerciseEntryRow>('SELECT * FROM workout_exercise_entry ORDER BY order_index');
    const setRows = await this.db.query<WorkoutSetEntryRow>('SELECT * FROM workout_set_entry ORDER BY order_index');
    return sessionRows.map((row) => assembleWorkoutSession(row, exerciseRows, setRows));
  }

  getWorkoutSession(id: string): Promise<WorkoutSession> {
    return this.readWorkoutSession(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": session + exercises + sets in one local transaction and one outbox entry. */
  async saveWorkoutSession(draft: WorkoutSessionDraft): Promise<WorkoutSession> {
    const userId = this.requireUserId();
    const existingSessionRows = await this.db.query('SELECT 1 FROM workout_session WHERE id = ?', [draft.id]);
    const isNew = existingSessionRows.length === 0;

    const existingExerciseRows = await this.db.query<WorkoutExerciseEntryRow>(
      'SELECT * FROM workout_exercise_entry WHERE session_id = ?',
      [draft.id],
    );
    const existingSetRows = await this.db.query<WorkoutSetEntryRow>(
      `SELECT s.* FROM workout_set_entry s JOIN workout_exercise_entry e ON s.exercise_entry_id = e.id WHERE e.session_id = ?`,
      [draft.id],
    );
    const incomingExerciseIds = new Set(draft.exercises.map((exercise) => exercise.id));

    const localTasks: SqlTask[] = [workoutSessionLocalWriteTask(draft)];
    for (const exercise of draft.exercises) {
      localTasks.push(workoutExerciseEntryLocalWriteTask({ ...exercise, sessionId: draft.id }));
      const incomingSetIds = new Set(exercise.sets.map((set) => set.id));
      for (const set of exercise.sets) {
        localTasks.push(workoutSetEntryLocalWriteTask({ ...set, exerciseEntryId: exercise.id }));
      }
      for (const existingSet of existingSetRows) {
        if (existingSet.exercise_entry_id === exercise.id && existingSet.deleted === 0 && !incomingSetIds.has(existingSet.id)) {
          localTasks.push(workoutSetEntryLocalRemoveTask(existingSet.id));
        }
      }
    }
    for (const existingExercise of existingExerciseRows) {
      if (existingExercise.deleted === 0 && !incomingExerciseIds.has(existingExercise.id)) {
        localTasks.push(workoutExerciseEntryLocalRemoveTask(existingExercise.id));
        for (const existingSet of existingSetRows) {
          if (existingSet.exercise_entry_id === existingExercise.id && existingSet.deleted === 0) {
            localTasks.push(workoutSetEntryLocalRemoveTask(existingSet.id));
          }
        }
      }
    }

    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": an entry that
    // references an exercise_catalog row created in the same offline session must wait for that
    // exercise's own POST first (the workout_exercise_entry.exercise_id FK).
    const dependsOn = await this.findLocalOnlyIds(
      'exercise_catalog',
      draft.exercises.map((exercise) => exercise.exerciseId).filter((id): id is string => id !== null),
    );
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/workout-sessions' : `/api/workout-sessions/${draft.id}`,
      payload: buildWorkoutSessionPayload(draft),
      entityType: 'WorkoutSession',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readWorkoutSession(draft.id);
  }

  async deleteWorkoutSession(id: string): Promise<WorkoutSession> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/workout-sessions/${id}`,
      payload: null,
      entityType: 'WorkoutSession',
      targetEntityId: id,
    });
    const liveExerciseRows = await this.db.query<{ id: string }>(
      'SELECT id FROM workout_exercise_entry WHERE session_id = ? AND deleted = 0',
      [id],
    );
    const liveSetRows = await this.db.query<{ id: string }>(
      `SELECT s.id FROM workout_set_entry s JOIN workout_exercise_entry e ON s.exercise_entry_id = e.id WHERE e.session_id = ? AND s.deleted = 0`,
      [id],
    );
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      for (const row of liveSetRows) {
        tasks.push({ statement: 'DELETE FROM workout_set_entry WHERE id = ?', values: [row.id] });
      }
      for (const row of liveExerciseRows) {
        tasks.push({ statement: 'DELETE FROM workout_exercise_entry WHERE id = ?', values: [row.id] });
      }
      tasks.push({ statement: 'DELETE FROM workout_session WHERE id = ?', values: [id] });
    } else {
      tasks.push({
        statement: 'UPDATE workout_session SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveExerciseRows) {
        tasks.push(workoutExerciseEntryLocalRemoveTask(row.id));
      }
      for (const row of liveSetRows) {
        tasks.push(workoutSetEntryLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return {
        id,
        date: '1970-01-01',
        workoutType: WorkoutSession.WorkoutTypeEnum.GeneralWeights,
        deleted: true,
        exercises: [],
      };
    }
    return this.readWorkoutSession(id);
  }

  private async readWorkoutSession(id: string): Promise<WorkoutSession> {
    const sessionRows = await this.db.query<WorkoutSessionRow>('SELECT * FROM workout_session WHERE id = ?', [id]);
    const exerciseRows = await this.db.query<WorkoutExerciseEntryRow>(
      'SELECT * FROM workout_exercise_entry WHERE session_id = ? ORDER BY order_index',
      [id],
    );
    const setRows = await this.db.query<WorkoutSetEntryRow>(
      `SELECT s.* FROM workout_set_entry s JOIN workout_exercise_entry e ON s.exercise_entry_id = e.id WHERE e.session_id = ? ORDER BY s.order_index`,
      [id],
    );
    return assembleWorkoutSession(sessionRows[0], exerciseRows, setRows);
  }

  // --- Mászónapló: ClimbingSession -> AscentAttempt -> PitchLog (3-level nested aggregate, M4) ----

  async listClimbingSessions(): Promise<ClimbingSession[]> {
    const sessionRows = await this.db.query<ClimbingSessionRow>(
      'SELECT * FROM climbing_session WHERE deleted = 0 ORDER BY session_date DESC, created_at DESC',
    );
    // ClimbingSession.attempts / attempt.pitches contract: every row, live or tombstoned — matches
    // HttpStorageBackend / the backend's own toDto. Callers filter `!deleted` themselves.
    const attemptRows = await this.db.query<AscentAttemptRow>('SELECT * FROM ascent_attempt ORDER BY order_index');
    const pitchRows = await this.db.query<PitchLogRow>('SELECT * FROM pitch_log ORDER BY order_index');
    return sessionRows.map((row) => assembleClimbingSession(row, attemptRows, pitchRows));
  }

  getClimbingSession(id: string): Promise<ClimbingSession> {
    return this.readClimbingSession(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": session + attempts + pitches in one local transaction and one outbox entry. */
  async saveClimbingSession(draft: ClimbingSessionDraft): Promise<ClimbingSession> {
    const userId = this.requireUserId();
    const existingSessionRows = await this.db.query('SELECT 1 FROM climbing_session WHERE id = ?', [draft.id]);
    const isNew = existingSessionRows.length === 0;

    const existingAttemptRows = await this.db.query<AscentAttemptRow>(
      'SELECT * FROM ascent_attempt WHERE session_id = ?',
      [draft.id],
    );
    const existingPitchRows = await this.db.query<PitchLogRow>(
      `SELECT p.* FROM pitch_log p JOIN ascent_attempt a ON p.attempt_id = a.id WHERE a.session_id = ?`,
      [draft.id],
    );
    const incomingAttemptIds = new Set(draft.attempts.map((attempt) => attempt.id));

    const localTasks: SqlTask[] = [climbingSessionLocalWriteTask(draft)];
    for (const attempt of draft.attempts) {
      localTasks.push(ascentAttemptLocalWriteTask({ ...attempt, sessionId: draft.id }));
      const incomingPitchIds = new Set(attempt.pitches.map((pitch) => pitch.id));
      for (const pitch of attempt.pitches) {
        localTasks.push(pitchLogLocalWriteTask({ ...pitch, attemptId: attempt.id }));
      }
      for (const existingPitch of existingPitchRows) {
        if (existingPitch.attempt_id === attempt.id && existingPitch.deleted === 0 && !incomingPitchIds.has(existingPitch.id)) {
          localTasks.push(pitchLogLocalRemoveTask(existingPitch.id));
        }
      }
    }
    for (const existingAttempt of existingAttemptRows) {
      if (existingAttempt.deleted === 0 && !incomingAttemptIds.has(existingAttempt.id)) {
        localTasks.push(ascentAttemptLocalRemoveTask(existingAttempt.id));
        for (const existingPitch of existingPitchRows) {
          if (existingPitch.attempt_id === existingAttempt.id && existingPitch.deleted === 0) {
            localTasks.push(pitchLogLocalRemoveTask(existingPitch.id));
          }
        }
      }
    }

    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": a session / attempt
    // that references a venue-master row created in the same offline session must wait for that row's
    // own POST first (the gym_id / *_id soft-link FKs).
    const dependsOn = [
      ...(await this.findLocalOnlyIds('gym', draft.gymId ? [draft.gymId] : [])),
      ...(await this.findLocalOnlyIds('crag', draft.cragId ? [draft.cragId] : [])),
      ...(await this.findLocalOnlyIds('sector', draft.sectorId ? [draft.sectorId] : [])),
      ...(await this.findLocalOnlyIds(
        'gym_color_band',
        draft.attempts.map((a) => a.colorBandId).filter((id): id is string => id !== null),
      )),
      ...(await this.findLocalOnlyIds(
        'indoor_route',
        draft.attempts.map((a) => a.indoorRouteId).filter((id): id is string => id !== null),
      )),
      ...(await this.findLocalOnlyIds(
        'route',
        draft.attempts.map((a) => a.routeId).filter((id): id is string => id !== null),
      )),
      ...(await this.findLocalOnlyIds(
        'boulder_problem',
        draft.attempts.map((a) => a.boulderProblemId).filter((id): id is string => id !== null),
      )),
    ];
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/climbing/sessions' : `/api/climbing/sessions/${draft.id}`,
      payload: buildClimbingSessionPayload(draft),
      entityType: 'ClimbingSession',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readClimbingSession(draft.id);
  }

  async deleteClimbingSession(id: string): Promise<ClimbingSession> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/climbing/sessions/${id}`,
      payload: null,
      entityType: 'ClimbingSession',
      targetEntityId: id,
    });
    const liveAttemptRows = await this.db.query<{ id: string }>(
      'SELECT id FROM ascent_attempt WHERE session_id = ? AND deleted = 0',
      [id],
    );
    const livePitchRows = await this.db.query<{ id: string }>(
      `SELECT p.id FROM pitch_log p JOIN ascent_attempt a ON p.attempt_id = a.id WHERE a.session_id = ? AND p.deleted = 0`,
      [id],
    );
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      for (const row of livePitchRows) {
        tasks.push({ statement: 'DELETE FROM pitch_log WHERE id = ?', values: [row.id] });
      }
      for (const row of liveAttemptRows) {
        tasks.push({ statement: 'DELETE FROM ascent_attempt WHERE id = ?', values: [row.id] });
      }
      tasks.push({ statement: 'DELETE FROM climbing_session WHERE id = ?', values: [id] });
    } else {
      tasks.push({
        statement: 'UPDATE climbing_session SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveAttemptRows) {
        tasks.push(ascentAttemptLocalRemoveTask(row.id));
      }
      for (const row of livePitchRows) {
        tasks.push(pitchLogLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return {
        id,
        date: '1970-01-01',
        locationType: ClimbingSession.LocationTypeEnum.Indoor,
        discipline: ClimbingSession.DisciplineEnum.Boulder,
        deleted: true,
        attempts: [],
      };
    }
    return this.readClimbingSession(id);
  }

  private async readClimbingSession(id: string): Promise<ClimbingSession> {
    const sessionRows = await this.db.query<ClimbingSessionRow>('SELECT * FROM climbing_session WHERE id = ?', [id]);
    const attemptRows = await this.db.query<AscentAttemptRow>(
      'SELECT * FROM ascent_attempt WHERE session_id = ? ORDER BY order_index',
      [id],
    );
    const pitchRows = await this.db.query<PitchLogRow>(
      `SELECT p.* FROM pitch_log p JOIN ascent_attempt a ON p.attempt_id = a.id WHERE a.session_id = ? ORDER BY p.order_index`,
      [id],
    );
    return assembleClimbingSession(sessionRows[0], attemptRows, pitchRows);
  }

  // --- Heti terv: WorkoutPlan (3-level nested aggregate) + WeeklyPlan (2-level) ------------------

  async listWorkoutPlans(): Promise<WorkoutPlan[]> {
    const planRows = await this.db.query<WorkoutPlanRow>('SELECT * FROM workout_plan WHERE deleted = 0 ORDER BY created_at ASC');
    // WorkoutPlan.exercises / exercise.targetSets contract: every row, live or tombstoned — matches
    // HttpStorageBackend / the backend's own toDto. Callers filter `!deleted` themselves.
    const exerciseRows = await this.db.query<WorkoutPlanExerciseRow>('SELECT * FROM workout_plan_exercise ORDER BY order_index');
    const setRows = await this.db.query<WorkoutPlanSetRow>('SELECT * FROM workout_plan_set ORDER BY order_index');
    return planRows.map((row) => assembleWorkoutPlan(row, exerciseRows, setRows));
  }

  getWorkoutPlan(id: string): Promise<WorkoutPlan> {
    return this.readWorkoutPlan(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": plan + exercises + target sets in one local transaction and one outbox entry. */
  async saveWorkoutPlan(draft: WorkoutPlanDraft): Promise<WorkoutPlan> {
    const userId = this.requireUserId();
    const existingPlanRows = await this.db.query('SELECT 1 FROM workout_plan WHERE id = ?', [draft.id]);
    const isNew = existingPlanRows.length === 0;

    const existingExerciseRows = await this.db.query<WorkoutPlanExerciseRow>(
      'SELECT * FROM workout_plan_exercise WHERE plan_id = ?',
      [draft.id],
    );
    const existingSetRows = await this.db.query<WorkoutPlanSetRow>(
      `SELECT s.* FROM workout_plan_set s JOIN workout_plan_exercise e ON s.plan_exercise_id = e.id WHERE e.plan_id = ?`,
      [draft.id],
    );
    const incomingExerciseIds = new Set(draft.exercises.map((exercise) => exercise.id));

    const localTasks: SqlTask[] = [
      workoutPlanLocalWriteTask({
        id: draft.id,
        name: draft.name,
        notes: draft.notes,
        active: draft.active,
        goalLabel: draft.goalLabel,
        defaultWorkoutType: draft.defaultWorkoutType,
      }),
    ];
    for (const exercise of draft.exercises) {
      localTasks.push(workoutPlanExerciseLocalWriteTask({ ...exercise, planId: draft.id }));
      const incomingSetIds = new Set(exercise.targetSets.map((set) => set.id));
      for (const set of exercise.targetSets) {
        localTasks.push(workoutPlanSetLocalWriteTask({ ...set, planExerciseId: exercise.id }));
      }
      for (const existingSet of existingSetRows) {
        if (existingSet.plan_exercise_id === exercise.id && existingSet.deleted === 0 && !incomingSetIds.has(existingSet.id)) {
          localTasks.push(workoutPlanSetLocalRemoveTask(existingSet.id));
        }
      }
    }
    for (const existingExercise of existingExerciseRows) {
      if (existingExercise.deleted === 0 && !incomingExerciseIds.has(existingExercise.id)) {
        localTasks.push(workoutPlanExerciseLocalRemoveTask(existingExercise.id));
        for (const existingSet of existingSetRows) {
          if (existingSet.plan_exercise_id === existingExercise.id && existingSet.deleted === 0) {
            localTasks.push(workoutPlanSetLocalRemoveTask(existingSet.id));
          }
        }
      }
    }

    // documentation/Architektúra/Backend-offline first.md §10 "Függőségi láncok": an exercise line
    // referencing an exercise_catalog row created in the same offline session must wait for that
    // exercise's own POST first (workout_plan_exercise.exercise_id is a NOT NULL FK).
    const dependsOn = await this.findLocalOnlyIds('exercise_catalog', draft.exercises.map((exercise) => exercise.exerciseId));
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/workout-plans' : `/api/workout-plans/${draft.id}`,
      payload: buildWorkoutPlanPayload(draft),
      entityType: 'WorkoutPlan',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readWorkoutPlan(draft.id);
  }

  async deleteWorkoutPlan(id: string): Promise<WorkoutPlan> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/workout-plans/${id}`,
      payload: null,
      entityType: 'WorkoutPlan',
      targetEntityId: id,
    });
    const liveExerciseRows = await this.db.query<{ id: string }>(
      'SELECT id FROM workout_plan_exercise WHERE plan_id = ? AND deleted = 0',
      [id],
    );
    const liveSetRows = await this.db.query<{ id: string }>(
      `SELECT s.id FROM workout_plan_set s JOIN workout_plan_exercise e ON s.plan_exercise_id = e.id WHERE e.plan_id = ? AND s.deleted = 0`,
      [id],
    );
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      for (const row of liveSetRows) {
        tasks.push({ statement: 'DELETE FROM workout_plan_set WHERE id = ?', values: [row.id] });
      }
      for (const row of liveExerciseRows) {
        tasks.push({ statement: 'DELETE FROM workout_plan_exercise WHERE id = ?', values: [row.id] });
      }
      tasks.push({ statement: 'DELETE FROM workout_plan WHERE id = ?', values: [id] });
    } else {
      tasks.push({
        statement: 'UPDATE workout_plan SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveExerciseRows) {
        tasks.push(workoutPlanExerciseLocalRemoveTask(row.id));
      }
      for (const row of liveSetRows) {
        tasks.push(workoutPlanSetLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, name: '', active: true, deleted: true, exercises: [] };
    }
    return this.readWorkoutPlan(id);
  }

  private async readWorkoutPlan(id: string): Promise<WorkoutPlan> {
    const planRows = await this.db.query<WorkoutPlanRow>('SELECT * FROM workout_plan WHERE id = ?', [id]);
    const exerciseRows = await this.db.query<WorkoutPlanExerciseRow>(
      'SELECT * FROM workout_plan_exercise WHERE plan_id = ? ORDER BY order_index',
      [id],
    );
    const setRows = await this.db.query<WorkoutPlanSetRow>(
      `SELECT s.* FROM workout_plan_set s JOIN workout_plan_exercise e ON s.plan_exercise_id = e.id WHERE e.plan_id = ? ORDER BY s.order_index`,
      [id],
    );
    return assembleWorkoutPlan(planRows[0], exerciseRows, setRows);
  }

  async listWeeklyPlans(): Promise<WeeklyPlan[]> {
    const weekRows = await this.db.query<WeeklyPlanRow>('SELECT * FROM weekly_plan WHERE deleted = 0 ORDER BY week_start_date DESC');
    const slotRows = await this.db.query<WeeklyPlanSlotRow>('SELECT * FROM weekly_plan_slot');
    const slotsByWeek = new Map<string, WeeklyPlan['slots']>();
    for (const row of slotRows) {
      const dto = weeklyPlanSlotRowToDto(row);
      const list = slotsByWeek.get(dto.weeklyPlanId) ?? [];
      list.push(dto);
      slotsByWeek.set(dto.weeklyPlanId, list);
    }
    return weekRows.map((row) => ({ ...weeklyPlanRowToDto(row), slots: slotsByWeek.get(row.id) ?? [] }));
  }

  getWeeklyPlan(id: string): Promise<WeeklyPlan> {
    return this.readWeeklyPlan(id);
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": week + slots in one local transaction and one outbox entry. */
  async saveWeeklyPlan(draft: WeeklyPlanDraft): Promise<WeeklyPlan> {
    const userId = this.requireUserId();
    const existingWeekRows = await this.db.query('SELECT 1 FROM weekly_plan WHERE id = ?', [draft.id]);
    const isNew = existingWeekRows.length === 0;

    const existingSlotRows = await this.db.query<WeeklyPlanSlotRow>('SELECT * FROM weekly_plan_slot WHERE weekly_plan_id = ?', [draft.id]);
    const incomingIds = new Set(draft.slots.map((slot) => slot.id));

    const localTasks: SqlTask[] = [weeklyPlanLocalWriteTask({ id: draft.id, weekStartDate: draft.weekStartDate })];
    for (const slot of draft.slots) {
      localTasks.push(weeklyPlanSlotLocalWriteTask({ id: slot.id, weeklyPlanId: draft.id, dayOfWeek: slot.dayOfWeek, planId: slot.planId }));
    }
    for (const existing of existingSlotRows) {
      if (existing.deleted === 0 && !incomingIds.has(existing.id)) {
        localTasks.push(weeklyPlanSlotLocalRemoveTask(existing.id));
      }
    }

    // A slot referencing a WorkoutPlan created in the same offline session must wait for that plan's own POST first.
    const dependsOn = await this.findLocalOnlyIds('workout_plan', draft.slots.map((slot) => slot.planId));
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/weekly-plans' : `/api/weekly-plans/${draft.id}`,
      payload: buildWeeklyPlanPayload(draft),
      entityType: 'WeeklyPlan',
      targetEntityId: draft.id,
      dependsOn,
    });
    await this.db.executeTransaction([...localTasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readWeeklyPlan(draft.id);
  }

  async deleteWeeklyPlan(id: string): Promise<WeeklyPlan> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/weekly-plans/${id}`,
      payload: null,
      entityType: 'WeeklyPlan',
      targetEntityId: id,
    });
    const liveSlotRows = await this.db.query<{ id: string }>('SELECT id FROM weekly_plan_slot WHERE weekly_plan_id = ? AND deleted = 0', [id]);
    const tasks: SqlTask[] = [];
    if (enqueue.hardRemoveLocalEntity) {
      tasks.push({ statement: 'DELETE FROM weekly_plan WHERE id = ?', values: [id] });
      for (const row of liveSlotRows) {
        tasks.push({ statement: 'DELETE FROM weekly_plan_slot WHERE id = ?', values: [row.id] });
      }
    } else {
      tasks.push({
        statement: 'UPDATE weekly_plan SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
        values: [new Date().toISOString(), id],
      });
      for (const row of liveSlotRows) {
        tasks.push(weeklyPlanSlotLocalRemoveTask(row.id));
      }
    }
    await this.db.executeTransaction([...tasks, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, weekStartDate: '1970-01-01', deleted: true, slots: [] };
    }
    return this.readWeeklyPlan(id);
  }

  private async readWeeklyPlan(id: string): Promise<WeeklyPlan> {
    const weekRows = await this.db.query<WeeklyPlanRow>('SELECT * FROM weekly_plan WHERE id = ?', [id]);
    const slotRows = await this.db.query<WeeklyPlanSlotRow>('SELECT * FROM weekly_plan_slot WHERE weekly_plan_id = ?', [id]);
    return { ...weeklyPlanRowToDto(weekRows[0]), slots: slotRows.map(weeklyPlanSlotRowToDto) };
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

  async listDailyStepLogs(): Promise<DailyStepLog[]> {
    const rows = await this.db.query<DailyStepLogRow>(
      'SELECT * FROM daily_step_log WHERE deleted = 0 ORDER BY log_date DESC',
    );
    return rows.map(dailyStepLogRowToDto);
  }

  /** Every calendar date that has a local row, tombstoned rows included — for the Health Connect
   * backfill's gap detection, so a deliberately deleted day is not re-pulled and re-created. */
  async listDailyStepLogDates(): Promise<string[]> {
    const rows = await this.db.query<{ log_date: string }>('SELECT log_date FROM daily_step_log');
    return rows.map((row) => row.log_date);
  }

  async upsertDailyStepLog(log: DailyStepLog): Promise<DailyStepLog> {
    const userId = this.requireUserId();
    // Unlike the v4-id flat entities, the (userId, date) v5 id is reused after a delete, so "a row
    // exists" is not the same as "a live row exists". Route re-adding steps to a tombstoned day
    // through POST (idempotent upsert that revives server-side) — a PUT would hit 409 ENTITY_DELETED
    // and the outbox item would be silently dropped, diverging from the web build which always POSTs.
    const existing = await this.db.query('SELECT 1 FROM daily_step_log WHERE id = ? AND deleted = 0', [log.id]);
    const isNew = existing.length === 0;
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: isNew ? 'POST' : 'PUT',
      url: isNew ? '/api/daily-step-logs' : `/api/daily-step-logs/${log.id}`,
      payload: log,
      entityType: 'DailyStepLog',
      targetEntityId: log.id,
    });
    await this.db.executeTransaction([dailyStepLogLocalWriteTask(log), ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    return this.readDailyStepLog(log.id);
  }

  async deleteDailyStepLog(id: string): Promise<DailyStepLog> {
    const userId = this.requireUserId();
    const enqueue = await this.offlineQueue.buildEnqueueTasks({
      userId,
      method: 'DELETE',
      url: `/api/daily-step-logs/${id}`,
      payload: null,
      entityType: 'DailyStepLog',
      targetEntityId: id,
    });
    const entityTask: SqlTask = enqueue.hardRemoveLocalEntity
      ? { statement: 'DELETE FROM daily_step_log WHERE id = ?', values: [id] }
      : {
          statement: 'UPDATE daily_step_log SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?',
          values: [new Date().toISOString(), id],
        };
    await this.db.executeTransaction([entityTask, ...enqueue.outboxTasks]);
    await this.offlineQueue.refreshCounts(userId);
    if (enqueue.hardRemoveLocalEntity) {
      return { id, date: '1970-01-01', stepCount: 0, deleted: true };
    }
    return this.readDailyStepLog(id);
  }

  private async readDailyStepLog(id: string): Promise<DailyStepLog> {
    const rows = await this.db.query<DailyStepLogRow>('SELECT * FROM daily_step_log WHERE id = ?', [id]);
    return dailyStepLogRowToDto(rows[0]);
  }

  private requireUserId(): string {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('SqliteStorageBackend: no authenticated user');
    }
    return userId;
  }
}

/** Stitches flat session/exercise/set row lists back into one nested `WorkoutSession` tree (every row, live or tombstoned). */
function assembleWorkoutSession(
  sessionRow: WorkoutSessionRow,
  exerciseRows: WorkoutExerciseEntryRow[],
  setRows: WorkoutSetEntryRow[],
): WorkoutSession {
  const setsByExercise = new Map<string, WorkoutSetEntryRow[]>();
  for (const row of setRows) {
    const list = setsByExercise.get(row.exercise_entry_id) ?? [];
    list.push(row);
    setsByExercise.set(row.exercise_entry_id, list);
  }
  const exercises = exerciseRows
    .filter((row) => row.session_id === sessionRow.id)
    .map((row) => ({
      ...workoutExerciseEntryRowToDto(row),
      sets: (setsByExercise.get(row.id) ?? []).map(workoutSetEntryRowToDto),
    }));
  return { ...workoutSessionRowToDto(sessionRow), exercises };
}

/** Stitches flat plan/exercise/set row lists back into one nested `WorkoutPlan` tree (every row, live or tombstoned). */
function assembleWorkoutPlan(
  planRow: WorkoutPlanRow,
  exerciseRows: WorkoutPlanExerciseRow[],
  setRows: WorkoutPlanSetRow[],
): WorkoutPlan {
  const setsByExercise = new Map<string, WorkoutPlanSetRow[]>();
  for (const row of setRows) {
    const list = setsByExercise.get(row.plan_exercise_id) ?? [];
    list.push(row);
    setsByExercise.set(row.plan_exercise_id, list);
  }
  const exercises = exerciseRows
    .filter((row) => row.plan_id === planRow.id)
    .map((row) => ({
      ...workoutPlanExerciseRowToDto(row),
      targetSets: (setsByExercise.get(row.id) ?? []).map(workoutPlanSetRowToDto),
    }));
  return { ...workoutPlanRowToDto(planRow), exercises };
}

/** The full `WorkoutPlan` wire body for the outbox — mirrors HttpStorageBackend.saveWorkoutPlan. */
function buildWorkoutPlanPayload(draft: WorkoutPlanDraft): WorkoutPlan {
  return {
    id: draft.id,
    name: draft.name,
    notes: draft.notes,
    active: draft.active,
    goalLabel: draft.goalLabel,
    defaultWorkoutType: draft.defaultWorkoutType,
    deleted: false,
    exercises: draft.exercises.map((exercise) => ({
      id: exercise.id,
      planId: draft.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      exerciseCategory: exercise.exerciseCategory,
      exerciseKind: exercise.exerciseKind,
      orderIndex: exercise.orderIndex,
      supersetGroup: exercise.supersetGroup,
      deleted: false,
      targetSets: exercise.targetSets.map((set) => ({
        id: set.id,
        planExerciseId: exercise.id,
        setType: set.setType,
        reps: set.reps,
        weightKg: set.weightKg,
        holdTimeSeconds: set.holdTimeSeconds,
        edgeSizeMm: set.edgeSizeMm,
        distanceMeters: set.distanceMeters,
        restTimeSeconds: set.restTimeSeconds,
        orderIndex: set.orderIndex,
        deleted: false,
      })),
    })),
  };
}

/** The full `WeeklyPlan` wire body for the outbox — mirrors HttpStorageBackend.saveWeeklyPlan. */
function buildWeeklyPlanPayload(draft: WeeklyPlanDraft): WeeklyPlan {
  return {
    id: draft.id,
    weekStartDate: draft.weekStartDate,
    deleted: false,
    slots: draft.slots.map((slot) => ({
      id: slot.id,
      weeklyPlanId: draft.id,
      dayOfWeek: slot.dayOfWeek,
      planId: slot.planId,
      deleted: false,
    })),
  };
}

/** The full `WorkoutSession` wire body for the outbox — mirrors HttpStorageBackend.saveWorkoutSession. */
function buildWorkoutSessionPayload(draft: WorkoutSessionDraft): WorkoutSession {
  return {
    id: draft.id,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    durationMinutes: draft.durationMinutes,
    workoutType: draft.workoutType,
    title: draft.title,
    notes: draft.notes,
    location: draft.location,
    planId: draft.planId,
    roundsCount: draft.roundsCount,
    deleted: false,
    exercises: draft.exercises.map((exercise) => ({
      id: exercise.id,
      sessionId: draft.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      exerciseCategory: exercise.exerciseCategory,
      exerciseKind: exercise.exerciseKind,
      orderIndex: exercise.orderIndex,
      supersetGroup: exercise.supersetGroup,
      deleted: false,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        exerciseEntryId: exercise.id,
        setNumber: set.setNumber,
        setType: set.setType,
        reps: set.reps,
        weightKg: set.weightKg,
        holdTimeSeconds: set.holdTimeSeconds,
        edgeSizeMm: set.edgeSizeMm,
        distanceMeters: set.distanceMeters,
        restTimeSeconds: set.restTimeSeconds,
        isCompleted: set.isCompleted,
        orderIndex: set.orderIndex,
        deleted: false,
      })),
    })),
  };
}

/** Stitches flat session/attempt/pitch row lists back into one nested `ClimbingSession` tree (every row, live or tombstoned). */
function assembleClimbingSession(
  sessionRow: ClimbingSessionRow,
  attemptRows: AscentAttemptRow[],
  pitchRows: PitchLogRow[],
): ClimbingSession {
  const pitchesByAttempt = new Map<string, PitchLogRow[]>();
  for (const row of pitchRows) {
    const list = pitchesByAttempt.get(row.attempt_id) ?? [];
    list.push(row);
    pitchesByAttempt.set(row.attempt_id, list);
  }
  const attempts = attemptRows
    .filter((row) => row.session_id === sessionRow.id)
    .map((row) => ({
      ...ascentAttemptRowToDto(row),
      pitches: (pitchesByAttempt.get(row.id) ?? []).map(pitchLogRowToDto),
    }));
  return { ...climbingSessionRowToDto(sessionRow), attempts };
}

/** The full `ClimbingSession` wire body for the outbox — mirrors HttpStorageBackend.saveClimbingSession. */
function buildClimbingSessionPayload(draft: ClimbingSessionDraft): ClimbingSession {
  return {
    id: draft.id,
    date: draft.date,
    locationType: draft.locationType,
    discipline: draft.discipline,
    totalSessionDurationMinutes: draft.totalSessionDurationMinutes,
    pumpRating: draft.pumpRating,
    headspaceRating: draft.headspaceRating,
    notes: draft.notes,
    climbingPartners: draft.climbingPartners,
    weatherConditions: draft.weatherConditions,
    gymId: draft.gymId,
    gymName: draft.gymName,
    cragId: draft.cragId,
    cragName: draft.cragName,
    sectorId: draft.sectorId,
    sectorName: draft.sectorName,
    rockType: draft.rockType,
    aspect: draft.aspect,
    deleted: false,
    attempts: draft.attempts.map((attempt) => ({
      id: attempt.id,
      sessionId: draft.id,
      isSuccess: attempt.isSuccess,
      userRawInput: attempt.userRawInput,
      absoluteDifficultyIndex: attempt.absoluteDifficultyIndex,
      ascentStyle: attempt.ascentStyle,
      safetyStyle: attempt.safetyStyle,
      failurePoint: attempt.failurePoint,
      attemptCount: attempt.attemptCount,
      colorBandId: attempt.colorBandId,
      colorName: attempt.colorName,
      hexColor: attempt.hexColor,
      gradeRange: attempt.gradeRange,
      indoorRouteId: attempt.indoorRouteId,
      routeId: attempt.routeId,
      boulderProblemId: attempt.boulderProblemId,
      routeName: attempt.routeName,
      lengthInMeters: attempt.lengthInMeters,
      notes: attempt.notes,
      orderIndex: attempt.orderIndex,
      deleted: false,
      pitches: attempt.pitches.map((pitch) => ({
        id: pitch.id,
        attemptId: attempt.id,
        pitchNumber: pitch.pitchNumber,
        isLead: pitch.isLead,
        rawGrade: pitch.rawGrade,
        absoluteDifficultyIndex: pitch.absoluteDifficultyIndex,
        lengthInMeters: pitch.lengthInMeters,
        orderIndex: pitch.orderIndex,
        deleted: false,
      })),
    })),
  };
}

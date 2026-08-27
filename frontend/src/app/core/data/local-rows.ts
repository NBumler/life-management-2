import { SqlTask } from '../storage/local-database.service';
import { CalendarEvent } from '../../api/model/calendarEvent';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { Meal } from '../../api/model/meal';
import { MealItem } from '../../api/model/mealItem';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateItem } from '../../api/model/packingTemplateItem';
import { Recipe } from '../../api/model/recipe';
import { RecipeIngredient } from '../../api/model/recipeIngredient';
import { StoredFood } from '../../api/model/storedFood';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';

/**
 * Row <-> DTO mapping and SQL task builders for the two local tables this phase covers.
 * Shared by SqliteStorageBackend (local-first write path) and SyncEngine (drain-success write-back
 * + pull apply). Centralized here so both sides agree on column names and on the apply-rules from
 * documentation/Architektúra/Backend-offline first.md §8.
 */

export interface ProfileRow {
  id: string;
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal: string | null;
  kg_per_week: number | null;
  gross_monthly_salary_huf: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function profileRowToDto(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    birthDate: row.birth_date,
    sex: row.sex as UserProfile.SexEnum | null,
    heightCm: row.height_cm,
    currentWeightKg: row.current_weight_kg,
    goal: row.goal as UserProfile.GoalEnum | null,
    kgPerWeek: row.kg_per_week,
    grossMonthlySalaryHuf: row.gross_monthly_salary_huf,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/** Local-first edit: marks `_dirty = 1`; `_local_only` is set to 1 only on first insert, left untouched on update. */
export function profileLocalWriteTask(dto: UserProfile): SqlTask {
  return {
    statement: `
      INSERT INTO user_profile (id, birth_date, sex, height_cm, current_weight_kg, goal, kg_per_week, gross_monthly_salary_huf, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        birth_date = excluded.birth_date, sex = excluded.sex, height_cm = excluded.height_cm,
        current_weight_kg = excluded.current_weight_kg, goal = excluded.goal, kg_per_week = excluded.kg_per_week,
        gross_monthly_salary_huf = excluded.gross_monthly_salary_huf, _dirty = 1`,
    values: [
      dto.id,
      dto.birthDate ?? null,
      dto.sex ?? null,
      dto.heightCm ?? null,
      dto.currentWeightKg ?? null,
      dto.goal ?? null,
      dto.kgPerWeek ?? null,
      dto.grossMonthlySalaryHuf ?? null,
    ],
  };
}

/** Authoritative server row (drain success, or pull when not `_dirty`): full overwrite, clears dirty/local-only. */
export function profileServerApplyTask(dto: UserProfile): SqlTask {
  return {
    statement: `
      INSERT INTO user_profile (id, birth_date, sex, height_cm, current_weight_kg, goal, kg_per_week, gross_monthly_salary_huf, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        birth_date = excluded.birth_date, sex = excluded.sex, height_cm = excluded.height_cm,
        current_weight_kg = excluded.current_weight_kg, goal = excluded.goal, kg_per_week = excluded.kg_per_week,
        gross_monthly_salary_huf = excluded.gross_monthly_salary_huf, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = 0, deleted_at = NULL, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE user_profile._dirty = 0`,
    values: [
      dto.id,
      dto.birthDate ?? null,
      dto.sex ?? null,
      dto.heightCm ?? null,
      dto.currentWeightKg ?? null,
      dto.goal ?? null,
      dto.kgPerWeek ?? null,
      dto.grossMonthlySalaryHuf ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
    ],
  };
}

export interface WeightHistoryRow {
  id: string;
  recorded_at: string;
  weight_kg: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function weightHistoryRowToDto(row: WeightHistoryRow): WeightHistoryEntry {
  return {
    id: row.id,
    recordedAt: row.recorded_at,
    weightKg: row.weight_kg,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function weightHistoryLocalWriteTask(dto: WeightHistoryEntry): SqlTask {
  return {
    statement: `
      INSERT INTO weight_history_entry (id, recorded_at, weight_kg, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET recorded_at = excluded.recorded_at, weight_kg = excluded.weight_kg, _dirty = 1`,
    values: [dto.id, dto.recordedAt, dto.weightKg],
  };
}

export function weightHistoryServerApplyTask(dto: WeightHistoryEntry): SqlTask {
  return {
    statement: `
      INSERT INTO weight_history_entry (id, recorded_at, weight_kg, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        recorded_at = excluded.recorded_at, weight_kg = excluded.weight_kg, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE weight_history_entry._dirty = 0`,
    values: [dto.id, dto.recordedAt, dto.weightKg, dto.createdAt ?? null, dto.updatedAt ?? null, dto.deleted ? 1 : 0, dto.deletedAt ?? null],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function weightHistoryTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO weight_history_entry (id, recorded_at, weight_kg, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface GearItemRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function gearItemRowToDto(row: GearItemRow): GearItem {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function gearItemLocalWriteTask(dto: GearItem): SqlTask {
  return {
    statement: `
      INSERT INTO gear_item (id, name, notes, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes, _dirty = 1`,
    values: [dto.id, dto.name, dto.notes ?? null],
  };
}

export function gearItemServerApplyTask(dto: GearItem): SqlTask {
  return {
    statement: `
      INSERT INTO gear_item (id, name, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE gear_item._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function gearItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO gear_item (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingTemplateRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingTemplateRowToDto(row: PackingTemplateRow): PackingTemplate {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingTemplateLocalWriteTask(dto: { id: string; name: string; notes: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template (id, name, notes, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, notes = excluded.notes, _dirty = 1`,
    values: [dto.id, dto.name, dto.notes],
  };
}

export function packingTemplateServerApplyTask(dto: PackingTemplate): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template (id, name, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, notes = excluded.notes, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_template._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingTemplateTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingTemplateItemRow {
  id: string;
  template_id: string;
  gear_item_id: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingTemplateItemRowToDto(row: PackingTemplateItemRow): PackingTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    gearItemId: row.gear_item_id,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingTemplateItemLocalWriteTask(dto: { id: string; templateId: string; gearItemId: string; sortOrder: number }): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template_item (id, template_id, gear_item_id, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET gear_item_id = excluded.gear_item_id, sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.templateId, dto.gearItemId, dto.sortOrder],
  };
}

/** Local-only removal of an item dropped from a template during an edit (not a standalone outbox entry — see SqliteStorageBackend.savePackingTemplate). */
export function packingTemplateItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE packing_template_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function packingTemplateItemServerApplyTask(dto: PackingTemplateItem): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template_item (id, template_id, gear_item_id, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        template_id = excluded.template_id, gear_item_id = excluded.gear_item_id, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_template_item._dirty = 0`,
    values: [
      dto.id,
      dto.templateId,
      dto.gearItemId,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingTemplateItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_template_item (id, template_id, gear_item_id, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingSessionRow {
  id: string;
  destination: string | null;
  /** JSON-stringified string[] — SQLite has no native array column, unlike Postgres uuid[] server-side. */
  source_template_ids: string;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingSessionRowToDto(row: PackingSessionRow): PackingSession {
  return {
    id: row.id,
    destination: row.destination,
    sourceTemplateIds: JSON.parse(row.source_template_ids) as string[],
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingSessionLocalWriteTask(dto: { id: string; destination: string | null; sourceTemplateIds: string[] }): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session (id, destination, source_template_ids, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET destination = excluded.destination, source_template_ids = excluded.source_template_ids, _dirty = 1`,
    values: [dto.id, dto.destination, JSON.stringify(dto.sourceTemplateIds)],
  };
}

export function packingSessionServerApplyTask(dto: PackingSession): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session (id, destination, source_template_ids, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        destination = excluded.destination, source_template_ids = excluded.source_template_ids, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_session._dirty = 0`,
    values: [
      dto.id,
      dto.destination ?? null,
      JSON.stringify(dto.sourceTemplateIds ?? []),
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingSessionTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session (id, source_template_ids, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '[]', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface PackingSessionItemRow {
  id: string;
  session_id: string;
  gear_item_id: string;
  status: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function packingSessionItemRowToDto(row: PackingSessionItemRow): PackingSessionItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    gearItemId: row.gear_item_id,
    status: row.status as PackingSessionItem.StatusEnum,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function packingSessionItemLocalWriteTask(dto: {
  id: string;
  sessionId: string;
  gearItemId: string;
  status: string;
  sortOrder: number;
}): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session_item (id, session_id, gear_item_id, status, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.sessionId, dto.gearItemId, dto.status, dto.sortOrder],
  };
}

/** Local-only removal (GearItem cascade) — not a standalone outbox entry, matching packingTemplateItemLocalRemoveTask's reasoning. */
export function packingSessionItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE packing_session_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function packingSessionItemServerApplyTask(dto: PackingSessionItem): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session_item (id, session_id, gear_item_id, status, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id, gear_item_id = excluded.gear_item_id, status = excluded.status, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE packing_session_item._dirty = 0`,
    values: [
      dto.id,
      dto.sessionId,
      dto.gearItemId,
      dto.status,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function packingSessionItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO packing_session_item (id, session_id, gear_item_id, status, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 'NOT_PACKED', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface LifePlanRow {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  target_date: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function lifePlanRowToDto(row: LifePlanRow): LifePlan {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status as LifePlan.StatusEnum,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function lifePlanLocalWriteTask(dto: LifePlan): SqlTask {
  return {
    statement: `
      INSERT INTO life_plan (id, title, notes, status, target_date, completed_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, notes = excluded.notes, status = excluded.status,
        target_date = excluded.target_date, completed_at = excluded.completed_at, _dirty = 1`,
    values: [dto.id, dto.title, dto.notes ?? null, dto.status, dto.targetDate ?? null, dto.completedAt ?? null],
  };
}

export function lifePlanServerApplyTask(dto: LifePlan): SqlTask {
  return {
    statement: `
      INSERT INTO life_plan (id, title, notes, status, target_date, completed_at, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, notes = excluded.notes, status = excluded.status, target_date = excluded.target_date,
        completed_at = excluded.completed_at, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE life_plan._dirty = 0`,
    values: [
      dto.id,
      dto.title,
      dto.notes ?? null,
      dto.status,
      dto.targetDate ?? null,
      dto.completedAt ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function lifePlanTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO life_plan (id, title, status, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'PLANNED', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface HouseholdRoomRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function householdRoomRowToDto(row: HouseholdRoomRow): HouseholdRoom {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function householdRoomLocalWriteTask(dto: HouseholdRoom): SqlTask {
  return {
    statement: `
      INSERT INTO household_room (id, name, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order, _dirty = 1`,
    values: [dto.id, dto.name, dto.sortOrder],
  };
}

export function householdRoomServerApplyTask(dto: HouseholdRoom): SqlTask {
  return {
    statement: `
      INSERT INTO household_room (id, name, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, sort_order = excluded.sort_order, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE household_room._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function householdRoomTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO household_room (id, name, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface HouseholdTaskRow {
  id: string;
  room_id: string;
  name: string;
  energy_level: string;
  estimated_minutes: number;
  interval_days: number;
  next_due: string;
  last_completed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function householdTaskRowToDto(row: HouseholdTaskRow): HouseholdTask {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    energyLevel: row.energy_level as HouseholdTask.EnergyLevelEnum,
    estimatedMinutes: row.estimated_minutes,
    intervalDays: row.interval_days,
    nextDue: row.next_due,
    lastCompletedAt: row.last_completed_at,
    notes: row.notes,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function householdTaskLocalWriteTask(dto: HouseholdTask): SqlTask {
  return {
    statement: `
      INSERT INTO household_task (id, room_id, name, energy_level, estimated_minutes, interval_days, next_due, last_completed_at, notes, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        room_id = excluded.room_id, name = excluded.name, energy_level = excluded.energy_level,
        estimated_minutes = excluded.estimated_minutes, interval_days = excluded.interval_days,
        next_due = excluded.next_due, last_completed_at = excluded.last_completed_at, notes = excluded.notes, _dirty = 1`,
    values: [
      dto.id,
      dto.roomId,
      dto.name,
      dto.energyLevel,
      dto.estimatedMinutes,
      dto.intervalDays,
      dto.nextDue,
      dto.lastCompletedAt ?? null,
      dto.notes ?? null,
    ],
  };
}

/** Local-only removal of a task cascaded from its room being deleted (not a standalone outbox entry — see SqliteStorageBackend.deleteHouseholdRoom). */
export function householdTaskLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE household_task SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function householdTaskServerApplyTask(dto: HouseholdTask): SqlTask {
  return {
    statement: `
      INSERT INTO household_task (id, room_id, name, energy_level, estimated_minutes, interval_days, next_due, last_completed_at, notes, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        room_id = excluded.room_id, name = excluded.name, energy_level = excluded.energy_level,
        estimated_minutes = excluded.estimated_minutes, interval_days = excluded.interval_days, next_due = excluded.next_due,
        last_completed_at = excluded.last_completed_at, notes = excluded.notes, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE household_task._dirty = 0`,
    values: [
      dto.id,
      dto.roomId,
      dto.name,
      dto.energyLevel,
      dto.estimatedMinutes,
      dto.intervalDays,
      dto.nextDue,
      dto.lastCompletedAt ?? null,
      dto.notes ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function householdTaskTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO household_task (id, room_id, name, energy_level, estimated_minutes, interval_days, next_due, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 'LOW', 0, 1, '1970-01-01', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface CalendarEventRow {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  all_day: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  frequency: string | null;
  interval: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function calendarEventRowToDto(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    notes: row.notes,
    allDay: row.all_day === 1,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    frequency: row.frequency as CalendarEvent.FrequencyEnum | null,
    interval: row.interval,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function calendarEventLocalWriteTask(dto: CalendarEvent): SqlTask {
  return {
    statement: `
      INSERT INTO calendar_event (id, title, location, notes, all_day, date, start_time, end_time, frequency, interval, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, location = excluded.location, notes = excluded.notes, all_day = excluded.all_day,
        date = excluded.date, start_time = excluded.start_time, end_time = excluded.end_time,
        frequency = excluded.frequency, interval = excluded.interval, _dirty = 1`,
    values: [
      dto.id,
      dto.title,
      dto.location ?? null,
      dto.notes ?? null,
      dto.allDay ? 1 : 0,
      dto.date,
      dto.startTime ?? null,
      dto.endTime ?? null,
      dto.frequency ?? null,
      dto.interval,
    ],
  };
}

export function calendarEventServerApplyTask(dto: CalendarEvent): SqlTask {
  return {
    statement: `
      INSERT INTO calendar_event (id, title, location, notes, all_day, date, start_time, end_time, frequency, interval, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, location = excluded.location, notes = excluded.notes, all_day = excluded.all_day,
        date = excluded.date, start_time = excluded.start_time, end_time = excluded.end_time, frequency = excluded.frequency,
        interval = excluded.interval, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE calendar_event._dirty = 0`,
    values: [
      dto.id,
      dto.title,
      dto.location ?? null,
      dto.notes ?? null,
      dto.allDay ? 1 : 0,
      dto.date,
      dto.startTime ?? null,
      dto.endTime ?? null,
      dto.frequency ?? null,
      dto.interval,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function calendarEventTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO calendar_event (id, title, all_day, date, interval, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 1, '1970-01-01', 1, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface FoodRow {
  id: string;
  name: string;
  store: string | null;
  brand: string | null;
  barcode: string | null;
  note: string | null;
  price_huf: number | null;
  net_amount: number | null;
  net_unit: string | null;
  energy_kcal: number | null;
  fat_g: number | null;
  fat_saturated_g: number | null;
  fat_unsaturated_g: number | null;
  fat_trans_g: number | null;
  carbs_g: number | null;
  carbs_sugars_g: number | null;
  carbs_complex_g: number | null;
  carbs_fiber_g: number | null;
  protein_g: number | null;
  salt_g: number | null;
  sodium_g: number | null;
  chloride_g: number | null;
  shelf_room_amount: number | null;
  shelf_room_unit: string | null;
  shelf_fridge_amount: number | null;
  shelf_fridge_unit: string | null;
  shelf_freezer_amount: number | null;
  shelf_freezer_unit: string | null;
  shelf_after_opening_amount: number | null;
  shelf_after_opening_unit: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function foodRowToDto(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    store: row.store,
    brand: row.brand,
    barcode: row.barcode,
    note: row.note,
    priceHuf: row.price_huf,
    netAmount: row.net_amount,
    netUnit: row.net_unit,
    energyKcal: row.energy_kcal,
    fatG: row.fat_g,
    fatSaturatedG: row.fat_saturated_g,
    fatUnsaturatedG: row.fat_unsaturated_g,
    fatTransG: row.fat_trans_g,
    carbsG: row.carbs_g,
    carbsSugarsG: row.carbs_sugars_g,
    carbsComplexG: row.carbs_complex_g,
    carbsFiberG: row.carbs_fiber_g,
    proteinG: row.protein_g,
    saltG: row.salt_g,
    sodiumG: row.sodium_g,
    chlorideG: row.chloride_g,
    shelfRoomAmount: row.shelf_room_amount,
    shelfRoomUnit: row.shelf_room_unit,
    shelfFridgeAmount: row.shelf_fridge_amount,
    shelfFridgeUnit: row.shelf_fridge_unit,
    shelfFreezerAmount: row.shelf_freezer_amount,
    shelfFreezerUnit: row.shelf_freezer_unit,
    shelfAfterOpeningAmount: row.shelf_after_opening_amount,
    shelfAfterOpeningUnit: row.shelf_after_opening_unit,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

const FOOD_COLUMNS = [
  'name',
  'store',
  'brand',
  'barcode',
  'note',
  'price_huf',
  'net_amount',
  'net_unit',
  'energy_kcal',
  'fat_g',
  'fat_saturated_g',
  'fat_unsaturated_g',
  'fat_trans_g',
  'carbs_g',
  'carbs_sugars_g',
  'carbs_complex_g',
  'carbs_fiber_g',
  'protein_g',
  'salt_g',
  'sodium_g',
  'chloride_g',
  'shelf_room_amount',
  'shelf_room_unit',
  'shelf_fridge_amount',
  'shelf_fridge_unit',
  'shelf_freezer_amount',
  'shelf_freezer_unit',
  'shelf_after_opening_amount',
  'shelf_after_opening_unit',
] as const;

function foodValues(dto: Food): unknown[] {
  return [
    dto.name,
    dto.store ?? null,
    dto.brand ?? null,
    dto.barcode ?? null,
    dto.note ?? null,
    dto.priceHuf ?? null,
    dto.netAmount ?? null,
    dto.netUnit ?? null,
    dto.energyKcal ?? null,
    dto.fatG ?? null,
    dto.fatSaturatedG ?? null,
    dto.fatUnsaturatedG ?? null,
    dto.fatTransG ?? null,
    dto.carbsG ?? null,
    dto.carbsSugarsG ?? null,
    dto.carbsComplexG ?? null,
    dto.carbsFiberG ?? null,
    dto.proteinG ?? null,
    dto.saltG ?? null,
    dto.sodiumG ?? null,
    dto.chlorideG ?? null,
    dto.shelfRoomAmount ?? null,
    dto.shelfRoomUnit ?? null,
    dto.shelfFridgeAmount ?? null,
    dto.shelfFridgeUnit ?? null,
    dto.shelfFreezerAmount ?? null,
    dto.shelfFreezerUnit ?? null,
    dto.shelfAfterOpeningAmount ?? null,
    dto.shelfAfterOpeningUnit ?? null,
  ];
}

export function foodLocalWriteTask(dto: Food): SqlTask {
  const assignments = FOOD_COLUMNS.map((column) => `${column} = excluded.${column}`).join(', ');
  return {
    statement: `
      INSERT INTO food (id, ${FOOD_COLUMNS.join(', ')}, _dirty, _local_only)
      VALUES (?, ${FOOD_COLUMNS.map(() => '?').join(', ')}, 1, 1)
      ON CONFLICT(id) DO UPDATE SET ${assignments}, _dirty = 1`,
    values: [dto.id, ...foodValues(dto)],
  };
}

export function foodServerApplyTask(dto: Food): SqlTask {
  const assignments = FOOD_COLUMNS.map((column) => `${column} = excluded.${column}`).join(', ');
  return {
    statement: `
      INSERT INTO food (id, ${FOOD_COLUMNS.join(', ')}, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ${FOOD_COLUMNS.map(() => '?').join(', ')}, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        ${assignments}, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE food._dirty = 0`,
    values: [
      dto.id,
      ...foodValues(dto),
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function foodTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO food (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface StoredFoodRow {
  id: string;
  food_id: string;
  quantity_amount: number;
  quantity_unit: string;
  storage_location: string;
  expires_on: string;
  opened: number;
  opened_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function storedFoodRowToDto(row: StoredFoodRow): StoredFood {
  return {
    id: row.id,
    foodId: row.food_id,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    storageLocation: row.storage_location as StoredFood.StorageLocationEnum,
    expiresOn: row.expires_on,
    opened: row.opened === 1,
    openedAt: row.opened_at,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function storedFoodLocalWriteTask(dto: StoredFood): SqlTask {
  return {
    statement: `
      INSERT INTO stored_food (id, food_id, quantity_amount, quantity_unit, storage_location, expires_on, opened, opened_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        storage_location = excluded.storage_location, expires_on = excluded.expires_on, opened = excluded.opened,
        opened_at = excluded.opened_at, _dirty = 1`,
    values: [
      dto.id,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.storageLocation,
      dto.expiresOn,
      dto.opened ? 1 : 0,
      dto.openedAt ?? null,
    ],
  };
}

export function storedFoodServerApplyTask(dto: StoredFood): SqlTask {
  return {
    statement: `
      INSERT INTO stored_food (id, food_id, quantity_amount, quantity_unit, storage_location, expires_on, opened, opened_at, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        storage_location = excluded.storage_location, expires_on = excluded.expires_on, opened = excluded.opened,
        opened_at = excluded.opened_at, created_at = excluded.created_at, updated_at = excluded.updated_at,
        deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE stored_food._dirty = 0`,
    values: [
      dto.id,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.storageLocation,
      dto.expiresOn,
      dto.opened ? 1 : 0,
      dto.openedAt ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function storedFoodTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO stored_food (id, food_id, quantity_amount, quantity_unit, storage_location, expires_on, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 0, '', 'ROOM', '1970-01-01', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

/** Local-only removal of a storage item cascaded from its Food catalog entry being deleted (not a standalone outbox entry — see SqliteStorageBackend.deleteFood). */
export function storedFoodLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE stored_food SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export interface RecipeRow {
  id: string;
  name: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `ingredients` — a Recipe row alone never carries them, see readRecipe in SqliteStorageBackend. */
export function recipeRowToDto(row: RecipeRow): Omit<Recipe, 'ingredients'> {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function recipeLocalWriteTask(dto: { id: string; name: string; note: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO recipe (id, name, note, _dirty, _local_only)
      VALUES (?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, note = excluded.note, _dirty = 1`,
    values: [dto.id, dto.name, dto.note],
  };
}

export function recipeServerApplyTask(dto: Omit<Recipe, 'ingredients'>): SqlTask {
  return {
    statement: `
      INSERT INTO recipe (id, name, note, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, note = excluded.note, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE recipe._dirty = 0`,
    values: [
      dto.id,
      dto.name,
      dto.note ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function recipeTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO recipe (id, name, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  food_id: string;
  quantity_amount: number;
  quantity_unit: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function recipeIngredientRowToDto(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    foodId: row.food_id,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function recipeIngredientLocalWriteTask(dto: { id: string; recipeId: string; foodId: string; quantityAmount: number; quantityUnit: string; sortOrder: number }): SqlTask {
  return {
    statement: `
      INSERT INTO recipe_ingredient (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        sort_order = excluded.sort_order, deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [dto.id, dto.recipeId, dto.foodId, dto.quantityAmount, dto.quantityUnit, dto.sortOrder],
  };
}

/** Local-only removal — an ingredient dropped from a recipe during an edit, or cascaded from its Food catalog entry being deleted (not a standalone outbox entry — see SqliteStorageBackend.saveRecipe/deleteFood). */
export function recipeIngredientLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE recipe_ingredient SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function recipeIngredientServerApplyTask(dto: RecipeIngredient): SqlTask {
  return {
    statement: `
      INSERT INTO recipe_ingredient (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        recipe_id = excluded.recipe_id, food_id = excluded.food_id, quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit,
        sort_order = excluded.sort_order, created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted,
        deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE recipe_ingredient._dirty = 0`,
    values: [
      dto.id,
      dto.recipeId,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function recipeIngredientTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO recipe_ingredient (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', '', 0, '', 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

/** §8: no local row + tombstone from server → still recorded, so the row can never "come back". */
export function profileTombstoneTask(id: string, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO user_profile (id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, updatedAt],
  };
}

export interface MealRow {
  id: string;
  eaten_at: string;
  time_zone_id: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

/** Omits `items` — a Meal row alone never carries them, see readMeal in SqliteStorageBackend. */
export function mealRowToDto(row: MealRow): Omit<Meal, 'items'> {
  return {
    id: row.id,
    eatenAt: row.eaten_at,
    timeZoneId: row.time_zone_id,
    note: row.note,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mealLocalWriteTask(dto: { id: string; eatenAt: string; timeZoneId: string; note: string | null }): SqlTask {
  return {
    statement: `
      INSERT INTO meal (id, eaten_at, time_zone_id, note, _dirty, _local_only)
      VALUES (?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET eaten_at = excluded.eaten_at, time_zone_id = excluded.time_zone_id, note = excluded.note, _dirty = 1`,
    values: [dto.id, dto.eatenAt, dto.timeZoneId, dto.note],
  };
}

export function mealServerApplyTask(dto: Omit<Meal, 'items'>): SqlTask {
  return {
    statement: `
      INSERT INTO meal (id, eaten_at, time_zone_id, note, created_at, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        eaten_at = excluded.eaten_at, time_zone_id = excluded.time_zone_id, note = excluded.note, created_at = excluded.created_at,
        updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE meal._dirty = 0`,
    values: [
      dto.id,
      dto.eatenAt,
      dto.timeZoneId,
      dto.note ?? null,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function mealTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO meal (id, eaten_at, time_zone_id, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '1970-01-01T00:00:00.000Z', 'UTC', ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

export interface MealItemRow {
  id: string;
  meal_id: string;
  type: string;
  recipe_id: string | null;
  food_id: string | null;
  quantity_amount: number | null;
  quantity_unit: string | null;
  display_name: string | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  price_huf: number | null;
  servings: number;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  deleted: number;
  deleted_at: string | null;
  _dirty: number;
  _local_only: number;
  _sync_error: number;
  _needs_refetch: number;
}

export function mealItemRowToDto(row: MealItemRow): MealItem {
  return {
    id: row.id,
    mealId: row.meal_id,
    type: row.type as MealItem.TypeEnum,
    recipeId: row.recipe_id,
    foodId: row.food_id,
    quantityAmount: row.quantity_amount,
    quantityUnit: row.quantity_unit,
    displayName: row.display_name,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    priceHuf: row.price_huf,
    servings: row.servings,
    sortOrder: row.sort_order,
    deleted: row.deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mealItemLocalWriteTask(dto: {
  id: string;
  mealId: string;
  type: string;
  recipeId: string | null;
  foodId: string | null;
  quantityAmount: number | null;
  quantityUnit: string | null;
  displayName: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  priceHuf: number | null;
  servings: number;
  sortOrder: number;
}): SqlTask {
  return {
    statement: `
      INSERT INTO meal_item (
        id, meal_id, type, recipe_id, food_id, quantity_amount, quantity_unit, display_name,
        calories_kcal, protein_g, carbs_g, fat_g, price_huf, servings, sort_order, _dirty, _local_only
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type, recipe_id = excluded.recipe_id, food_id = excluded.food_id,
        quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit, display_name = excluded.display_name,
        calories_kcal = excluded.calories_kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g,
        price_huf = excluded.price_huf, servings = excluded.servings, sort_order = excluded.sort_order,
        deleted = 0, deleted_at = NULL, _dirty = 1`,
    values: [
      dto.id,
      dto.mealId,
      dto.type,
      dto.recipeId,
      dto.foodId,
      dto.quantityAmount,
      dto.quantityUnit,
      dto.displayName,
      dto.caloriesKcal,
      dto.proteinG,
      dto.carbsG,
      dto.fatG,
      dto.priceHuf,
      dto.servings,
      dto.sortOrder,
    ],
  };
}

/** Local-only removal — an item dropped from a meal during an edit, or cascaded from its Food/Recipe reference being deleted (not a standalone outbox entry — see SqliteStorageBackend.saveMeal/deleteFood/deleteRecipe). */
export function mealItemLocalRemoveTask(id: string): SqlTask {
  return {
    statement: `UPDATE meal_item SET deleted = 1, deleted_at = ?, _dirty = 1 WHERE id = ?`,
    values: [new Date().toISOString(), id],
  };
}

export function mealItemServerApplyTask(dto: MealItem): SqlTask {
  return {
    statement: `
      INSERT INTO meal_item (
        id, meal_id, type, recipe_id, food_id, quantity_amount, quantity_unit, display_name,
        calories_kcal, protein_g, carbs_g, fat_g, price_huf, servings, sort_order,
        created_at, updated_at, deleted, deleted_at, _dirty, _local_only
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET
        meal_id = excluded.meal_id, type = excluded.type, recipe_id = excluded.recipe_id, food_id = excluded.food_id,
        quantity_amount = excluded.quantity_amount, quantity_unit = excluded.quantity_unit, display_name = excluded.display_name,
        calories_kcal = excluded.calories_kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g,
        price_huf = excluded.price_huf, servings = excluded.servings, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at, deleted = excluded.deleted, deleted_at = excluded.deleted_at,
        _dirty = 0, _local_only = 0, _needs_refetch = 0
      WHERE meal_item._dirty = 0`,
    values: [
      dto.id,
      dto.mealId,
      dto.type,
      dto.recipeId ?? null,
      dto.foodId ?? null,
      dto.quantityAmount ?? null,
      dto.quantityUnit ?? null,
      dto.displayName ?? null,
      dto.caloriesKcal ?? null,
      dto.proteinG ?? null,
      dto.carbsG ?? null,
      dto.fatG ?? null,
      dto.priceHuf ?? null,
      dto.servings,
      dto.sortOrder,
      dto.createdAt ?? null,
      dto.updatedAt ?? null,
      dto.deleted ? 1 : 0,
      dto.deletedAt ?? null,
    ],
  };
}

/** §8 "A tombstone győz": applies unconditionally, even over a `_dirty` row — no resurrect. */
export function mealItemTombstoneTask(id: string, deletedAt: string | null, updatedAt: string): SqlTask {
  return {
    statement: `
      INSERT INTO meal_item (id, meal_id, type, servings, sort_order, updated_at, deleted, deleted_at, _dirty, _local_only)
      VALUES (?, '', 'CUSTOM', 0, 0, ?, 1, ?, 0, 0)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, deleted = 1, deleted_at = excluded.deleted_at, _dirty = 0, _local_only = 0`,
    values: [id, updatedAt, deletedAt],
  };
}

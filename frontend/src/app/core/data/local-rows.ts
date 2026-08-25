import { SqlTask } from '../storage/local-database.service';
import { CalendarEvent } from '../../api/model/calendarEvent';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateItem } from '../../api/model/packingTemplateItem';
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

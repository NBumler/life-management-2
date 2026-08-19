import { SqlTask } from '../storage/local-database.service';
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

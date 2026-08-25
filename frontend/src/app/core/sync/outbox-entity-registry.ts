import { Injectable, inject } from '@angular/core';

import { GearItem } from '../../api/model/gearItem';
import { LifePlan } from '../../api/model/lifePlan';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { normalizeName } from '../../shared/name-normalization';
import { GearItemRepository } from '../data/gear-item.repository';
import {
  GearItemRow,
  LifePlanRow,
  PackingSessionItemRow,
  PackingSessionRow,
  ProfileRow,
  WeightHistoryRow,
  gearItemLocalWriteTask,
  gearItemRowToDto,
  lifePlanLocalWriteTask,
  lifePlanRowToDto,
  packingSessionItemLocalWriteTask,
  packingSessionItemRowToDto,
  packingSessionLocalWriteTask,
  packingSessionRowToDto,
  profileLocalWriteTask,
  profileRowToDto,
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
} from '../data/local-rows';
import { LocalDatabaseService, SqlTask } from '../storage/local-database.service';
import { StorageBackend } from '../storage/storage-backend';
import { OutboxEntityType, OutboxMethod } from './outbox-item';

export type { OutboxEntityType };

export interface OutboxEntityFixContext {
  db: LocalDatabaseService;
  storage: StorageBackend;
  targetEntityId: string;
  method: OutboxMethod;
}

export interface OutboxEntityNameUniqueness {
  /** Payload field name the Fix form should live-check, e.g. `'name'`. */
  field: string;
  /** documentation/Architektúra/Névegyediség.md: same collision rule as the regular editor — returns the conflicting id, or null. */
  findConflict(value: string, excludeId: string): Promise<string | null>;
}

export interface OutboxEntityDescriptor {
  /** SQLite table backing this entity — used for the Drop restore-to-server-state / hard-remove task. */
  table: string;
  /**
   * Re-derives the outbox payload's DTO shape from the entity's *current* local state (not the
   * payload captured when the item was created) — Unskip needs this (§6 "Unskip"), Fix does not
   * (Fix edits `item.payload` itself, the value about to be resent).
   */
  currentPayload(ctx: OutboxEntityFixContext): Promise<unknown>;
  /**
   * documentation/Features/Szinkronizációs központ.md "Fix szerkesztő": null for every nested-aggregate
   * entity saved as one body (Backend-offline first §11: Edzésnapló, Mászónapló, Recept, Sablonok /
   * `PackingTemplate`) — Fix is unavailable for those, only Skip/Drop/payload-view. Non-null entities
   * whose payload still nests an array/object field (e.g. `PackingSession`'s `items` on create) rely
   * on the Fix form itself filtering those fields out; this flag is entity-level, not field-level.
   */
  buildFixWriteTask: ((payload: Record<string, unknown>) => SqlTask) | null;
  /** Live-uniqueness check for the Fix form's name-like field, or null when this entity has none. */
  nameUniqueness: OutboxEntityNameUniqueness | null;
}

function rowLookup<Row, Dto>(table: string, rowToDto: (row: Row) => Dto): (ctx: OutboxEntityFixContext) => Promise<unknown> {
  return async ({ db, targetEntityId }) => {
    const rows = await db.query<Row>(`SELECT * FROM ${table} WHERE id = ?`, [targetEntityId]);
    return rows[0] ? rowToDto(rows[0]) : null;
  };
}

/**
 * documentation/Subfeatures/Pakolás.md "Indítás": unlike the other flat entities, `PackingSession`'s
 * create (`POST`) body is a nested `PackingSessionDetail` (session + initial items); its update
 * (`PUT`, destination-only) is the plain flat `PackingSession`. The flat row alone can't reconstruct
 * the create shape, so Unskip on a still-pending create goes through the same detail read the rest of
 * the app uses (`StorageBackend.getPackingSessionDetail`) instead of a bare row lookup.
 */
async function packingSessionCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  if (ctx.method === 'POST') {
    return ctx.storage.getPackingSessionDetail(ctx.targetEntityId);
  }
  const rows = await ctx.db.query<PackingSessionRow>('SELECT * FROM packing_session WHERE id = ?', [ctx.targetEntityId]);
  return rows[0] ? packingSessionRowToDto(rows[0]) : null;
}

/** documentation/Subfeatures/Sablonok.md: template + items are always saved together, POST and PUT alike. */
async function packingTemplateCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getPackingTemplateDetail(ctx.targetEntityId);
}

/**
 * documentation/Features/Szinkronizációs központ.md — SSOT the sync center reads to know, per outbox
 * entity type, which table backs it, whether Fix is available, and whether its Fix form has a
 * uniqueness-checked field. Kept as an injectable service (not a plain object) only because the
 * `GearItem` uniqueness check needs `GearItemRepository`'s already-loaded live list, matching
 * `GearItemRepository.save()`'s own pre-check (documentation/Architektúra/Névegyediség.md).
 */
@Injectable({ providedIn: 'root' })
export class OutboxEntityRegistryService {
  private readonly gearItems = inject(GearItemRepository);

  private readonly registry: Record<OutboxEntityType, OutboxEntityDescriptor> = {
    UserProfile: {
      table: 'user_profile',
      currentPayload: rowLookup<ProfileRow, unknown>('user_profile', profileRowToDto),
      buildFixWriteTask: (payload) => profileLocalWriteTask(payload as unknown as UserProfile),
      nameUniqueness: null,
    },
    WeightHistoryEntry: {
      table: 'weight_history_entry',
      currentPayload: rowLookup<WeightHistoryRow, unknown>('weight_history_entry', weightHistoryRowToDto),
      buildFixWriteTask: (payload) => weightHistoryLocalWriteTask(payload as unknown as WeightHistoryEntry),
      nameUniqueness: null,
    },
    GearItem: {
      table: 'gear_item',
      currentPayload: rowLookup<GearItemRow, unknown>('gear_item', gearItemRowToDto),
      buildFixWriteTask: (payload) => gearItemLocalWriteTask(payload as unknown as GearItem),
      nameUniqueness: {
        field: 'name',
        findConflict: async (value, excludeId) => {
          if (!this.gearItems.loaded()) {
            await this.gearItems.load();
          }
          const normalized = normalizeName(value);
          return this.gearItems.items().find((item) => item.id !== excludeId && normalizeName(item.name) === normalized)?.id ?? null;
        },
      },
    },
    PackingTemplate: {
      table: 'packing_template',
      currentPayload: packingTemplateCurrentPayload,
      // Nested aggregate (template + items, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      nameUniqueness: null,
    },
    PackingSession: {
      table: 'packing_session',
      currentPayload: packingSessionCurrentPayload,
      buildFixWriteTask: (payload) => packingSessionLocalWriteTask(payload as unknown as { id: string; destination: string | null; sourceTemplateIds: string[] }),
      nameUniqueness: null,
    },
    PackingSessionItem: {
      table: 'packing_session_item',
      currentPayload: rowLookup<PackingSessionItemRow, unknown>('packing_session_item', packingSessionItemRowToDto),
      buildFixWriteTask: (payload) => packingSessionItemLocalWriteTask(payload as unknown as PackingSessionItem),
      nameUniqueness: null,
    },
    LifePlan: {
      table: 'life_plan',
      currentPayload: rowLookup<LifePlanRow, unknown>('life_plan', lifePlanRowToDto),
      buildFixWriteTask: (payload) => lifePlanLocalWriteTask(payload as unknown as LifePlan),
      // documentation/Architektúra/Névegyediség.md: LifePlan.title is explicitly not unique.
      nameUniqueness: null,
    },
  };

  /**
   * `entityType` comes from `OutboxItem.entityType`, which is `string` (see outbox-item.ts) — only
   * this app version's own repositories ever enqueue new items, all through the strictly-typed
   * `EnqueueRequest.entityType: OutboxEntityType`, so any row this method is asked about is one of
   * the registered keys in practice; the cast documents that trust boundary in one place.
   */
  get(entityType: string): OutboxEntityDescriptor {
    return this.registry[entityType as OutboxEntityType];
  }
}

/** Convenience for callers that only need the drop-restore task and not the full descriptor. */
export function buildOutboxDropTask(descriptor: OutboxEntityDescriptor, method: OutboxMethod, targetEntityId: string): SqlTask {
  if (method === 'POST') {
    return { statement: `DELETE FROM ${descriptor.table} WHERE id = ?`, values: [targetEntityId] };
  }
  return { statement: `UPDATE ${descriptor.table} SET _needs_refetch = 1, _dirty = 0 WHERE id = ?`, values: [targetEntityId] };
}

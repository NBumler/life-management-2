import { Injectable, inject } from '@angular/core';

import { CalendarEvent } from '../../api/model/calendarEvent';
import { Exercise } from '../../api/model/exercise';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { StoredFood } from '../../api/model/storedFood';
import { SwimLog } from '../../api/model/swimLog';
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { RecurringExpense } from '../../api/model/recurringExpense';
import { AycmPartner } from '../../api/model/aycmPartner';
import { AycmPriceRule } from '../../api/model/aycmPriceRule';
import { Gym } from '../../api/model/gym';
import { GymColorBand } from '../../api/model/gymColorBand';
import { IndoorRoute } from '../../api/model/indoorRoute';
import { Crag } from '../../api/model/crag';
import { Sector } from '../../api/model/sector';
import { Route } from '../../api/model/route';
import { BoulderProblem } from '../../api/model/boulderProblem';
import { UserProfile } from '../../api/model/userProfile';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { normalizeName } from '../../shared/name-normalization';
import { ExerciseRepository } from '../data/exercise.repository';
import { GearItemRepository } from '../data/gear-item.repository';
import { GymRepository } from '../data/gym.repository';
import { AycmPartnerRepository } from '../data/aycm-partner.repository';
import { HouseholdRoomRepository } from '../data/household-room.repository';
import {
  CalendarEventRow,
  ExerciseRow,
  FoodRow,
  GearItemRow,
  HouseholdRoomRow,
  HouseholdTaskRow,
  LifePlanRow,
  PackingSessionItemRow,
  PackingSessionRow,
  ProfileRow,
  StoredFoodRow,
  SwimLogRow,
  BikeRideLogRow,
  RecurringExpenseRow,
  AycmPartnerRow,
  AycmPriceRuleRow,
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
  householdTaskLocalWriteTask,
  householdTaskRowToDto,
  lifePlanLocalWriteTask,
  lifePlanRowToDto,
  packingSessionItemLocalWriteTask,
  packingSessionItemRowToDto,
  packingSessionLocalWriteTask,
  packingSessionRowToDto,
  profileLocalWriteTask,
  profileRowToDto,
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
  weightHistoryLocalWriteTask,
  weightHistoryRowToDto,
} from '../data/local-rows';
// ClimbingSession is a nested aggregate (session + attempts + pitches, one body) — like Recipe /
// WorkoutSession it is excluded from Fix and its current payload is read through the storage backend.
import { LocalDatabaseService, SqlTask } from '../storage/local-database.service';
import { StorageBackend } from '../storage/storage-backend';
import { OutboxEntityType, OutboxItem, OutboxMethod } from './outbox-item';

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
  /**
   * documentation/Features/Szinkronizációs központ.md "Unskip": true for an action endpoint whose
   * body can't be reconstructed from local rows (ShoppingList's `/complete` — the wizard-resolved
   * storage locations/expiry/split ids only exist in the captured payload). Unskip then re-sends the
   * payload as captured instead of re-deriving it. The list is ARCHIVED and can't be edited further,
   * so the captured payload is still the correct one.
   */
  keepPayloadOnUnskip?: boolean;
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

/** documentation/Subfeatures/Recept.md: recipe + ingredients are always saved together, POST and PUT alike. */
async function recipeCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getRecipe(ctx.targetEntityId);
}

/** documentation/Subfeatures/Étkezés.md: meal + items are always saved together, POST and PUT alike. */
async function mealCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getMeal(ctx.targetEntityId);
}

/** documentation/Subfeatures/Edzésnapló.md: session + exercises + sets are always saved together, POST and PUT alike. */
async function workoutSessionCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getWorkoutSession(ctx.targetEntityId);
}

/** documentation/Subfeatures/Heti terv.md: plan + exercises + target sets are always saved together, POST and PUT alike. */
async function workoutPlanCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getWorkoutPlan(ctx.targetEntityId);
}

/** documentation/Features/Mászónapló.md: session + attempts + pitches are always saved together, POST and PUT alike. */
async function climbingSessionCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getClimbingSession(ctx.targetEntityId);
}

/** documentation/Subfeatures/Heti terv.md: week + slots are always saved together, POST and PUT alike. */
async function weeklyPlanCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getWeeklyPlan(ctx.targetEntityId);
}

/** documentation/Subfeatures/Bevásárlólista írás.md: list + items are always saved together, POST and PUT alike. */
async function shoppingListCurrentPayload(ctx: OutboxEntityFixContext): Promise<unknown> {
  return ctx.storage.getShoppingList(ctx.targetEntityId);
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
  private readonly exercises = inject(ExerciseRepository);
  private readonly gyms = inject(GymRepository);
  private readonly aycmPartners = inject(AycmPartnerRepository);
  private readonly householdRooms = inject(HouseholdRoomRepository);

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
    Exercise: {
      table: 'exercise_catalog',
      currentPayload: rowLookup<ExerciseRow, unknown>('exercise_catalog', exerciseRowToDto),
      buildFixWriteTask: (payload) => exerciseLocalWriteTask(payload as unknown as Exercise),
      nameUniqueness: {
        field: 'name',
        findConflict: async (value, excludeId) => {
          if (!this.exercises.loaded()) {
            await this.exercises.load();
          }
          const normalized = normalizeName(value);
          return this.exercises.items().find((item) => item.id !== excludeId && normalizeName(item.name) === normalized)?.id ?? null;
        },
      },
    },
    HouseholdRoom: {
      table: 'household_room',
      currentPayload: rowLookup<HouseholdRoomRow, unknown>('household_room', householdRoomRowToDto),
      buildFixWriteTask: (payload) => householdRoomLocalWriteTask(payload as unknown as HouseholdRoom),
      nameUniqueness: {
        field: 'name',
        findConflict: async (value, excludeId) => {
          if (!this.householdRooms.loaded()) {
            await this.householdRooms.load();
          }
          const normalized = normalizeName(value);
          return this.householdRooms.items().find((room) => room.id !== excludeId && normalizeName(room.name) === normalized)?.id ?? null;
        },
      },
    },
    HouseholdTask: {
      table: 'household_task',
      currentPayload: rowLookup<HouseholdTaskRow, unknown>('household_task', householdTaskRowToDto),
      buildFixWriteTask: (payload) => householdTaskLocalWriteTask(payload as unknown as HouseholdTask),
      // documentation/Architektúra/Névegyediség.md: scope is the room, not the user — the Fix form
      // can't resolve that scope from (value, excludeId) alone, so this mirrors PackingTemplate's
      // "no live pre-check in Fix" precedent; the server's 409 UNIQUE_VIOLATION still guards it.
      nameUniqueness: null,
    },
    CalendarEvent: {
      table: 'calendar_event',
      currentPayload: rowLookup<CalendarEventRow, unknown>('calendar_event', calendarEventRowToDto),
      buildFixWriteTask: (payload) => calendarEventLocalWriteTask(payload as unknown as CalendarEvent),
      // documentation/Architektúra/Névegyediség.md: CalendarEvent.title is explicitly not unique.
      nameUniqueness: null,
    },
    Food: {
      table: 'food',
      currentPayload: rowLookup<FoodRow, unknown>('food', foodRowToDto),
      buildFixWriteTask: (payload) => foodLocalWriteTask(payload as unknown as Food),
      // documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség": duplicate-ness depends on
      // every field at once, not one value — can't be expressed as (value, excludeId), same reasoning
      // as PackingTemplate/HouseholdTask above. The server's 409 UNIQUE_VIOLATION still guards it.
      nameUniqueness: null,
    },
    StoredFood: {
      table: 'stored_food',
      currentPayload: rowLookup<StoredFoodRow, unknown>('stored_food', storedFoodRowToDto),
      buildFixWriteTask: (payload) => storedFoodLocalWriteTask(payload as unknown as StoredFood),
      nameUniqueness: null,
    },
    Recipe: {
      table: 'recipe',
      currentPayload: recipeCurrentPayload,
      // Nested aggregate (recipe + ingredients, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      nameUniqueness: null,
    },
    Meal: {
      table: 'meal',
      currentPayload: mealCurrentPayload,
      // Nested aggregate (meal + items, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      nameUniqueness: null,
    },
    WorkoutSession: {
      table: 'workout_session',
      currentPayload: workoutSessionCurrentPayload,
      // Nested aggregate (session + exercises + sets, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      nameUniqueness: null,
    },
    WorkoutPlan: {
      table: 'workout_plan',
      currentPayload: workoutPlanCurrentPayload,
      // Nested aggregate (plan + exercises + target sets, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      // documentation/Subfeatures/Heti terv.md: WorkoutPlan.name is not unique (matches LifePlan/CalendarEvent).
      nameUniqueness: null,
    },
    WeeklyPlan: {
      table: 'weekly_plan',
      currentPayload: weeklyPlanCurrentPayload,
      // Nested aggregate (week + slots, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      nameUniqueness: null,
    },
    SwimLog: {
      table: 'swim_log',
      currentPayload: rowLookup<SwimLogRow, unknown>('swim_log', swimLogRowToDto),
      buildFixWriteTask: (payload) => swimLogLocalWriteTask(payload as unknown as SwimLog),
      // documentation/Features/Úszás napló.md: a swim log has no name — nothing to uniqueness-check.
      nameUniqueness: null,
    },
    BikeRideLog: {
      table: 'bike_ride_log',
      currentPayload: rowLookup<BikeRideLogRow, unknown>('bike_ride_log', bikeRideLogRowToDto),
      buildFixWriteTask: (payload) => bikeRideLogLocalWriteTask(payload as unknown as BikeRideLog),
      // documentation/Features/Biciklizés napló.md: a bike ride log has no name — nothing to uniqueness-check.
      nameUniqueness: null,
    },
    RecurringExpense: {
      table: 'recurring_expense',
      currentPayload: rowLookup<RecurringExpenseRow, unknown>('recurring_expense', recurringExpenseRowToDto),
      buildFixWriteTask: (payload) => recurringExpenseLocalWriteTask(payload as unknown as RecurringExpense),
      // documentation/Subfeatures/Rendszeres kiadások.md: name is explicitly NOT unique — nothing to check.
      nameUniqueness: null,
    },
    AycmPartner: {
      table: 'aycm_partner',
      currentPayload: rowLookup<AycmPartnerRow, unknown>('aycm_partner', aycmPartnerRowToDto),
      buildFixWriteTask: (payload) => aycmPartnerLocalWriteTask(payload as unknown as AycmPartner),
      nameUniqueness: {
        field: 'name',
        findConflict: async (value, excludeId) => {
          if (!this.aycmPartners.loaded()) {
            await this.aycmPartners.load();
          }
          const normalized = normalizeName(value);
          return (
            this.aycmPartners
              .partners()
              .find((partner) => partner.id !== excludeId && normalizeName(partner.name) === normalized)?.id ?? null
          );
        },
      },
    },
    AycmPriceRule: {
      table: 'aycm_price_rule',
      currentPayload: rowLookup<AycmPriceRuleRow, unknown>('aycm_price_rule', aycmPriceRuleRowToDto),
      buildFixWriteTask: (payload) => aycmPriceRuleLocalWriteTask(payload as unknown as AycmPriceRule),
      // documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md: overlap is scoped to the partner +
      // shared weekday, not a single value — can't be expressed as (value, excludeId), same reasoning
      // as HouseholdTask. The server's 400 still guards it.
      nameUniqueness: null,
    },
    Gym: {
      table: 'gym',
      currentPayload: rowLookup<GymRow, unknown>('gym', gymRowToDto),
      buildFixWriteTask: (payload) => gymLocalWriteTask(payload as unknown as Gym),
      nameUniqueness: {
        field: 'name',
        findConflict: async (value, excludeId) => {
          if (!this.gyms.loaded()) {
            await this.gyms.load();
          }
          const normalized = normalizeName(value);
          return this.gyms.items().find((gym) => gym.id !== excludeId && normalizeName(gym.name) === normalized)?.id ?? null;
        },
      },
    },
    GymColorBand: {
      table: 'gym_color_band',
      currentPayload: rowLookup<GymColorBandRow, unknown>('gym_color_band', gymColorBandRowToDto),
      buildFixWriteTask: (payload) => gymColorBandLocalWriteTask(payload as unknown as GymColorBand),
      // documentation/Subfeatures/Indoor boulder admin.md: hexColor is unique per *gym*, not per user —
      // the Fix form can't resolve that scope from (value, excludeId) alone (same as HouseholdTask);
      // the server's 409 UNIQUE_VIOLATION still guards it.
      nameUniqueness: null,
    },
    IndoorRoute: {
      table: 'indoor_route',
      currentPayload: rowLookup<IndoorRouteRow, unknown>('indoor_route', indoorRouteRowToDto),
      buildFixWriteTask: (payload) => indoorRouteLocalWriteTask(payload as unknown as IndoorRoute),
      // documentation/Subfeatures/Indoor köteles admin.md: the optional indoor-route catalogue has no uniqueness rule.
      nameUniqueness: null,
    },
    Crag: {
      table: 'crag',
      currentPayload: rowLookup<CragRow, unknown>('crag', cragRowToDto),
      buildFixWriteTask: (payload) => cragLocalWriteTask(payload as unknown as Crag),
      // documentation/Subfeatures/Outdoor boulder admin.md: the location tree has no name-uniqueness rule.
      nameUniqueness: null,
    },
    Sector: {
      table: 'sector',
      currentPayload: rowLookup<SectorRow, unknown>('sector', sectorRowToDto),
      buildFixWriteTask: (payload) => sectorLocalWriteTask(payload as unknown as Sector),
      nameUniqueness: null,
    },
    Route: {
      table: 'route',
      currentPayload: rowLookup<RouteRow, unknown>('route', routeRowToDto),
      buildFixWriteTask: (payload) => routeLocalWriteTask(payload as unknown as Route),
      nameUniqueness: null,
    },
    BoulderProblem: {
      table: 'boulder_problem',
      currentPayload: rowLookup<BoulderProblemRow, unknown>('boulder_problem', boulderProblemRowToDto),
      buildFixWriteTask: (payload) => boulderProblemLocalWriteTask(payload as unknown as BoulderProblem),
      nameUniqueness: null,
    },
    ClimbingSession: {
      table: 'climbing_session',
      currentPayload: climbingSessionCurrentPayload,
      // Nested aggregate (session + attempts + pitches, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      // documentation/Features/Mászónapló.md: a climbing session has no unique name.
      nameUniqueness: null,
    },
    ShoppingList: {
      table: 'shopping_list',
      currentPayload: shoppingListCurrentPayload,
      // Nested aggregate (list + items, one body) — excluded from Fix per spec, see buildFixWriteTask doc above.
      buildFixWriteTask: null,
      nameUniqueness: null,
    },
    ShoppingListComplete: {
      table: 'shopping_list',
      // Never actually read: keepPayloadOnUnskip short-circuits Unskip, Fix is null, and the payload
      // viewer reads item.payload directly.
      currentPayload: async () => null,
      buildFixWriteTask: null,
      nameUniqueness: null,
      keepPayloadOnUnskip: true,
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

/**
 * §6 "Kézi beavatkozás" Drop table: hard-remove for a never-synced create POST, `_needs_refetch = 1`
 * for a PUT/DELETE on an already-synced row. ShoppingList's `/complete` is a POST on an *existing*
 * (synced) list, so it gets neither: the archived list is flagged for a targeted re-read (it's still
 * ACTIVE server-side), and the completion's local-only side effects — the spun-off list, its items,
 * the StoredFood rows, none of which have their own outbox entry — are hard-removed.
 */
export function buildOutboxDropTasks(descriptor: OutboxEntityDescriptor, item: OutboxItem): SqlTask[] {
  if (item.entityType === 'ShoppingListComplete') {
    const payload = (item.payload ?? {}) as {
      checkedFoodEntries?: { storageEntryIds?: string[] }[];
      newActiveList?: { id?: string; items?: { id?: string }[] } | null;
    };
    const tasks: SqlTask[] = [
      { statement: `UPDATE shopping_list SET _needs_refetch = 1, _dirty = 0 WHERE id = ?`, values: [item.targetEntityId] },
    ];
    for (const entry of payload.checkedFoodEntries ?? []) {
      for (const storageEntryId of entry.storageEntryIds ?? []) {
        tasks.push({ statement: `DELETE FROM stored_food WHERE id = ? AND _local_only = 1`, values: [storageEntryId] });
      }
    }
    if (payload.newActiveList?.id) {
      for (const newItem of payload.newActiveList.items ?? []) {
        if (newItem.id) {
          tasks.push({ statement: `DELETE FROM shopping_list_item WHERE id = ? AND _local_only = 1`, values: [newItem.id] });
        }
      }
      tasks.push({ statement: `DELETE FROM shopping_list WHERE id = ? AND _local_only = 1`, values: [payload.newActiveList.id] });
    }
    return tasks;
  }
  if (item.method === 'POST') {
    return [{ statement: `DELETE FROM ${descriptor.table} WHERE id = ?`, values: [item.targetEntityId] }];
  }
  return [{ statement: `UPDATE ${descriptor.table} SET _needs_refetch = 1, _dirty = 0 WHERE id = ?`, values: [item.targetEntityId] }];
}

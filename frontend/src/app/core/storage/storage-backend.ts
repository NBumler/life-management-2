import { InjectionToken } from '@angular/core';

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
import { ShoppingListCompleteFoodEntry } from '../../api/model/shoppingListCompleteFoodEntry';
import { ShoppingListCompleteRequest } from '../../api/model/shoppingListCompleteRequest';
import { ShoppingListItem } from '../../api/model/shoppingListItem';
import { StoredFood } from '../../api/model/storedFood';
import { SwimLog } from '../../api/model/swimLog';
import { BikeRideLog } from '../../api/model/bikeRideLog';
import { RecurringExpense } from '../../api/model/recurringExpense';
import { AycmPartner } from '../../api/model/aycmPartner';
import { AycmPriceRule } from '../../api/model/aycmPriceRule';
import { AycmCheckIn } from '../../api/model/aycmCheckIn';
import { Gym } from '../../api/model/gym';
import { GymColorBand } from '../../api/model/gymColorBand';
import { IndoorRoute } from '../../api/model/indoorRoute';
import { Crag } from '../../api/model/crag';
import { Sector } from '../../api/model/sector';
import { Route } from '../../api/model/route';
import { BoulderProblem } from '../../api/model/boulderProblem';
import { ClimbingSession } from '../../api/model/climbingSession';
import { AscentAttempt } from '../../api/model/ascentAttempt';
import { UserProfile } from '../../api/model/userProfile';
import { WeeklyPlan } from '../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../api/model/weeklyPlanSlot';
import { WeightHistoryEntry } from '../../api/model/weightHistoryEntry';
import { WorkoutExerciseEntry } from '../../api/model/workoutExerciseEntry';
import { WorkoutPlan } from '../../api/model/workoutPlan';
import { WorkoutPlanExercise } from '../../api/model/workoutPlanExercise';
import { WorkoutPlanSet } from '../../api/model/workoutPlanSet';
import { WorkoutSession } from '../../api/model/workoutSession';
import { WorkoutSetEntry } from '../../api/model/workoutSetEntry';

/** documentation/Subfeatures/Sablonok.md: the desired live item list for a template save — id is client-generated for a new item, reused for a kept one. */
export interface PackingTemplateSaveItem {
  id: string;
  gearItemId: string;
  sortOrder: number;
}

export interface PackingTemplateDraft {
  id: string;
  name: string;
  notes: string | null;
  items: PackingTemplateSaveItem[];
}

/** documentation/Subfeatures/Pakolás.md "Indítás": the client-computed, deduped initial item set. */
export interface PackingSessionStartItem {
  id: string;
  gearItemId: string;
  sortOrder: number;
}

export interface GearItemReferenceCounts {
  templateCount: number;
  sessionCount: number;
}

export interface PackingSessionStartDraft {
  id: string;
  destination: string | null;
  sourceTemplateIds: string[];
  items: PackingSessionStartItem[];
}

/** documentation/Subfeatures/Recept.md: the desired live ingredient list for a recipe save — id is client-generated for a new ingredient, reused for a kept one. */
export interface RecipeIngredientSaveItem {
  id: string;
  foodId: string;
  quantityAmount: number;
  quantityUnit: string;
  sortOrder: number;
}

export interface RecipeDraft {
  id: string;
  name: string;
  note: string | null;
  ingredients: RecipeIngredientSaveItem[];
}

/**
 * documentation/Subfeatures/Edzésnapló.md — the desired live tree for a workout session save. Ids
 * are client-generated for a new row, reused for a kept one, at all three levels. `exercise*` on an
 * entry is a snapshot (see WorkoutExerciseEntry.yaml); `exerciseId` is a soft link, null for ad-hoc.
 */
export interface WorkoutSetSaveItem {
  id: string;
  setNumber: number;
  setType: WorkoutSetEntry.SetTypeEnum;
  reps: number | null;
  weightKg: number | null;
  holdTimeSeconds: number | null;
  edgeSizeMm: number | null;
  distanceMeters: number | null;
  restTimeSeconds: number | null;
  isCompleted: boolean;
  orderIndex: number;
}

export interface WorkoutExerciseSaveItem {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseCategory: WorkoutExerciseEntry.ExerciseCategoryEnum;
  exerciseKind: WorkoutExerciseEntry.ExerciseKindEnum;
  orderIndex: number;
  supersetGroup: number | null;
  sets: WorkoutSetSaveItem[];
}

export interface WorkoutSessionDraft {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  workoutType: WorkoutSession.WorkoutTypeEnum;
  title: string | null;
  notes: string | null;
  location: WorkoutSession.LocationEnum | null;
  planId: string | null;
  roundsCount: number | null;
  exercises: WorkoutExerciseSaveItem[];
}

/**
 * documentation/Features/Mászónapló.md — the desired live tree for a climbing session save
 * (ClimbingSession + AscentAttempt + PitchLog). Ids are client-generated for a new row, reused for a
 * kept one, at all three levels. `locationType` + `discipline` come from the dashboard tile, not a
 * form field; the context-specific fields are all optional and enforced by the calling page.
 */
export interface PitchLogSaveItem {
  id: string;
  pitchNumber: number;
  isLead: boolean;
  rawGrade: string | null;
  absoluteDifficultyIndex: number | null;
  lengthInMeters: number | null;
  orderIndex: number;
}

export interface AscentAttemptSaveItem {
  id: string;
  isSuccess: boolean;
  userRawInput: string | null;
  absoluteDifficultyIndex: number | null;
  ascentStyle: AscentAttempt.AscentStyleEnum | null;
  safetyStyle: AscentAttempt.SafetyStyleEnum | null;
  failurePoint: string | null;
  attemptCount: number | null;
  colorBandId: string | null;
  colorName: string | null;
  hexColor: string | null;
  gradeRange: string | null;
  indoorRouteId: string | null;
  routeId: string | null;
  boulderProblemId: string | null;
  routeName: string | null;
  lengthInMeters: number | null;
  notes: string | null;
  orderIndex: number;
  pitches: PitchLogSaveItem[];
}

export interface ClimbingSessionDraft {
  id: string;
  date: string;
  locationType: ClimbingSession.LocationTypeEnum;
  discipline: ClimbingSession.DisciplineEnum;
  totalSessionDurationMinutes: number | null;
  pumpRating: number | null;
  headspaceRating: number | null;
  notes: string | null;
  climbingPartners: string[] | null;
  weatherConditions: ClimbingSession.WeatherConditionsEnum | null;
  gymId: string | null;
  gymName: string | null;
  cragId: string | null;
  cragName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  rockType: string | null;
  aspect: string | null;
  attempts: AscentAttemptSaveItem[];
}

/**
 * documentation/Subfeatures/Heti terv.md — the desired live tree for a WorkoutPlan (static template)
 * save. Ids are client-generated for a new row, reused for a kept one, at all three levels
 * (plan → exercise → target set). `exercise*` on an exercise line is a snapshot taken from the
 * Gyakorlat picker; `exerciseId` is required in a template (unlike the log's ad-hoc entries).
 */
export interface WorkoutPlanSetSaveItem {
  id: string;
  setType: WorkoutPlanSet.SetTypeEnum;
  reps: number | null;
  weightKg: number | null;
  holdTimeSeconds: number | null;
  edgeSizeMm: number | null;
  distanceMeters: number | null;
  restTimeSeconds: number | null;
  orderIndex: number;
}

export interface WorkoutPlanExerciseSaveItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: WorkoutPlanExercise.ExerciseCategoryEnum;
  exerciseKind: WorkoutPlanExercise.ExerciseKindEnum;
  orderIndex: number;
  supersetGroup: number | null;
  targetSets: WorkoutPlanSetSaveItem[];
}

export interface WorkoutPlanDraft {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
  goalLabel: string | null;
  defaultWorkoutType: WorkoutPlan.DefaultWorkoutTypeEnum | null;
  exercises: WorkoutPlanExerciseSaveItem[];
}

/**
 * documentation/Subfeatures/Heti terv.md "Entitás — WeeklyPlan" — the desired live slot set for one
 * calendar week. A slot exists only where a day has a template assigned; a day cleared in the editor
 * simply drops out of `slots` and is soft-deleted. `weeklyPlan.id` is a deterministic UUID v5 of
 * (userId, weekStartDate) so two offline devices editing the same week converge.
 */
export interface WeeklyPlanSlotSaveItem {
  id: string;
  dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum;
  planId: string;
}

export interface WeeklyPlanDraft {
  id: string;
  weekStartDate: string;
  slots: WeeklyPlanSlotSaveItem[];
}

/**
 * documentation/Subfeatures/Étkezés.md "Tétel — közös": the desired live item list for a meal save
 * — id is client-generated for a new item, reused for a kept one. Discriminated on `type` so a
 * screen constructing a RECIPE/FOOD/CUSTOM row can't accidentally set another type's fields.
 */
export type MealItemSaveItem =
  | { id: string; type: 'RECIPE'; recipeId: string; servings: number; sortOrder: number }
  | { id: string; type: 'FOOD'; foodId: string; quantityAmount: number; quantityUnit: string; servings: number; sortOrder: number }
  | {
      id: string;
      type: 'CUSTOM';
      displayName: string;
      caloriesKcal: number;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      priceHuf: number | null;
      servings: number;
      sortOrder: number;
    };

export interface MealDraft {
  id: string;
  eatenAt: string;
  timeZoneId: string;
  note: string | null;
  items: MealItemSaveItem[];
}

/** Expands a discriminated `MealItemSaveItem` into the flat nullable-superset field set every persistence layer (SQLite row, outbox payload, HttpStorageBackend) needs — unused per-type fields are explicitly nulled rather than left undefined. */
export function expandMealItemSaveItem(
  item: MealItemSaveItem,
  mealId: string,
): {
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
} {
  const base = { id: item.id, mealId, servings: item.servings, sortOrder: item.sortOrder };
  switch (item.type) {
    case 'RECIPE':
      return {
        ...base,
        type: 'RECIPE',
        recipeId: item.recipeId,
        foodId: null,
        quantityAmount: null,
        quantityUnit: null,
        displayName: null,
        caloriesKcal: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        priceHuf: null,
      };
    case 'FOOD':
      return {
        ...base,
        type: 'FOOD',
        recipeId: null,
        foodId: item.foodId,
        quantityAmount: item.quantityAmount,
        quantityUnit: item.quantityUnit,
        displayName: null,
        caloriesKcal: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        priceHuf: null,
      };
    case 'CUSTOM':
      return {
        ...base,
        type: 'CUSTOM',
        recipeId: null,
        foodId: null,
        quantityAmount: null,
        quantityUnit: null,
        displayName: item.displayName,
        caloriesKcal: item.caloriesKcal,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        priceHuf: item.priceHuf,
      };
  }
}

/**
 * documentation/Subfeatures/Bevásárlólista írás.md "Tétel hozzáadása": the desired live item list
 * for a shopping list save — id is client-generated for a new item, reused for a kept one.
 * Discriminated on `type` so a screen constructing a FOOD/NON_FOOD row can't accidentally set the
 * other type's fields. Quantity is required for FOOD (the whole point of that type) but optional
 * for NON_FOOD (only `name` is required there).
 */
export type ShoppingListItemSaveItem =
  | { id: string; type: 'FOOD'; foodId: string; quantityAmount: number; quantityUnit: string; checked: boolean; sortOrder: number }
  | {
      id: string;
      type: 'NON_FOOD';
      name: string;
      note: string | null;
      quantityAmount: number | null;
      quantityUnit: string | null;
      checked: boolean;
      sortOrder: number;
    };

export interface ShoppingListDraft {
  id: string;
  name: string | null;
  items: ShoppingListItemSaveItem[];
}

/** Expands a discriminated `ShoppingListItemSaveItem` into the flat nullable-superset field set every persistence layer (SQLite row, outbox payload, HttpStorageBackend) needs — unused per-type fields are explicitly nulled rather than left undefined. */
export function expandShoppingListItemSaveItem(
  item: ShoppingListItemSaveItem,
  shoppingListId: string,
): {
  id: string;
  shoppingListId: string;
  type: string;
  foodId: string | null;
  name: string | null;
  note: string | null;
  quantityAmount: number | null;
  quantityUnit: string | null;
  checked: boolean;
  sortOrder: number;
} {
  const base = { id: item.id, shoppingListId, checked: item.checked, sortOrder: item.sortOrder };
  switch (item.type) {
    case 'FOOD':
      return { ...base, type: 'FOOD', foodId: item.foodId, name: null, note: null, quantityAmount: item.quantityAmount, quantityUnit: item.quantityUnit };
    case 'NON_FOOD':
      return { ...base, type: 'NON_FOOD', foodId: null, name: item.name, note: item.note, quantityAmount: item.quantityAmount, quantityUnit: item.quantityUnit };
  }
}

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — the atomic "Bevásárlás vége" request. All
 * ids (`storageEntryIds`, the new list's `id` and its items' ids) are client-generated
 * (documentation/Architektúra/Backend-offline first.md §2) — built by
 * `pages/menu/shopping/shopping-list-complete.ts`'s `buildCompleteDraft`.
 */
export interface ShoppingListCompleteFoodEntryDraft {
  shoppingListItemId: string;
  storageEntryIds: string[];
  expirationDate: string;
  storageLocation: string;
}

/** The flattened, resolved per-row materialization of `checkedFoodEntries` — what the local SQLite write actually needs (one row per `storageEntryIds` element), separate from the wire payload sent to the server. */
export interface ShoppingListCompleteStorageEntryDraft {
  id: string;
  foodId: string;
  quantityAmount: number;
  quantityUnit: string;
  storageLocation: string;
  expiresOn: string;
}

export interface ShoppingListCompleteNewListDraft {
  id: string;
  name: string | null;
  items: ShoppingListItemSaveItem[];
}

export interface ShoppingListCompleteDraft {
  shoppingListId: string;
  checkedFoodEntries: ShoppingListCompleteFoodEntryDraft[];
  storageEntries: ShoppingListCompleteStorageEntryDraft[];
  newActiveList: ShoppingListCompleteNewListDraft | null;
}

export interface ShoppingListCompleteResult {
  archivedListId: string;
  createdStorageEntryIds: string[];
  newActiveListId: string | null;
}

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — the one place a `ShoppingListCompleteDraft`
 * is projected onto the `POST /api/shopping-lists/{id}/complete` wire body. Shared by both storage
 * backends so the online call (HttpStorageBackend) and the offline outbox payload
 * (SqliteStorageBackend) can never drift. The spun-off list's items are expanded to the full
 * `ShoppingListItem` shape — the backend DTO requires `shoppingListId` and `deleted` — and forced
 * unchecked ("üres pipákkal"), matching the server.
 */
export function buildShoppingListCompleteRequestPayload(draft: ShoppingListCompleteDraft): ShoppingListCompleteRequest {
  return {
    checkedFoodEntries: draft.checkedFoodEntries.map((entry) => ({
      shoppingListItemId: entry.shoppingListItemId,
      storageEntryIds: entry.storageEntryIds,
      expirationDate: entry.expirationDate,
      storageLocation: entry.storageLocation as ShoppingListCompleteFoodEntry.StorageLocationEnum,
    })),
    newActiveList: draft.newActiveList
      ? {
          id: draft.newActiveList.id,
          name: draft.newActiveList.name,
          items: draft.newActiveList.items.map(
            (item) =>
              ({ ...expandShoppingListItemSaveItem(item, draft.newActiveList!.id), checked: false, deleted: false }) as ShoppingListItem,
          ),
        }
      : undefined,
  };
}

/**
 * documentation/Architektúra/Frontend.md `core/storage/`: two implementations selected once by
 * `offlineCapable` — SqliteStorageBackend (native: local store + outbox) and HttpStorageBackend
 * (web: direct call on the generated client). Repositories (`core/data/`) are the only callers.
 */
export interface StorageBackend {
  getProfile(): Promise<UserProfile | null>;
  /** Local-first upsert. `profile.id` is client-generated (UUID v5, see determinism table) on first save. */
  upsertProfile(profile: UserProfile): Promise<UserProfile>;

  listWeightHistory(): Promise<WeightHistoryEntry[]>;
  upsertWeightHistoryEntry(entry: WeightHistoryEntry): Promise<WeightHistoryEntry>;
  deleteWeightHistoryEntry(id: string): Promise<WeightHistoryEntry>;

  listGearItems(): Promise<GearItem[]>;
  upsertGearItem(item: GearItem): Promise<GearItem>;
  deleteGearItem(id: string): Promise<GearItem>;
  /**
   * documentation/Subfeatures/Eszközök.md "Törlés UI": affected live template/session count for the
   * delete confirmation ("helyi store lekérdezés"). `null` when not computable — the web build has no
   * local store to query (documentation/Architektúra/Backend-offline first.md §1: web is online-only).
   */
  countGearItemReferences(gearItemId: string): Promise<GearItemReferenceCounts | null>;

  listPackingTemplates(): Promise<PackingTemplate[]>;
  getPackingTemplateDetail(id: string): Promise<PackingTemplateDetail>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": template + items saved as one outbox entry. */
  savePackingTemplate(draft: PackingTemplateDraft): Promise<PackingTemplateDetail>;
  deletePackingTemplate(id: string): Promise<PackingTemplateDetail>;

  listPackingSessions(): Promise<PackingSession[]>;
  getPackingSessionDetail(id: string): Promise<PackingSessionDetail>;
  /** documentation/Subfeatures/Pakolás.md "Indítás": session + its initial item set as one outbox entry. */
  startPackingSession(draft: PackingSessionStartDraft): Promise<PackingSessionDetail>;
  /** Session-level fields only (destination) — items are never touched here. */
  updatePackingSessionDestination(id: string, destination: string | null): Promise<PackingSession>;
  /** "Lezárás": soft delete + local cascade to the session's own items. */
  closePackingSession(id: string): Promise<PackingSession>;
  /** "Extra eszköz": add one item to an already-running session — its own outbox entry. */
  addPackingSessionItem(sessionId: string, gearItemId: string, sortOrder: number): Promise<PackingSessionItem>;
  /** Status tap or manual reorder — its own outbox entry per item, deliberately not nested (see PackingSessionItem.yaml). */
  updatePackingSessionItem(item: PackingSessionItem): Promise<PackingSessionItem>;

  listLifePlans(): Promise<LifePlan[]>;
  upsertLifePlan(plan: LifePlan): Promise<LifePlan>;
  deleteLifePlan(id: string): Promise<LifePlan>;

  /** documentation/Subfeatures/Gyakorlat.md: user-owned exercise master catalog. */
  listExercises(): Promise<Exercise[]>;
  upsertExercise(exercise: Exercise): Promise<Exercise>;
  deleteExercise(id: string): Promise<Exercise>;
  /**
   * documentation/Subfeatures/Gyakorlat.md "Seed": first-run bootstrap of the built-in exercises
   * (`core/data/exercise-seed.ts`). Each row is written like a normal create (local + outbox on
   * native, POST on web); ids are deterministic UUID v5 so two devices converge. A no-op once the
   * catalog is non-empty. Each backend resolves the current user id itself.
   */
  seedExercises(): Promise<void>;

  /** documentation/Subfeatures/Edzésnapló.md: per-user workout log. Every row (incl. list entries) embeds its full live+tombstoned exercise/set tree. */
  listWorkoutSessions(): Promise<WorkoutSession[]>;
  getWorkoutSession(id: string): Promise<WorkoutSession>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": session + exercises + sets saved as one outbox entry. */
  saveWorkoutSession(draft: WorkoutSessionDraft): Promise<WorkoutSession>;
  /** documentation/Subfeatures/Edzésnapló.md "Törlés": cascades to every live exercise entry and set on this session. */
  deleteWorkoutSession(id: string): Promise<WorkoutSession>;

  /** documentation/Features/Mászónapló.md: per-user climbing log. Every row (incl. list entries) embeds its full live+tombstoned attempt/pitch tree. */
  listClimbingSessions(): Promise<ClimbingSession[]>;
  getClimbingSession(id: string): Promise<ClimbingSession>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": session + attempts + pitches saved as one outbox entry. */
  saveClimbingSession(draft: ClimbingSessionDraft): Promise<ClimbingSession>;
  /** documentation/Features/Mászónapló.md "Soft delete / offline": cascades to every live attempt and pitch on this session. */
  deleteClimbingSession(id: string): Promise<ClimbingSession>;

  /** documentation/Subfeatures/Heti terv.md: per-user static training templates. Every row (incl. list entries) embeds its full live+tombstoned exercise/target-set tree. */
  listWorkoutPlans(): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: string): Promise<WorkoutPlan>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": plan + exercises + target sets saved as one outbox entry. `active` is a plain field on the same body. */
  saveWorkoutPlan(draft: WorkoutPlanDraft): Promise<WorkoutPlan>;
  /** documentation/Subfeatures/Heti terv.md "CRUD": cascades to every live exercise line and target set; past WorkoutSession.planId / WeeklyPlan slots pointing here are untouched. */
  deleteWorkoutPlan(id: string): Promise<WorkoutPlan>;

  /** documentation/Subfeatures/Heti terv.md: per-user weekly day→template assignments. Every row embeds its full live+tombstoned slot set. */
  listWeeklyPlans(): Promise<WeeklyPlan[]>;
  getWeeklyPlan(id: string): Promise<WeeklyPlan>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": week + slots saved as one outbox entry. */
  saveWeeklyPlan(draft: WeeklyPlanDraft): Promise<WeeklyPlan>;
  /** documentation/Subfeatures/Heti terv.md "CRUD": cascades to every live slot on this week. */
  deleteWeeklyPlan(id: string): Promise<WeeklyPlan>;

  /** documentation/Features/Úszás napló.md: per-user swim logs — flat CRUD, no nested rows. */
  listSwimLogs(): Promise<SwimLog[]>;
  upsertSwimLog(log: SwimLog): Promise<SwimLog>;
  deleteSwimLog(id: string): Promise<SwimLog>;

  /** documentation/Features/Biciklizés napló.md: per-user bike ride logs — flat CRUD, no nested rows. */
  listBikeRideLogs(): Promise<BikeRideLog[]>;
  upsertBikeRideLog(log: BikeRideLog): Promise<BikeRideLog>;
  deleteBikeRideLog(id: string): Promise<BikeRideLog>;

  /** documentation/Subfeatures/Rendszeres kiadások.md: per-user recurring expenses — flat CRUD, no nested rows. */
  listRecurringExpenses(): Promise<RecurringExpense[]>;
  upsertRecurringExpense(expense: RecurringExpense): Promise<RecurringExpense>;
  deleteRecurringExpense(id: string): Promise<RecurringExpense>;

  /** documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md: per-user AYCM partners + their price rules — flat CRUD. */
  listAycmPartners(): Promise<AycmPartner[]>;
  upsertAycmPartner(partner: AycmPartner): Promise<AycmPartner>;
  /** Soft delete + cascade `deleted` onto the partner's live price rules (Check-Ins untouched). */
  deleteAycmPartner(id: string): Promise<AycmPartner>;
  listAycmPriceRules(partnerId: string): Promise<AycmPriceRule[]>;
  upsertAycmPriceRule(rule: AycmPriceRule): Promise<AycmPriceRule>;
  deleteAycmPriceRule(partnerId: string, id: string): Promise<AycmPriceRule>;

  /** documentation/Subfeatures/AYCM Check-In.md: per-user Check-Ins — flat CRUD, one live row per calendar day. */
  listAycmCheckIns(): Promise<AycmCheckIn[]>;
  upsertAycmCheckIn(checkIn: AycmCheckIn): Promise<AycmCheckIn>;
  deleteAycmCheckIn(id: string): Promise<AycmCheckIn>;

  /** documentation/Subfeatures/Indoor boulder admin.md + Indoor köteles admin.md: per-user indoor venue master — flat CRUD. */
  listGyms(): Promise<Gym[]>;
  upsertGym(gym: Gym): Promise<Gym>;
  /** documentation/Subfeatures/Indoor boulder admin.md "Soft delete": no cascade — colour bands / indoor routes keep their own tombstones. */
  deleteGym(id: string): Promise<Gym>;

  listGymColorBands(): Promise<GymColorBand[]>;
  upsertGymColorBand(band: GymColorBand): Promise<GymColorBand>;
  deleteGymColorBand(id: string): Promise<GymColorBand>;

  listIndoorRoutes(): Promise<IndoorRoute[]>;
  upsertIndoorRoute(route: IndoorRoute): Promise<IndoorRoute>;
  deleteIndoorRoute(id: string): Promise<IndoorRoute>;

  /** documentation/Subfeatures/Outdoor boulder admin.md + Outdoor köteles admin.md: per-user outdoor location tree — flat CRUD, no name-uniqueness. */
  listCrags(): Promise<Crag[]>;
  upsertCrag(crag: Crag): Promise<Crag>;
  /** documentation/Subfeatures/Outdoor boulder admin.md "Soft delete": no cascade — sectors / routes / boulder problems keep their own tombstones. */
  deleteCrag(id: string): Promise<Crag>;

  listSectors(): Promise<Sector[]>;
  upsertSector(sector: Sector): Promise<Sector>;
  deleteSector(id: string): Promise<Sector>;

  listRoutes(): Promise<Route[]>;
  upsertRoute(route: Route): Promise<Route>;
  deleteRoute(id: string): Promise<Route>;

  listBoulderProblems(): Promise<BoulderProblem[]>;
  upsertBoulderProblem(problem: BoulderProblem): Promise<BoulderProblem>;
  deleteBoulderProblem(id: string): Promise<BoulderProblem>;

  listHouseholdRooms(): Promise<HouseholdRoom[]>;
  upsertHouseholdRoom(room: HouseholdRoom): Promise<HouseholdRoom>;
  /** documentation/Subfeatures/Háztartási feladatok.md "Törlés": cascades to every live task in the room. */
  deleteHouseholdRoom(id: string): Promise<HouseholdRoom>;

  listHouseholdTasks(): Promise<HouseholdTask[]>;
  upsertHouseholdTask(task: HouseholdTask): Promise<HouseholdTask>;
  deleteHouseholdTask(id: string): Promise<HouseholdTask>;

  listEvents(): Promise<CalendarEvent[]>;
  upsertEvent(event: CalendarEvent): Promise<CalendarEvent>;
  /** documentation/Features/Események.md "Modell: egy sor = egy sorozat": deletes the whole series. */
  deleteEvent(id: string): Promise<CalendarEvent>;

  /** documentation/Subfeatures/Élelmiszerek.md: shared/global catalog — not scoped by user. */
  listFoods(): Promise<Food[]>;
  upsertFood(food: Food): Promise<Food>;
  /** documentation/Subfeatures/Élelmiszer tárolás.md "Törlés": cascades to every live storage item referencing this catalog entry. */
  deleteFood(id: string): Promise<Food>;

  listStoredFoods(): Promise<StoredFood[]>;
  upsertStoredFood(item: StoredFood): Promise<StoredFood>;
  deleteStoredFood(id: string): Promise<StoredFood>;

  /** documentation/Subfeatures/Recept.md: shared/global catalog — not scoped by user. Every row (incl. list entries) embeds its full live+tombstoned ingredient set. */
  listRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": recipe + ingredients saved as one outbox entry. */
  saveRecipe(draft: RecipeDraft): Promise<Recipe>;
  /** documentation/Subfeatures/Recept.md "CRUD / törlés": cascades to every live ingredient on this recipe. */
  deleteRecipe(id: string): Promise<Recipe>;

  /** documentation/Subfeatures/Étkezés.md: per-user meal log. Every row (incl. list entries) embeds its full live+tombstoned item set. */
  listMeals(): Promise<Meal[]>;
  getMeal(id: string): Promise<Meal>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": meal + items saved as one outbox entry. */
  saveMeal(draft: MealDraft): Promise<Meal>;
  /** documentation/Subfeatures/Étkezés.md: cascades to every live item on this meal. */
  deleteMeal(id: string): Promise<Meal>;

  /** documentation/Subfeatures/Bevásárlólista írás.md: per-user active shopping list. Every row (incl. list entries) embeds its full live+tombstoned item set. */
  listShoppingLists(): Promise<ShoppingList[]>;
  getShoppingList(id: string): Promise<ShoppingList>;
  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": list + items saved as one outbox entry. */
  saveShoppingList(draft: ShoppingListDraft): Promise<ShoppingList>;
  /** documentation/Subfeatures/Bevásárlólista írás.md "Törlés": cascades to every live item on this list. */
  deleteShoppingList(id: string): Promise<ShoppingList>;
  /** documentation/Subfeatures/Bevásárlás teljesítve.md — atomic multi-entity completion: StoredFood rows + list archive + optional spun-off active list, as one outbox entry. */
  completeShoppingList(draft: ShoppingListCompleteDraft): Promise<ShoppingListCompleteResult>;
}

export const STORAGE_BACKEND = new InjectionToken<StorageBackend>('STORAGE_BACKEND');

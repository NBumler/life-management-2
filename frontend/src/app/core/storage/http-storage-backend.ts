import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { EventsService } from '../../api/api/events.service';
import { ExercisesService } from '../../api/api/exercises.service';
import { FoodsService } from '../../api/api/foods.service';
import { GearItemsService } from '../../api/api/gearItems.service';
import { HouseholdRoomsService } from '../../api/api/householdRooms.service';
import { HouseholdTasksService } from '../../api/api/householdTasks.service';
import { LifePlansService } from '../../api/api/lifePlans.service';
import { MealsService } from '../../api/api/meals.service';
import { PackingSessionItemsService } from '../../api/api/packingSessionItems.service';
import { PackingSessionsService } from '../../api/api/packingSessions.service';
import { PackingTemplatesService } from '../../api/api/packingTemplates.service';
import { ProfileService } from '../../api/api/profile.service';
import { RecipesService } from '../../api/api/recipes.service';
import { ShoppingListsService } from '../../api/api/shoppingLists.service';
import { StoredFoodsService } from '../../api/api/storedFoods.service';
import { SwimLogsService } from '../../api/api/swimLogs.service';
import { BikeRideLogsService } from '../../api/api/bikeRideLogs.service';
import { RecurringExpensesService } from '../../api/api/recurringExpenses.service';
import { ClimbingGymsService } from '../../api/api/climbingGyms.service';
import { ClimbingGymColorBandsService } from '../../api/api/climbingGymColorBands.service';
import { ClimbingIndoorRoutesService } from '../../api/api/climbingIndoorRoutes.service';
import { ClimbingCragsService } from '../../api/api/climbingCrags.service';
import { ClimbingSectorsService } from '../../api/api/climbingSectors.service';
import { ClimbingRoutesService } from '../../api/api/climbingRoutes.service';
import { ClimbingBoulderProblemsService } from '../../api/api/climbingBoulderProblems.service';
import { ClimbingSessionsService } from '../../api/api/climbingSessions.service';
import { WeeklyPlansService } from '../../api/api/weeklyPlans.service';
import { WorkoutPlansService } from '../../api/api/workoutPlans.service';
import { WorkoutSessionsService } from '../../api/api/workoutSessions.service';
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
import { buildSeedExercises } from '../data/exercise-seed';
import { AuthSessionService } from '../session/auth-session.service';
import { uuidV4 } from '../sync/uuid';
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

/** Web (offlineCapable = false): every call is a direct HTTP round-trip, no local store, no outbox. */
@Injectable({ providedIn: 'root' })
export class HttpStorageBackend implements StorageBackend {
  private readonly profileApi = inject(ProfileService);
  private readonly gearApi = inject(GearItemsService);
  private readonly packingTemplatesApi = inject(PackingTemplatesService);
  private readonly packingSessionsApi = inject(PackingSessionsService);
  private readonly packingSessionItemsApi = inject(PackingSessionItemsService);
  private readonly lifePlansApi = inject(LifePlansService);
  private readonly exercisesApi = inject(ExercisesService);
  private readonly householdRoomsApi = inject(HouseholdRoomsService);
  private readonly householdTasksApi = inject(HouseholdTasksService);
  private readonly eventsApi = inject(EventsService);
  private readonly foodsApi = inject(FoodsService);
  private readonly storedFoodsApi = inject(StoredFoodsService);
  private readonly recipesApi = inject(RecipesService);
  private readonly mealsApi = inject(MealsService);
  private readonly shoppingListsApi = inject(ShoppingListsService);
  private readonly workoutSessionsApi = inject(WorkoutSessionsService);
  private readonly workoutPlansApi = inject(WorkoutPlansService);
  private readonly weeklyPlansApi = inject(WeeklyPlansService);
  private readonly swimLogsApi = inject(SwimLogsService);
  private readonly bikeRideLogsApi = inject(BikeRideLogsService);
  private readonly recurringExpensesApi = inject(RecurringExpensesService);
  private readonly gymsApi = inject(ClimbingGymsService);
  private readonly gymColorBandsApi = inject(ClimbingGymColorBandsService);
  private readonly indoorRoutesApi = inject(ClimbingIndoorRoutesService);
  private readonly cragsApi = inject(ClimbingCragsService);
  private readonly sectorsApi = inject(ClimbingSectorsService);
  private readonly routesApi = inject(ClimbingRoutesService);
  private readonly boulderProblemsApi = inject(ClimbingBoulderProblemsService);
  private readonly climbingSessionsApi = inject(ClimbingSessionsService);
  private readonly authSession = inject(AuthSessionService);

  async getProfile(): Promise<UserProfile | null> {
    try {
      return await firstValueFrom(this.profileApi.getProfile());
    } catch (error) {
      if (isHttpStatus(error, 404)) {
        return null;
      }
      throw error;
    }
  }

  upsertProfile(profile: UserProfile): Promise<UserProfile> {
    return firstValueFrom(this.profileApi.putProfile(profile));
  }

  listWeightHistory(): Promise<WeightHistoryEntry[]> {
    return firstValueFrom(this.profileApi.listWeightHistory());
  }

  /** POST with an existing id is an idempotent upsert server-side (documentation/Architektúra/Backend-offline first.md HTTP szemantika), so this covers both create and update. */
  upsertWeightHistoryEntry(entry: WeightHistoryEntry): Promise<WeightHistoryEntry> {
    return firstValueFrom(this.profileApi.createWeightHistoryEntry(entry));
  }

  deleteWeightHistoryEntry(id: string): Promise<WeightHistoryEntry> {
    return firstValueFrom(this.profileApi.deleteWeightHistoryEntry(id));
  }

  listGearItems(): Promise<GearItem[]> {
    return firstValueFrom(this.gearApi.listGearItems());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertGearItem(item: GearItem): Promise<GearItem> {
    return firstValueFrom(this.gearApi.createGearItem(item));
  }

  deleteGearItem(id: string): Promise<GearItem> {
    return firstValueFrom(this.gearApi.deleteGearItem(id));
  }

  /** No local store on web to query — the delete confirmation shows a generic message instead. */
  countGearItemReferences(): Promise<GearItemReferenceCounts | null> {
    return Promise.resolve(null);
  }

  listPackingTemplates(): Promise<PackingTemplate[]> {
    return firstValueFrom(this.packingTemplatesApi.listPackingTemplates());
  }

  getPackingTemplateDetail(id: string): Promise<PackingTemplateDetail> {
    return firstValueFrom(this.packingTemplatesApi.getPackingTemplate(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  savePackingTemplate(draft: PackingTemplateDraft): Promise<PackingTemplateDetail> {
    const dto: PackingTemplateDetail = {
      id: draft.id,
      name: draft.name,
      notes: draft.notes,
      deleted: false,
      items: draft.items.map((item) => ({ id: item.id, templateId: draft.id, gearItemId: item.gearItemId, sortOrder: item.sortOrder, deleted: false })),
    };
    return firstValueFrom(this.packingTemplatesApi.createPackingTemplate(dto));
  }

  deletePackingTemplate(id: string): Promise<PackingTemplateDetail> {
    return firstValueFrom(this.packingTemplatesApi.deletePackingTemplate(id));
  }

  listPackingSessions(): Promise<PackingSession[]> {
    return firstValueFrom(this.packingSessionsApi.listPackingSessions());
  }

  getPackingSessionDetail(id: string): Promise<PackingSessionDetail> {
    return firstValueFrom(this.packingSessionsApi.getPackingSession(id));
  }

  startPackingSession(draft: PackingSessionStartDraft): Promise<PackingSessionDetail> {
    const dto: PackingSessionDetail = {
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
    return firstValueFrom(this.packingSessionsApi.createPackingSession(dto));
  }

  updatePackingSessionDestination(id: string, destination: string | null): Promise<PackingSession> {
    // sourceTemplateIds is immutable after creation; the server ignores it on update (session-level fields only).
    const dto: PackingSession = { id, destination, sourceTemplateIds: [], deleted: false };
    return firstValueFrom(this.packingSessionsApi.updatePackingSession(id, dto));
  }

  closePackingSession(id: string): Promise<PackingSession> {
    return firstValueFrom(this.packingSessionsApi.deletePackingSession(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  addPackingSessionItem(sessionId: string, gearItemId: string, sortOrder: number): Promise<PackingSessionItem> {
    const dto: PackingSessionItem = {
      id: uuidV4(),
      sessionId,
      gearItemId,
      status: PackingSessionItem.StatusEnum.NotPacked,
      sortOrder,
      deleted: false,
    };
    return firstValueFrom(this.packingSessionItemsApi.createPackingSessionItem(dto));
  }

  updatePackingSessionItem(item: PackingSessionItem): Promise<PackingSessionItem> {
    return firstValueFrom(this.packingSessionItemsApi.updatePackingSessionItem(item.id, item));
  }

  listLifePlans(): Promise<LifePlan[]> {
    return firstValueFrom(this.lifePlansApi.listLifePlans());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertLifePlan(plan: LifePlan): Promise<LifePlan> {
    return firstValueFrom(this.lifePlansApi.createLifePlan(plan));
  }

  deleteLifePlan(id: string): Promise<LifePlan> {
    return firstValueFrom(this.lifePlansApi.deleteLifePlan(id));
  }

  listExercises(): Promise<Exercise[]> {
    return firstValueFrom(this.exercisesApi.listExercises());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertExercise(exercise: Exercise): Promise<Exercise> {
    return firstValueFrom(this.exercisesApi.createExercise(exercise));
  }

  deleteExercise(id: string): Promise<Exercise> {
    return firstValueFrom(this.exercisesApi.deleteExercise(id));
  }

  /**
   * documentation/Subfeatures/Gyakorlat.md "Seed": web has no local store to gate on. `listExercises`
   * returns live rows only, so an "is it empty?" check alone would re-POST the whole seed on every
   * launch once the user has deleted all of it (and the server `create` won't undelete those
   * tombstones). A per-user `localStorage` latch makes it genuinely once-ever for this browser;
   * the "server already non-empty" check still short-circuits a fresh browser whose catalog synced
   * from a native device. The deterministic v5 ids keep any residual repeat POST idempotent.
   */
  async seedExercises(): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      return;
    }
    const latchKey = `lm2.exerciseSeedDone.${userId}`;
    if (localStorage.getItem(latchKey) === '1') {
      return;
    }
    const existing = await firstValueFrom(this.exercisesApi.listExercises());
    if (existing.length === 0) {
      for (const exercise of await buildSeedExercises(userId)) {
        await firstValueFrom(this.exercisesApi.createExercise(exercise));
      }
    }
    localStorage.setItem(latchKey, '1');
  }

  listHouseholdRooms(): Promise<HouseholdRoom[]> {
    return firstValueFrom(this.householdRoomsApi.listHouseholdRooms());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertHouseholdRoom(room: HouseholdRoom): Promise<HouseholdRoom> {
    return firstValueFrom(this.householdRoomsApi.createHouseholdRoom(room));
  }

  deleteHouseholdRoom(id: string): Promise<HouseholdRoom> {
    return firstValueFrom(this.householdRoomsApi.deleteHouseholdRoom(id));
  }

  listHouseholdTasks(): Promise<HouseholdTask[]> {
    return firstValueFrom(this.householdTasksApi.listHouseholdTasks());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertHouseholdTask(task: HouseholdTask): Promise<HouseholdTask> {
    return firstValueFrom(this.householdTasksApi.createHouseholdTask(task));
  }

  deleteHouseholdTask(id: string): Promise<HouseholdTask> {
    return firstValueFrom(this.householdTasksApi.deleteHouseholdTask(id));
  }

  listEvents(): Promise<CalendarEvent[]> {
    return firstValueFrom(this.eventsApi.listEvents());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertEvent(event: CalendarEvent): Promise<CalendarEvent> {
    return firstValueFrom(this.eventsApi.createEvent(event));
  }

  deleteEvent(id: string): Promise<CalendarEvent> {
    return firstValueFrom(this.eventsApi.deleteEvent(id));
  }

  listFoods(): Promise<Food[]> {
    return firstValueFrom(this.foodsApi.listFoods());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertFood(food: Food): Promise<Food> {
    return firstValueFrom(this.foodsApi.createFood(food));
  }

  deleteFood(id: string): Promise<Food> {
    return firstValueFrom(this.foodsApi.deleteFood(id));
  }

  listStoredFoods(): Promise<StoredFood[]> {
    return firstValueFrom(this.storedFoodsApi.listStoredFoods());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertStoredFood(item: StoredFood): Promise<StoredFood> {
    return firstValueFrom(this.storedFoodsApi.createStoredFood(item));
  }

  deleteStoredFood(id: string): Promise<StoredFood> {
    return firstValueFrom(this.storedFoodsApi.deleteStoredFood(id));
  }

  listRecipes(): Promise<Recipe[]> {
    return firstValueFrom(this.recipesApi.listRecipes());
  }

  getRecipe(id: string): Promise<Recipe> {
    return firstValueFrom(this.recipesApi.getRecipe(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveRecipe(draft: RecipeDraft): Promise<Recipe> {
    const dto: Recipe = {
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
    return firstValueFrom(this.recipesApi.createRecipe(dto));
  }

  deleteRecipe(id: string): Promise<Recipe> {
    return firstValueFrom(this.recipesApi.deleteRecipe(id));
  }

  listWorkoutSessions(): Promise<WorkoutSession[]> {
    return firstValueFrom(this.workoutSessionsApi.listWorkoutSessions());
  }

  getWorkoutSession(id: string): Promise<WorkoutSession> {
    return firstValueFrom(this.workoutSessionsApi.getWorkoutSession(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveWorkoutSession(draft: WorkoutSessionDraft): Promise<WorkoutSession> {
    const dto: WorkoutSession = {
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
    return firstValueFrom(this.workoutSessionsApi.createWorkoutSession(dto));
  }

  deleteWorkoutSession(id: string): Promise<WorkoutSession> {
    return firstValueFrom(this.workoutSessionsApi.deleteWorkoutSession(id));
  }

  listClimbingSessions(): Promise<ClimbingSession[]> {
    return firstValueFrom(this.climbingSessionsApi.listClimbingSessions());
  }

  getClimbingSession(id: string): Promise<ClimbingSession> {
    return firstValueFrom(this.climbingSessionsApi.getClimbingSession(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveClimbingSession(draft: ClimbingSessionDraft): Promise<ClimbingSession> {
    const dto: ClimbingSession = {
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
    return firstValueFrom(this.climbingSessionsApi.createClimbingSession(dto));
  }

  deleteClimbingSession(id: string): Promise<ClimbingSession> {
    return firstValueFrom(this.climbingSessionsApi.deleteClimbingSession(id));
  }

  listWorkoutPlans(): Promise<WorkoutPlan[]> {
    return firstValueFrom(this.workoutPlansApi.listWorkoutPlans());
  }

  getWorkoutPlan(id: string): Promise<WorkoutPlan> {
    return firstValueFrom(this.workoutPlansApi.getWorkoutPlan(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveWorkoutPlan(draft: WorkoutPlanDraft): Promise<WorkoutPlan> {
    const dto: WorkoutPlan = {
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
    return firstValueFrom(this.workoutPlansApi.createWorkoutPlan(dto));
  }

  deleteWorkoutPlan(id: string): Promise<WorkoutPlan> {
    return firstValueFrom(this.workoutPlansApi.deleteWorkoutPlan(id));
  }

  listWeeklyPlans(): Promise<WeeklyPlan[]> {
    return firstValueFrom(this.weeklyPlansApi.listWeeklyPlans());
  }

  getWeeklyPlan(id: string): Promise<WeeklyPlan> {
    return firstValueFrom(this.weeklyPlansApi.getWeeklyPlan(id));
  }

  /** POST with an existing id is an idempotent upsert server-side (and revives a soft-deleted same-week row). */
  saveWeeklyPlan(draft: WeeklyPlanDraft): Promise<WeeklyPlan> {
    const dto: WeeklyPlan = {
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
    return firstValueFrom(this.weeklyPlansApi.createWeeklyPlan(dto));
  }

  deleteWeeklyPlan(id: string): Promise<WeeklyPlan> {
    return firstValueFrom(this.weeklyPlansApi.deleteWeeklyPlan(id));
  }

  listSwimLogs(): Promise<SwimLog[]> {
    return firstValueFrom(this.swimLogsApi.listSwimLogs());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertSwimLog(log: SwimLog): Promise<SwimLog> {
    return firstValueFrom(this.swimLogsApi.createSwimLog(log));
  }

  deleteSwimLog(id: string): Promise<SwimLog> {
    return firstValueFrom(this.swimLogsApi.deleteSwimLog(id));
  }

  listBikeRideLogs(): Promise<BikeRideLog[]> {
    return firstValueFrom(this.bikeRideLogsApi.listBikeRideLogs());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertBikeRideLog(log: BikeRideLog): Promise<BikeRideLog> {
    return firstValueFrom(this.bikeRideLogsApi.createBikeRideLog(log));
  }

  deleteBikeRideLog(id: string): Promise<BikeRideLog> {
    return firstValueFrom(this.bikeRideLogsApi.deleteBikeRideLog(id));
  }

  listRecurringExpenses(): Promise<RecurringExpense[]> {
    return firstValueFrom(this.recurringExpensesApi.listRecurringExpenses());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertRecurringExpense(expense: RecurringExpense): Promise<RecurringExpense> {
    return firstValueFrom(this.recurringExpensesApi.createRecurringExpense(expense));
  }

  deleteRecurringExpense(id: string): Promise<RecurringExpense> {
    return firstValueFrom(this.recurringExpensesApi.deleteRecurringExpense(id));
  }

  listGyms(): Promise<Gym[]> {
    return firstValueFrom(this.gymsApi.listClimbingGyms());
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  upsertGym(gym: Gym): Promise<Gym> {
    return firstValueFrom(this.gymsApi.createClimbingGym(gym));
  }

  deleteGym(id: string): Promise<Gym> {
    return firstValueFrom(this.gymsApi.deleteClimbingGym(id));
  }

  listGymColorBands(): Promise<GymColorBand[]> {
    return firstValueFrom(this.gymColorBandsApi.listClimbingGymColorBands());
  }

  upsertGymColorBand(band: GymColorBand): Promise<GymColorBand> {
    return firstValueFrom(this.gymColorBandsApi.createClimbingGymColorBand(band));
  }

  deleteGymColorBand(id: string): Promise<GymColorBand> {
    return firstValueFrom(this.gymColorBandsApi.deleteClimbingGymColorBand(id));
  }

  listIndoorRoutes(): Promise<IndoorRoute[]> {
    return firstValueFrom(this.indoorRoutesApi.listClimbingIndoorRoutes());
  }

  upsertIndoorRoute(route: IndoorRoute): Promise<IndoorRoute> {
    return firstValueFrom(this.indoorRoutesApi.createClimbingIndoorRoute(route));
  }

  deleteIndoorRoute(id: string): Promise<IndoorRoute> {
    return firstValueFrom(this.indoorRoutesApi.deleteClimbingIndoorRoute(id));
  }

  listCrags(): Promise<Crag[]> {
    return firstValueFrom(this.cragsApi.listClimbingCrags());
  }

  upsertCrag(crag: Crag): Promise<Crag> {
    return firstValueFrom(this.cragsApi.createClimbingCrag(crag));
  }

  deleteCrag(id: string): Promise<Crag> {
    return firstValueFrom(this.cragsApi.deleteClimbingCrag(id));
  }

  listSectors(): Promise<Sector[]> {
    return firstValueFrom(this.sectorsApi.listClimbingSectors());
  }

  upsertSector(sector: Sector): Promise<Sector> {
    return firstValueFrom(this.sectorsApi.createClimbingSector(sector));
  }

  deleteSector(id: string): Promise<Sector> {
    return firstValueFrom(this.sectorsApi.deleteClimbingSector(id));
  }

  listRoutes(): Promise<Route[]> {
    return firstValueFrom(this.routesApi.listClimbingRoutes());
  }

  upsertRoute(route: Route): Promise<Route> {
    return firstValueFrom(this.routesApi.createClimbingRoute(route));
  }

  deleteRoute(id: string): Promise<Route> {
    return firstValueFrom(this.routesApi.deleteClimbingRoute(id));
  }

  listBoulderProblems(): Promise<BoulderProblem[]> {
    return firstValueFrom(this.boulderProblemsApi.listClimbingBoulderProblems());
  }

  upsertBoulderProblem(problem: BoulderProblem): Promise<BoulderProblem> {
    return firstValueFrom(this.boulderProblemsApi.createClimbingBoulderProblem(problem));
  }

  deleteBoulderProblem(id: string): Promise<BoulderProblem> {
    return firstValueFrom(this.boulderProblemsApi.deleteClimbingBoulderProblem(id));
  }

  listMeals(): Promise<Meal[]> {
    return firstValueFrom(this.mealsApi.listMeals());
  }

  getMeal(id: string): Promise<Meal> {
    return firstValueFrom(this.mealsApi.getMeal(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveMeal(draft: MealDraft): Promise<Meal> {
    const dto: Meal = {
      id: draft.id,
      eatenAt: draft.eatenAt,
      timeZoneId: draft.timeZoneId,
      note: draft.note,
      deleted: false,
      items: draft.items.map((item) => ({ ...expandMealItemSaveItem(item, draft.id), deleted: false }) as Meal['items'][number]),
    };
    return firstValueFrom(this.mealsApi.createMeal(dto));
  }

  deleteMeal(id: string): Promise<Meal> {
    return firstValueFrom(this.mealsApi.deleteMeal(id));
  }

  listShoppingLists(): Promise<ShoppingList[]> {
    return firstValueFrom(this.shoppingListsApi.listShoppingLists());
  }

  getShoppingList(id: string): Promise<ShoppingList> {
    return firstValueFrom(this.shoppingListsApi.getShoppingList(id));
  }

  /** POST with an existing id is an idempotent upsert server-side, so this covers both create and update. */
  saveShoppingList(draft: ShoppingListDraft): Promise<ShoppingList> {
    const dto: ShoppingList = {
      id: draft.id,
      name: draft.name,
      deleted: false,
      items: draft.items.map((item) => ({ ...expandShoppingListItemSaveItem(item, draft.id), deleted: false }) as ShoppingList['items'][number]),
    };
    return firstValueFrom(this.shoppingListsApi.createShoppingList(dto));
  }

  deleteShoppingList(id: string): Promise<ShoppingList> {
    return firstValueFrom(this.shoppingListsApi.deleteShoppingList(id));
  }

  async completeShoppingList(draft: ShoppingListCompleteDraft): Promise<ShoppingListCompleteResult> {
    const dto = buildShoppingListCompleteRequestPayload(draft);
    // A list is completed exactly once, so its id is a stable, unique Idempotency-Key — a fresh
    // uuidV4() per call would let a double-tap / retry run the completion twice server-side.
    const response = await firstValueFrom(this.shoppingListsApi.completeShoppingList(draft.shoppingListId, draft.shoppingListId, dto));
    return {
      archivedListId: response.archivedListId,
      createdStorageEntryIds: response.createdStorageEntryIds,
      newActiveListId: response.newActiveListId ?? null,
    };
  }
}

function isHttpStatus(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === status;
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { firstValueFrom, timeout } from 'rxjs';

import { EventsService } from '../../api/api/events.service';
import { ExercisesService } from '../../api/api/exercises.service';
import { FoodsService } from '../../api/api/foods.service';
import { GearItemsService } from '../../api/api/gearItems.service';
import { HealthService } from '../../api/api/health.service';
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
import { AycmPartnersService } from '../../api/api/aycmPartners.service';
import { AycmPriceRulesService } from '../../api/api/aycmPriceRules.service';
import { AycmCheckInsService } from '../../api/api/aycmCheckIns.service';
import { AycmSettingsService } from '../../api/api/aycmSettings.service';
import { ClimbingGymsService } from '../../api/api/climbingGyms.service';
import { ClimbingGymColorBandsService } from '../../api/api/climbingGymColorBands.service';
import { ClimbingIndoorRoutesService } from '../../api/api/climbingIndoorRoutes.service';
import { ClimbingCragsService } from '../../api/api/climbingCrags.service';
import { ClimbingSectorsService } from '../../api/api/climbingSectors.service';
import { ClimbingRoutesService } from '../../api/api/climbingRoutes.service';
import { ClimbingBoulderProblemsService } from '../../api/api/climbingBoulderProblems.service';
import { ClimbingSessionsService } from '../../api/api/climbingSessions.service';
import { SyncService } from '../../api/api/sync.service';
import { WeeklyPlansService } from '../../api/api/weeklyPlans.service';
import { WorkoutPlansService } from '../../api/api/workoutPlans.service';
import { WorkoutSessionsService } from '../../api/api/workoutSessions.service';
import { ApiError } from '../../api/model/apiError';
import { CalendarEvent } from '../../api/model/calendarEvent';
import { Exercise } from '../../api/model/exercise';
import { Food } from '../../api/model/food';
import { GearItem } from '../../api/model/gearItem';
import { HouseholdRoom } from '../../api/model/householdRoom';
import { HouseholdTask } from '../../api/model/householdTask';
import { LifePlan } from '../../api/model/lifePlan';
import { Meal } from '../../api/model/meal';
import { MealItem } from '../../api/model/mealItem';
import { PackingSession } from '../../api/model/packingSession';
import { PackingSessionDetail } from '../../api/model/packingSessionDetail';
import { PackingSessionItem } from '../../api/model/packingSessionItem';
import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { PackingTemplateItem } from '../../api/model/packingTemplateItem';
import { Recipe } from '../../api/model/recipe';
import { RecipeIngredient } from '../../api/model/recipeIngredient';
import { ShoppingList } from '../../api/model/shoppingList';
import { ShoppingListCompleteResponse } from '../../api/model/shoppingListCompleteResponse';
import { ShoppingListItem } from '../../api/model/shoppingListItem';
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
import { AscentAttempt } from '../../api/model/ascentAttempt';
import { PitchLog } from '../../api/model/pitchLog';
import { SyncChangeItem } from '../../api/model/syncChangeItem';
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
import {
  calendarEventServerApplyTask,
  calendarEventTombstoneTask,
  exerciseServerApplyTask,
  exerciseTombstoneTask,
  foodServerApplyTask,
  foodTombstoneTask,
  gearItemServerApplyTask,
  gearItemTombstoneTask,
  householdRoomServerApplyTask,
  householdRoomTombstoneTask,
  householdTaskServerApplyTask,
  householdTaskTombstoneTask,
  lifePlanServerApplyTask,
  lifePlanTombstoneTask,
  mealItemServerApplyTask,
  mealItemTombstoneTask,
  mealServerApplyTask,
  mealTombstoneTask,
  packingSessionItemServerApplyTask,
  packingSessionItemTombstoneTask,
  packingSessionServerApplyTask,
  packingSessionTombstoneTask,
  packingTemplateItemServerApplyTask,
  packingTemplateItemTombstoneTask,
  packingTemplateServerApplyTask,
  packingTemplateTombstoneTask,
  profileServerApplyTask,
  profileTombstoneTask,
  recipeIngredientServerApplyTask,
  recipeIngredientTombstoneTask,
  recipeServerApplyTask,
  recipeTombstoneTask,
  shoppingListItemServerApplyTask,
  shoppingListItemTombstoneTask,
  shoppingListServerApplyTask,
  shoppingListTombstoneTask,
  storedFoodServerApplyTask,
  storedFoodTombstoneTask,
  swimLogServerApplyTask,
  swimLogTombstoneTask,
  bikeRideLogServerApplyTask,
  bikeRideLogTombstoneTask,
  recurringExpenseServerApplyTask,
  recurringExpenseTombstoneTask,
  aycmPartnerServerApplyTask,
  aycmPartnerTombstoneTask,
  aycmPriceRuleServerApplyTask,
  aycmPriceRuleTombstoneTask,
  aycmCheckInServerApplyTask,
  aycmCheckInTombstoneTask,
  aycmSettingsServerApplyTask,
  aycmSettingsTombstoneTask,
  gymServerApplyTask,
  gymTombstoneTask,
  gymColorBandServerApplyTask,
  gymColorBandTombstoneTask,
  indoorRouteServerApplyTask,
  indoorRouteTombstoneTask,
  cragServerApplyTask,
  cragTombstoneTask,
  sectorServerApplyTask,
  sectorTombstoneTask,
  routeServerApplyTask,
  routeTombstoneTask,
  boulderProblemServerApplyTask,
  boulderProblemTombstoneTask,
  climbingSessionServerApplyTask,
  climbingSessionTombstoneTask,
  ascentAttemptServerApplyTask,
  ascentAttemptTombstoneTask,
  pitchLogServerApplyTask,
  pitchLogTombstoneTask,
  weeklyPlanServerApplyTask,
  weeklyPlanSlotServerApplyTask,
  weeklyPlanSlotTombstoneTask,
  weeklyPlanTombstoneTask,
  weightHistoryServerApplyTask,
  weightHistoryTombstoneTask,
  workoutExerciseEntryServerApplyTask,
  workoutExerciseEntryTombstoneTask,
  workoutPlanExerciseServerApplyTask,
  workoutPlanExerciseTombstoneTask,
  workoutPlanServerApplyTask,
  workoutPlanSetServerApplyTask,
  workoutPlanSetTombstoneTask,
  workoutPlanTombstoneTask,
  workoutSessionServerApplyTask,
  workoutSessionTombstoneTask,
  workoutSetEntryServerApplyTask,
  workoutSetEntryTombstoneTask,
} from '../data/local-rows';
import { AuthSessionService } from '../session/auth-session.service';
import { LocalDatabaseService, SqlTask } from '../storage/local-database.service';
import { ConnectionState } from './connection-state';
import { DataChangeNotifier } from './data-change-notifier';
import { OfflineQueueService } from './offline-queue.service';
import { OutboxItem } from './outbox-item';
import { migrateOutboxItem } from './outbox-migrator';

const HEALTH_PROBE_TIMEOUT_MS = 3000;
const RECONNECT_BACKOFF_MS = [15000, 30000, 60000, 300000];
const MUTATION_DRAIN_DEBOUNCE_MS = 1000;

type DrainOutcome = 'success' | 'continue' | 'stop-network' | 'stop-auth';

/**
 * documentation/Architektúra/Backend-offline first.md §6/§8: drain (outbox replay) then pull
 * (delta sync). Orchestration only — outbox CRUD lives in OfflineQueueService, the generated
 * OpenAPI client is this service's only business consumer (documentation/Architektúra/Frontend.md).
 */
@Injectable({ providedIn: 'root' })
export class SyncEngineService {
  private readonly http = inject(HttpClient);
  private readonly healthApi = inject(HealthService);
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
  private readonly aycmPartnersApi = inject(AycmPartnersService);
  private readonly aycmPriceRulesApi = inject(AycmPriceRulesService);
  private readonly aycmCheckInsApi = inject(AycmCheckInsService);
  private readonly aycmSettingsApi = inject(AycmSettingsService);
  private readonly gymsApi = inject(ClimbingGymsService);
  private readonly gymColorBandsApi = inject(ClimbingGymColorBandsService);
  private readonly indoorRoutesApi = inject(ClimbingIndoorRoutesService);
  private readonly cragsApi = inject(ClimbingCragsService);
  private readonly sectorsApi = inject(ClimbingSectorsService);
  private readonly routesApi = inject(ClimbingRoutesService);
  private readonly boulderProblemsApi = inject(ClimbingBoulderProblemsService);
  private readonly climbingSessionsApi = inject(ClimbingSessionsService);
  private readonly syncApi = inject(SyncService);
  private readonly authSession = inject(AuthSessionService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly db = inject(LocalDatabaseService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly connectionState = signal<ConnectionState>('UNKNOWN');
  /** For SyncStatusButton's "forgó ikon" state (documentation/Architektúra/Backend-offline first.md §16). */
  readonly draining = signal(false);
  /**
   * documentation/Features/Szinkronizációs központ.md fejléc: "utolsó sikeres szinkronizálás ideje".
   * Backed by `sync_state.last_pull_at` (server clock, `serverTime`) — loaded at `init()` so it
   * survives across app restarts, then refreshed after every completed `pull()`.
   */
  readonly lastSuccessfulSyncAt = signal<string | null>(null);
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private startedForUserId: string | null = null;
  private drainDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cold start step 6 — never awaited by the caller; nothing here may block first render. */
  async init(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const rows = await this.db.query<{ last_pull_at: string | null }>('SELECT last_pull_at FROM sync_state WHERE id = 1');
      this.lastSuccessfulSyncAt.set(rows[0]?.last_pull_at ?? null);
    }
    void Network.addListener('networkStatusChange', (status) => {
      if (!status.connected) {
        this.clearReconnectTimer();
        this.connectionState.set('FULL_OFFLINE');
      } else {
        void this.probeAndSync();
      }
    });
    void App.addListener('resume', () => void this.probeAndSync());
    void this.probeAndSync();
  }

  /** Non-blocking, immediate kick — login, manual "Sync now", reconnect, app resume/start. */
  requestDrain(): void {
    void this.probeAndSync();
  }

  /**
   * documentation/Architektúra/Backend-offline first.md §6 trigger list: "minden user-mutáció
   * után (debounce ~1 s)". Repositories call this (not requestDrain()) after writes, so several
   * saves in quick succession — e.g. a profile save that also opens a weight-history row —
   * collapse into a single probe+drain instead of one health-check per write.
   */
  requestDrainDebounced(): void {
    if (this.drainDebounceTimer !== null) {
      clearTimeout(this.drainDebounceTimer);
    }
    this.drainDebounceTimer = setTimeout(() => {
      this.drainDebounceTimer = null;
      void this.probeAndSync();
    }, MUTATION_DRAIN_DEBOUNCE_MS);
  }

  private async probeAndSync(): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      return;
    }
    // documentation/Architektúra/Frontend.md: web is online-only — no outbox, no local store, so
    // there is nothing for drain()/pull() to touch. The connection-state probe below still runs
    // on web too (SyncStatusButton shows it there, minus the pending/error counts).
    const nativeSyncEnabled = Capacitor.isNativePlatform();

    if (nativeSyncEnabled && this.startedForUserId !== userId) {
      this.startedForUserId = userId;
      await this.offlineQueue.resetSendingToPending(userId);
    }

    const reachable = await this.probeBackend();
    const wasOnline = this.connectionState() === 'ONLINE';
    if (!reachable) {
      const online = (await Network.getStatus()).connected;
      this.connectionState.set(online ? 'BACKEND_OFFLINE' : 'FULL_OFFLINE');
      this.scheduleReconnectProbe();
      return;
    }
    this.clearReconnectTimer();
    this.connectionState.set('ONLINE');

    if (!nativeSyncEnabled) {
      return;
    }
    const didDrain = await this.drain(userId);
    if (didDrain || !wasOnline) {
      await this.pull(userId);
    }
    await this.refetchNeeded();
  }

  /** §6 "Kézi beavatkozás" Drop table: `_needs_refetch = 1` rows need a targeted GET, delta pull is not enough. */
  private async refetchNeeded(): Promise<void> {
    const staleProfiles = await this.db.query<{ id: string }>('SELECT id FROM user_profile WHERE _needs_refetch = 1');
    if (staleProfiles.length > 0) {
      try {
        const dto = await firstValueFrom(this.profileApi.getProfile());
        await this.db.executeTransaction([profileServerApplyTask(dto)]);
      } catch {
        // 404 (never saved server-side) or transient failure: leave the flag set, retried next cycle.
      }
    }

    const staleEntries = await this.db.query<{ id: string }>('SELECT id FROM weight_history_entry WHERE _needs_refetch = 1');
    for (const row of staleEntries) {
      try {
        const dto = await firstValueFrom(this.profileApi.getWeightHistoryEntry(row.id));
        await this.db.executeTransaction([weightHistoryServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleGearItems = await this.db.query<{ id: string }>('SELECT id FROM gear_item WHERE _needs_refetch = 1');
    for (const row of staleGearItems) {
      try {
        const dto = await firstValueFrom(this.gearApi.getGearItem(row.id));
        await this.db.executeTransaction([gearItemServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleTemplates = await this.db.query<{ id: string }>('SELECT id FROM packing_template WHERE _needs_refetch = 1');
    for (const row of staleTemplates) {
      try {
        const dto = await firstValueFrom(this.packingTemplatesApi.getPackingTemplate(row.id));
        await this.db.executeTransaction(this.packingTemplateApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleSessions = await this.db.query<{ id: string }>('SELECT id FROM packing_session WHERE _needs_refetch = 1');
    for (const row of staleSessions) {
      try {
        const dto = await firstValueFrom(this.packingSessionsApi.getPackingSession(row.id));
        await this.db.executeTransaction(this.packingSessionApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleSessionItems = await this.db.query<{ id: string }>('SELECT id FROM packing_session_item WHERE _needs_refetch = 1');
    for (const row of staleSessionItems) {
      try {
        const dto = await firstValueFrom(this.packingSessionItemsApi.getPackingSessionItem(row.id));
        await this.db.executeTransaction([packingSessionItemServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleLifePlans = await this.db.query<{ id: string }>('SELECT id FROM life_plan WHERE _needs_refetch = 1');
    for (const row of staleLifePlans) {
      try {
        const dto = await firstValueFrom(this.lifePlansApi.getLifePlan(row.id));
        await this.db.executeTransaction([lifePlanServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleSwimLogs = await this.db.query<{ id: string }>('SELECT id FROM swim_log WHERE _needs_refetch = 1');
    for (const row of staleSwimLogs) {
      try {
        const dto = await firstValueFrom(this.swimLogsApi.getSwimLog(row.id));
        await this.db.executeTransaction([swimLogServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleBikeRideLogs = await this.db.query<{ id: string }>('SELECT id FROM bike_ride_log WHERE _needs_refetch = 1');
    for (const row of staleBikeRideLogs) {
      try {
        const dto = await firstValueFrom(this.bikeRideLogsApi.getBikeRideLog(row.id));
        await this.db.executeTransaction([bikeRideLogServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleRecurringExpenses = await this.db.query<{ id: string }>(
      'SELECT id FROM recurring_expense WHERE _needs_refetch = 1',
    );
    for (const row of staleRecurringExpenses) {
      try {
        const dto = await firstValueFrom(this.recurringExpensesApi.getRecurringExpense(row.id));
        await this.db.executeTransaction([recurringExpenseServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleAycmPartners = await this.db.query<{ id: string }>(
      'SELECT id FROM aycm_partner WHERE _needs_refetch = 1',
    );
    for (const row of staleAycmPartners) {
      try {
        const dto = await firstValueFrom(this.aycmPartnersApi.getAycmPartner(row.id));
        await this.db.executeTransaction([aycmPartnerServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleAycmPriceRules = await this.db.query<{ id: string; partner_id: string }>(
      'SELECT id, partner_id FROM aycm_price_rule WHERE _needs_refetch = 1',
    );
    for (const row of staleAycmPriceRules) {
      try {
        const dto = await firstValueFrom(this.aycmPriceRulesApi.getAycmPriceRule(row.partner_id, row.id));
        await this.db.executeTransaction([aycmPriceRuleServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleAycmCheckIns = await this.db.query<{ id: string }>(
      'SELECT id FROM aycm_check_in WHERE _needs_refetch = 1',
    );
    for (const row of staleAycmCheckIns) {
      try {
        const dto = await firstValueFrom(this.aycmCheckInsApi.getAycmCheckIn(row.id));
        await this.db.executeTransaction([aycmCheckInServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleAycmSettings = await this.db.query<{ id: string }>(
      'SELECT id FROM aycm_settings WHERE _needs_refetch = 1',
    );
    if (staleAycmSettings.length > 0) {
      try {
        const dto = await firstValueFrom(this.aycmSettingsApi.getAycmSettings());
        await this.db.executeTransaction([aycmSettingsServerApplyTask(dto)]);
      } catch {
        // transient failure: leave the flag set, retried next cycle.
      }
    }

    const staleGyms = await this.db.query<{ id: string }>('SELECT id FROM gym WHERE _needs_refetch = 1');
    for (const row of staleGyms) {
      try {
        const dto = await firstValueFrom(this.gymsApi.getClimbingGym(row.id));
        await this.db.executeTransaction([gymServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleGymColorBands = await this.db.query<{ id: string }>('SELECT id FROM gym_color_band WHERE _needs_refetch = 1');
    for (const row of staleGymColorBands) {
      try {
        const dto = await firstValueFrom(this.gymColorBandsApi.getClimbingGymColorBand(row.id));
        await this.db.executeTransaction([gymColorBandServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleIndoorRoutes = await this.db.query<{ id: string }>('SELECT id FROM indoor_route WHERE _needs_refetch = 1');
    for (const row of staleIndoorRoutes) {
      try {
        const dto = await firstValueFrom(this.indoorRoutesApi.getClimbingIndoorRoute(row.id));
        await this.db.executeTransaction([indoorRouteServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleCrags = await this.db.query<{ id: string }>('SELECT id FROM crag WHERE _needs_refetch = 1');
    for (const row of staleCrags) {
      try {
        const dto = await firstValueFrom(this.cragsApi.getClimbingCrag(row.id));
        await this.db.executeTransaction([cragServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleSectors = await this.db.query<{ id: string }>('SELECT id FROM sector WHERE _needs_refetch = 1');
    for (const row of staleSectors) {
      try {
        const dto = await firstValueFrom(this.sectorsApi.getClimbingSector(row.id));
        await this.db.executeTransaction([sectorServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleRoutes = await this.db.query<{ id: string }>('SELECT id FROM route WHERE _needs_refetch = 1');
    for (const row of staleRoutes) {
      try {
        const dto = await firstValueFrom(this.routesApi.getClimbingRoute(row.id));
        await this.db.executeTransaction([routeServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleBoulderProblems = await this.db.query<{ id: string }>('SELECT id FROM boulder_problem WHERE _needs_refetch = 1');
    for (const row of staleBoulderProblems) {
      try {
        const dto = await firstValueFrom(this.boulderProblemsApi.getClimbingBoulderProblem(row.id));
        await this.db.executeTransaction([boulderProblemServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleExercises = await this.db.query<{ id: string }>('SELECT id FROM exercise_catalog WHERE _needs_refetch = 1');
    for (const row of staleExercises) {
      try {
        const dto = await firstValueFrom(this.exercisesApi.getExercise(row.id));
        await this.db.executeTransaction([exerciseServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleRooms = await this.db.query<{ id: string }>('SELECT id FROM household_room WHERE _needs_refetch = 1');
    for (const row of staleRooms) {
      try {
        const dto = await firstValueFrom(this.householdRoomsApi.getHouseholdRoom(row.id));
        await this.db.executeTransaction([householdRoomServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleTasks = await this.db.query<{ id: string }>('SELECT id FROM household_task WHERE _needs_refetch = 1');
    for (const row of staleTasks) {
      try {
        const dto = await firstValueFrom(this.householdTasksApi.getHouseholdTask(row.id));
        await this.db.executeTransaction([householdTaskServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleEvents = await this.db.query<{ id: string }>('SELECT id FROM calendar_event WHERE _needs_refetch = 1');
    for (const row of staleEvents) {
      try {
        const dto = await firstValueFrom(this.eventsApi.getEvent(row.id));
        await this.db.executeTransaction([calendarEventServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleFoods = await this.db.query<{ id: string }>('SELECT id FROM food WHERE _needs_refetch = 1');
    for (const row of staleFoods) {
      try {
        const dto = await firstValueFrom(this.foodsApi.getFood(row.id));
        await this.db.executeTransaction([foodServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleStoredFoods = await this.db.query<{ id: string }>('SELECT id FROM stored_food WHERE _needs_refetch = 1');
    for (const row of staleStoredFoods) {
      try {
        const dto = await firstValueFrom(this.storedFoodsApi.getStoredFood(row.id));
        await this.db.executeTransaction([storedFoodServerApplyTask(dto)]);
      } catch {
        // same as above
      }
    }

    const staleRecipes = await this.db.query<{ id: string }>('SELECT id FROM recipe WHERE _needs_refetch = 1');
    for (const row of staleRecipes) {
      try {
        const dto = await firstValueFrom(this.recipesApi.getRecipe(row.id));
        await this.db.executeTransaction(this.recipeApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleMeals = await this.db.query<{ id: string }>('SELECT id FROM meal WHERE _needs_refetch = 1');
    for (const row of staleMeals) {
      try {
        const dto = await firstValueFrom(this.mealsApi.getMeal(row.id));
        await this.db.executeTransaction(this.mealApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleShoppingLists = await this.db.query<{ id: string }>('SELECT id FROM shopping_list WHERE _needs_refetch = 1');
    for (const row of staleShoppingLists) {
      try {
        const dto = await firstValueFrom(this.shoppingListsApi.getShoppingList(row.id));
        await this.db.executeTransaction(this.shoppingListApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleWorkoutSessions = await this.db.query<{ id: string }>('SELECT id FROM workout_session WHERE _needs_refetch = 1');
    for (const row of staleWorkoutSessions) {
      try {
        const dto = await firstValueFrom(this.workoutSessionsApi.getWorkoutSession(row.id));
        await this.db.executeTransaction(this.workoutSessionApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleClimbingSessions = await this.db.query<{ id: string }>('SELECT id FROM climbing_session WHERE _needs_refetch = 1');
    for (const row of staleClimbingSessions) {
      try {
        const dto = await firstValueFrom(this.climbingSessionsApi.getClimbingSession(row.id));
        await this.db.executeTransaction(this.climbingSessionApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleWorkoutPlans = await this.db.query<{ id: string }>('SELECT id FROM workout_plan WHERE _needs_refetch = 1');
    for (const row of staleWorkoutPlans) {
      try {
        const dto = await firstValueFrom(this.workoutPlansApi.getWorkoutPlan(row.id));
        await this.db.executeTransaction(this.workoutPlanApplyTasks(dto));
      } catch {
        // same as above
      }
    }

    const staleWeeklyPlans = await this.db.query<{ id: string }>('SELECT id FROM weekly_plan WHERE _needs_refetch = 1');
    for (const row of staleWeeklyPlans) {
      try {
        const dto = await firstValueFrom(this.weeklyPlansApi.getWeeklyPlan(row.id));
        await this.db.executeTransaction(this.weeklyPlanApplyTasks(dto));
      } catch {
        // same as above
      }
    }
  }

  private async probeBackend(): Promise<boolean> {
    try {
      await firstValueFrom(this.healthApi.getHealth().pipe(timeout(HEALTH_PROBE_TIMEOUT_MS)));
      return true;
    } catch {
      return false;
    }
  }

  private scheduleReconnectProbe(): void {
    if (this.reconnectTimer !== null) {
      return;
    }
    const delay = RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.probeAndSync();
    }, delay);
  }

  private clearReconnectTimer(): void {
    this.reconnectAttempt = 0;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** @returns whether at least one item was successfully sent (callers use this to decide whether a pull is owed). */
  private async drain(userId: string): Promise<boolean> {
    if (this.draining()) {
      return false;
    }
    this.draining.set(true);
    let ranAny = false;
    try {
      await this.offlineQueue.recomputeBlocked(userId);
      const runnable = await this.offlineQueue.listRunnable(userId);
      for (const item of runnable) {
        const outcome = await this.migrateThenExecute(item);
        if (outcome === 'success') {
          ranAny = true;
        }
        if (outcome === 'stop-network' || outcome === 'stop-auth') {
          break;
        }
      }
    } finally {
      this.draining.set(false);
    }
    await this.offlineQueue.refreshCounts(userId);
    return ranAny;
  }

  /**
   * documentation/Architektúra/Backend-offline first.md §7: before an item is drained, walk any
   * outdated `payloadVersion` through the `OutboxMigrator` step chain. A missing step is not a
   * network/auth condition, so it does not stop the drain loop — it only fails this one item.
   */
  private async migrateThenExecute(item: OutboxItem): Promise<DrainOutcome> {
    const migration = migrateOutboxItem(item);
    if (migration.errorMessage !== null) {
      await this.offlineQueue.markError(item.id, null, 'PAYLOAD_MIGRATION_FAILED', migration.errorMessage);
      return 'continue';
    }
    if (!migration.migrated) {
      return this.executeOutboxItem(item);
    }
    await this.offlineQueue.applyMigration(item.id, migration.payload, migration.url, migration.payloadVersion);
    return this.executeOutboxItem({ ...item, payload: migration.payload, url: migration.url, payloadVersion: migration.payloadVersion });
  }

  private async executeOutboxItem(item: OutboxItem): Promise<DrainOutcome> {
    await this.offlineQueue.markSending(item.id);
    try {
      const body = await firstValueFrom(
        this.http.request(item.method, item.url, {
          body: item.method === 'DELETE' ? undefined : item.payload,
          headers: { 'Idempotency-Key': item.id },
        }),
      );
      await this.db.executeTransaction(this.buildServerApplyTasks(item, body));
      await this.offlineQueue.removeItem(item.id);
      return 'success';
    } catch (error) {
      return this.classifyAndHandle(item, error);
    }
  }

  private async classifyAndHandle(item: OutboxItem, error: unknown): Promise<DrainOutcome> {
    if (!(error instanceof HttpErrorResponse) || error.status === 0) {
      return 'stop-network';
    }
    if (error.status === 401) {
      await this.authSession.clear();
      return 'stop-auth';
    }

    const apiError = error.error as ApiError | undefined;

    if (error.status === 404 && item.method === 'DELETE') {
      await this.applyTombstone(item);
      await this.offlineQueue.removeItem(item.id);
      return 'success';
    }
    if (error.status === 409 && apiError?.code === 'ENTITY_DELETED') {
      await this.applyTombstone(item);
      await this.offlineQueue.removeItem(item.id);
      return 'continue';
    }
    if (error.status === 408 || error.status === 429 || error.status >= 500) {
      const attemptCount = item.attemptCount + 1;
      if (attemptCount < 5) {
        await this.offlineQueue.scheduleRetry(item.id, attemptCount);
        return 'continue';
      }
    }

    await this.offlineQueue.markError(item.id, error.status, apiError?.code ?? null, apiError?.message ?? error.message, apiError?.field ?? null);
    return 'continue';
  }

  private buildServerApplyTasks(item: OutboxItem, body: unknown): SqlTask[] {
    if (item.entityType === 'UserProfile') {
      return [profileServerApplyTask(body as UserProfile)];
    }
    if (item.entityType === 'WeightHistoryEntry') {
      return [weightHistoryServerApplyTask(body as WeightHistoryEntry)];
    }
    if (item.entityType === 'GearItem') {
      return [gearItemServerApplyTask(body as GearItem)];
    }
    if (item.entityType === 'PackingTemplate') {
      return this.packingTemplateApplyTasks(body as PackingTemplateDetail);
    }
    if (item.entityType === 'PackingSession') {
      return this.packingSessionApplyTasks(body as PackingSession | PackingSessionDetail);
    }
    if (item.entityType === 'PackingSessionItem') {
      return [packingSessionItemServerApplyTask(body as PackingSessionItem)];
    }
    if (item.entityType === 'LifePlan') {
      return [lifePlanServerApplyTask(body as LifePlan)];
    }
    if (item.entityType === 'SwimLog') {
      return [swimLogServerApplyTask(body as SwimLog)];
    }
    if (item.entityType === 'BikeRideLog') {
      return [bikeRideLogServerApplyTask(body as BikeRideLog)];
    }
    if (item.entityType === 'RecurringExpense') {
      return [recurringExpenseServerApplyTask(body as RecurringExpense)];
    }
    if (item.entityType === 'AycmPartner') {
      return [aycmPartnerServerApplyTask(body as AycmPartner)];
    }
    if (item.entityType === 'AycmPriceRule') {
      return [aycmPriceRuleServerApplyTask(body as AycmPriceRule)];
    }
    if (item.entityType === 'AycmCheckIn') {
      return [aycmCheckInServerApplyTask(body as AycmCheckIn)];
    }
    if (item.entityType === 'AycmSettings') {
      return [aycmSettingsServerApplyTask(body as AycmSettings)];
    }
    if (item.entityType === 'Gym') {
      return [gymServerApplyTask(body as Gym)];
    }
    if (item.entityType === 'GymColorBand') {
      return [gymColorBandServerApplyTask(body as GymColorBand)];
    }
    if (item.entityType === 'IndoorRoute') {
      return [indoorRouteServerApplyTask(body as IndoorRoute)];
    }
    if (item.entityType === 'Crag') {
      return [cragServerApplyTask(body as Crag)];
    }
    if (item.entityType === 'Sector') {
      return [sectorServerApplyTask(body as Sector)];
    }
    if (item.entityType === 'Route') {
      return [routeServerApplyTask(body as Route)];
    }
    if (item.entityType === 'BoulderProblem') {
      return [boulderProblemServerApplyTask(body as BoulderProblem)];
    }
    if (item.entityType === 'Exercise') {
      return [exerciseServerApplyTask(body as Exercise)];
    }
    if (item.entityType === 'HouseholdRoom') {
      return [householdRoomServerApplyTask(body as HouseholdRoom)];
    }
    if (item.entityType === 'HouseholdTask') {
      return [householdTaskServerApplyTask(body as HouseholdTask)];
    }
    if (item.entityType === 'CalendarEvent') {
      return [calendarEventServerApplyTask(body as CalendarEvent)];
    }
    if (item.entityType === 'Food') {
      return [foodServerApplyTask(body as Food)];
    }
    if (item.entityType === 'StoredFood') {
      return [storedFoodServerApplyTask(body as StoredFood)];
    }
    if (item.entityType === 'Recipe') {
      return this.recipeApplyTasks(body as Recipe);
    }
    if (item.entityType === 'Meal') {
      return this.mealApplyTasks(body as Meal);
    }
    if (item.entityType === 'ShoppingList') {
      return this.shoppingListApplyTasks(body as ShoppingList);
    }
    if (item.entityType === 'WorkoutSession') {
      return this.workoutSessionApplyTasks(body as WorkoutSession);
    }
    if (item.entityType === 'ClimbingSession') {
      return this.climbingSessionApplyTasks(body as ClimbingSession);
    }
    if (item.entityType === 'WorkoutPlan') {
      return this.workoutPlanApplyTasks(body as WorkoutPlan);
    }
    if (item.entityType === 'WeeklyPlan') {
      return this.weeklyPlanApplyTasks(body as WeeklyPlan);
    }
    if (item.entityType === 'ShoppingListComplete') {
      return this.shoppingListCompleteApplyTasks(item, body as ShoppingListCompleteResponse);
    }
    throw new Error(`SyncEngine: no local writer for entityType "${item.entityType}"`);
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every item row
   * (live or tombstoned — PackingTemplateDetail.yaml), which this applies as authoritative so each
   * one's local `_dirty`/`_local_only` flags clear too — items never get their own outbox entry, so
   * nothing else would ever clear them (§8's `_dirty=1` apply rule otherwise keeps the pending value
   * forever). The subsequent mandatory post-drain pull (§6 point 9) still independently confirms
   * every row and catches anything this device didn't know about (e.g. a concurrent cascade).
   */
  private packingTemplateApplyTasks(dto: PackingTemplateDetail): SqlTask[] {
    return [packingTemplateServerApplyTask(dto), ...dto.items.map((item: PackingTemplateItem) => packingTemplateItemServerApplyTask(item))];
  }

  /**
   * documentation/Subfeatures/Pakolás.md: unlike PackingTemplate, `PackingSession` covers two
   * different outbox response shapes under the same entityType — the nested "Indítás" create
   * (`PackingSessionDetail`, with `items`) and the plain destination-only update (`PackingSession`,
   * no `items`) — so the item rows are only applied when the response actually carries them.
   */
  private packingSessionApplyTasks(dto: PackingSession | PackingSessionDetail): SqlTask[] {
    const tasks: SqlTask[] = [packingSessionServerApplyTask(dto)];
    if ('items' in dto) {
      tasks.push(...dto.items.map((item: PackingSessionItem) => packingSessionItemServerApplyTask(item)));
    }
    return tasks;
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every
   * ingredient row (live or tombstoned — Recipe.yaml), which this applies as authoritative so each
   * one's local `_dirty`/`_local_only` flags clear too — ingredients never get their own outbox
   * entry, so nothing else would ever clear them (§8's `_dirty=1` apply rule otherwise keeps the
   * pending value forever). The subsequent mandatory post-drain pull (§6 point 9) still
   * independently confirms every row and catches anything this device didn't know about.
   */
  private recipeApplyTasks(dto: Recipe): SqlTask[] {
    return [recipeServerApplyTask(dto), ...dto.ingredients.map((ingredient: RecipeIngredient) => recipeIngredientServerApplyTask(ingredient))];
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every item row
   * (live or tombstoned — Meal.yaml), which this applies as authoritative so each one's local
   * `_dirty`/`_local_only` flags clear too — items never get their own outbox entry, so nothing else
   * would ever clear them (§8's `_dirty=1` apply rule otherwise keeps the pending value forever).
   */
  private mealApplyTasks(dto: Meal): SqlTask[] {
    return [mealServerApplyTask(dto), ...dto.items.map((item: MealItem) => mealItemServerApplyTask(item))];
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every item row
   * (live or tombstoned — ShoppingList.yaml), which this applies as authoritative so each one's
   * local `_dirty`/`_local_only` flags clear too — items never get their own outbox entry, so
   * nothing else would ever clear them (§8's `_dirty=1` apply rule otherwise keeps the pending value
   * forever).
   */
  private shoppingListApplyTasks(dto: ShoppingList): SqlTask[] {
    return [shoppingListServerApplyTask(dto), ...dto.items.map((item: ShoppingListItem) => shoppingListItemServerApplyTask(item))];
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every exercise
   * entry and set row (live or tombstoned — WorkoutSession.yaml), applied as authoritative so each
   * one's local `_dirty`/`_local_only` flags clear too — the child rows never get their own outbox
   * entry, so nothing else would ever clear them (§8's `_dirty=1` apply rule otherwise keeps the
   * pending value forever). The mandatory post-drain pull (§6 point 9) still independently confirms.
   */
  private workoutSessionApplyTasks(dto: WorkoutSession): SqlTask[] {
    const tasks: SqlTask[] = [workoutSessionServerApplyTask(dto)];
    for (const exercise of dto.exercises as WorkoutExerciseEntry[]) {
      tasks.push(workoutExerciseEntryServerApplyTask(exercise));
      for (const set of exercise.sets as WorkoutSetEntry[]) {
        tasks.push(workoutSetEntryServerApplyTask(set));
      }
    }
    return tasks;
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every ascent
   * attempt and pitch row (live or tombstoned — ClimbingSession.yaml), applied as authoritative so
   * each one's local `_dirty`/`_local_only` flags clear too — the child rows never get their own
   * outbox entry, so nothing else would ever clear them (§8's `_dirty=1` apply rule otherwise keeps
   * the pending value forever). The mandatory post-drain pull (§6 point 9) still independently confirms.
   */
  private climbingSessionApplyTasks(dto: ClimbingSession): SqlTask[] {
    const tasks: SqlTask[] = [climbingSessionServerApplyTask(dto)];
    for (const attempt of dto.attempts as AscentAttempt[]) {
      tasks.push(ascentAttemptServerApplyTask(attempt));
      for (const pitch of attempt.pitches as PitchLog[]) {
        tasks.push(pitchLogServerApplyTask(pitch));
      }
    }
    return tasks;
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every exercise
   * line and target-set row (live or tombstoned — WorkoutPlan.yaml), applied as authoritative so each
   * one's local `_dirty`/`_local_only` flags clear too — the child rows never get their own outbox
   * entry. The mandatory post-drain pull (§6 point 9) still independently confirms.
   */
  private workoutPlanApplyTasks(dto: WorkoutPlan): SqlTask[] {
    const tasks: SqlTask[] = [workoutPlanServerApplyTask(dto)];
    for (const exercise of dto.exercises as WorkoutPlanExercise[]) {
      tasks.push(workoutPlanExerciseServerApplyTask(exercise));
      for (const set of exercise.targetSets as WorkoutPlanSet[]) {
        tasks.push(workoutPlanSetServerApplyTask(set));
      }
    }
    return tasks;
  }

  /** documentation/Architektúra/Backend.md "Nested aggregate PUT": the response lists every slot row (live or tombstoned — WeeklyPlan.yaml), applied as authoritative. */
  private weeklyPlanApplyTasks(dto: WeeklyPlan): SqlTask[] {
    return [weeklyPlanServerApplyTask(dto), ...dto.slots.map((slot: WeeklyPlanSlot) => weeklyPlanSlotServerApplyTask(slot))];
  }

  /**
   * documentation/Subfeatures/Bevásárlás teljesítve.md: every row this action touches was already
   * written locally with the exact final values *before* the request was sent (local-first — the
   * client resolves storage location/expiry/split-count itself, the same way the server would), so
   * there's nothing to re-apply beyond clearing `_dirty`/`_local_only` on exactly the rows named in
   * the request payload: the archived list and its own items, the created StoredFood rows, and the
   * spun-off list plus each of its items *by id* (not a blanket `WHERE shopping_list_id = ?`, which
   * would also wrongly clear an item the user added to that new list between the local write and this
   * drain). The mandatory post-drain pull (§6 point 9) still independently confirms everything.
   */
  private shoppingListCompleteApplyTasks(item: OutboxItem, response: ShoppingListCompleteResponse): SqlTask[] {
    const payload = (item.payload ?? {}) as {
      checkedFoodEntries?: { storageEntryIds?: string[] }[];
      newActiveList?: { id?: string; items?: { id?: string }[] } | null;
    };
    const tasks: SqlTask[] = [
      clearDirtyFlagsTask('shopping_list', response.archivedListId),
      {
        statement: `UPDATE shopping_list_item SET _dirty = 0, _local_only = 0 WHERE shopping_list_id = ?`,
        values: [response.archivedListId],
      },
    ];
    for (const storageEntryId of response.createdStorageEntryIds) {
      tasks.push(clearDirtyFlagsTask('stored_food', storageEntryId));
    }
    const newActiveList = payload.newActiveList;
    if (response.newActiveListId && newActiveList?.id === response.newActiveListId) {
      tasks.push(clearDirtyFlagsTask('shopping_list', response.newActiveListId));
      for (const newItem of newActiveList.items ?? []) {
        if (newItem.id) {
          tasks.push(clearDirtyFlagsTask('shopping_list_item', newItem.id));
        }
      }
    }
    return tasks;
  }

  private async applyTombstone(item: OutboxItem): Promise<void> {
    const now = new Date().toISOString();
    if (item.entityType === 'UserProfile') {
      await this.db.executeTransaction([profileTombstoneTask(item.targetEntityId, now)]);
    } else if (item.entityType === 'WeightHistoryEntry') {
      await this.db.executeTransaction([weightHistoryTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'GearItem') {
      await this.db.executeTransaction([gearItemTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'PackingTemplate') {
      // documentation/Subfeatures/Sablonok.md: template delete cascades to its own items locally too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM packing_template_item WHERE template_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        packingTemplateTombstoneTask(item.targetEntityId, null, now),
        ...itemRows.map((row) => packingTemplateItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'PackingSession') {
      // documentation/Subfeatures/Pakolás.md: "Lezárás" cascades to the session's own items locally too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM packing_session_item WHERE session_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        packingSessionTombstoneTask(item.targetEntityId, null, now),
        ...itemRows.map((row) => packingSessionItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'PackingSessionItem') {
      await this.db.executeTransaction([packingSessionItemTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'LifePlan') {
      await this.db.executeTransaction([lifePlanTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'SwimLog') {
      await this.db.executeTransaction([swimLogTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'BikeRideLog') {
      await this.db.executeTransaction([bikeRideLogTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'RecurringExpense') {
      await this.db.executeTransaction([recurringExpenseTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'AycmPartner') {
      // documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md: partner delete cascades to its own
      // price rules locally too (the server cascades server-side). Those rows carry no outbox entry,
      // so — like HouseholdRoom→tasks — their `_dirty` must be cleared here; otherwise a `Drop` in
      // the sync center (no follow-up pull) leaves them `_dirty=1` forever and `aycmPriceRule`
      // server-apply's `WHERE _dirty = 0` guard blocks every future update to them.
      const ruleRows = await this.db.query<{ id: string }>('SELECT id FROM aycm_price_rule WHERE partner_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        aycmPartnerTombstoneTask(item.targetEntityId, null, now),
        ...ruleRows.map((row) => aycmPriceRuleTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'AycmPriceRule') {
      await this.db.executeTransaction([aycmPriceRuleTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'AycmCheckIn') {
      await this.db.executeTransaction([aycmCheckInTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'AycmSettings') {
      await this.db.executeTransaction([aycmSettingsTombstoneTask(item.targetEntityId, now)]);
    } else if (item.entityType === 'Gym') {
      // documentation/Subfeatures/Indoor boulder admin.md "Soft delete": no cascade — a deleted gym's
      // colour bands / indoor routes keep their own rows and tombstones.
      await this.db.executeTransaction([gymTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'GymColorBand') {
      await this.db.executeTransaction([gymColorBandTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'IndoorRoute') {
      await this.db.executeTransaction([indoorRouteTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Crag') {
      // documentation/Subfeatures/Outdoor boulder admin.md "Soft delete": no cascade — a deleted
      // crag's sectors / routes / boulder problems keep their own rows and tombstones.
      await this.db.executeTransaction([cragTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Sector') {
      await this.db.executeTransaction([sectorTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Route') {
      await this.db.executeTransaction([routeTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'BoulderProblem') {
      await this.db.executeTransaction([boulderProblemTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Exercise') {
      await this.db.executeTransaction([exerciseTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'HouseholdRoom') {
      // documentation/Subfeatures/Háztartási feladatok.md: room delete cascades to its own tasks locally too.
      const taskRows = await this.db.query<{ id: string }>('SELECT id FROM household_task WHERE room_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        householdRoomTombstoneTask(item.targetEntityId, null, now),
        ...taskRows.map((row) => householdTaskTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'HouseholdTask') {
      await this.db.executeTransaction([householdTaskTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'CalendarEvent') {
      await this.db.executeTransaction([calendarEventTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Food') {
      // documentation/Subfeatures/Élelmiszerek.md: Food delete cascades to its storage items, recipe ingredients, and shopping-list items locally too.
      const storedFoodRows = await this.db.query<{ id: string }>('SELECT id FROM stored_food WHERE food_id = ?', [item.targetEntityId]);
      const recipeIngredientRows = await this.db.query<{ id: string }>('SELECT id FROM recipe_ingredient WHERE food_id = ?', [item.targetEntityId]);
      const mealItemRows = await this.db.query<{ id: string }>(
        'SELECT id FROM meal_item WHERE food_id = ? AND deleted = 0',
        [item.targetEntityId],
      );
      const shoppingListItemRows = await this.db.query<{ id: string }>(
        'SELECT id FROM shopping_list_item WHERE food_id = ? AND deleted = 0',
        [item.targetEntityId],
      );
      await this.db.executeTransaction([
        foodTombstoneTask(item.targetEntityId, null, now),
        ...storedFoodRows.map((row) => storedFoodTombstoneTask(row.id, null, now)),
        ...recipeIngredientRows.map((row) => recipeIngredientTombstoneTask(row.id, null, now)),
        ...(await this.mealItemCascadeTombstoneTasks(mealItemRows, now)),
        ...shoppingListItemRows.map((row) => shoppingListItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'StoredFood') {
      await this.db.executeTransaction([storedFoodTombstoneTask(item.targetEntityId, null, now)]);
    } else if (item.entityType === 'Recipe') {
      // documentation/Subfeatures/Recept.md: recipe delete cascades to its own ingredients locally too.
      const ingredientRows = await this.db.query<{ id: string }>('SELECT id FROM recipe_ingredient WHERE recipe_id = ?', [item.targetEntityId]);
      const mealItemRows = await this.db.query<{ id: string }>(
        'SELECT id FROM meal_item WHERE recipe_id = ? AND deleted = 0',
        [item.targetEntityId],
      );
      await this.db.executeTransaction([
        recipeTombstoneTask(item.targetEntityId, null, now),
        ...ingredientRows.map((row) => recipeIngredientTombstoneTask(row.id, null, now)),
        ...(await this.mealItemCascadeTombstoneTasks(mealItemRows, now)),
      ]);
    } else if (item.entityType === 'Meal') {
      // documentation/Subfeatures/Étkezés.md: meal delete cascades to its own items locally too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM meal_item WHERE meal_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        mealTombstoneTask(item.targetEntityId, null, now),
        ...itemRows.map((row) => mealItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'ShoppingList') {
      // documentation/Subfeatures/Bevásárlólista írás.md: list delete cascades to its own items locally too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM shopping_list_item WHERE shopping_list_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        shoppingListTombstoneTask(item.targetEntityId, null, now),
        ...itemRows.map((row) => shoppingListItemTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'WorkoutSession') {
      // documentation/Subfeatures/Edzésnapló.md: session delete cascades to its own exercise entries and sets locally too.
      const exerciseRows = await this.db.query<{ id: string }>('SELECT id FROM workout_exercise_entry WHERE session_id = ?', [item.targetEntityId]);
      const setRows = await this.db.query<{ id: string }>(
        'SELECT s.id FROM workout_set_entry s JOIN workout_exercise_entry e ON s.exercise_entry_id = e.id WHERE e.session_id = ?',
        [item.targetEntityId],
      );
      await this.db.executeTransaction([
        workoutSessionTombstoneTask(item.targetEntityId, null, now),
        ...exerciseRows.map((row) => workoutExerciseEntryTombstoneTask(row.id, null, now)),
        ...setRows.map((row) => workoutSetEntryTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'ClimbingSession') {
      // documentation/Features/Mászónapló.md: session delete cascades to its own attempts and pitches locally too.
      const attemptRows = await this.db.query<{ id: string }>('SELECT id FROM ascent_attempt WHERE session_id = ?', [item.targetEntityId]);
      const pitchRows = await this.db.query<{ id: string }>(
        'SELECT p.id FROM pitch_log p JOIN ascent_attempt a ON p.attempt_id = a.id WHERE a.session_id = ?',
        [item.targetEntityId],
      );
      await this.db.executeTransaction([
        climbingSessionTombstoneTask(item.targetEntityId, null, now),
        ...attemptRows.map((row) => ascentAttemptTombstoneTask(row.id, null, now)),
        ...pitchRows.map((row) => pitchLogTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'WorkoutPlan') {
      // documentation/Subfeatures/Heti terv.md: plan delete cascades to its own exercise lines and target sets locally too.
      const exerciseRows = await this.db.query<{ id: string }>('SELECT id FROM workout_plan_exercise WHERE plan_id = ?', [item.targetEntityId]);
      const setRows = await this.db.query<{ id: string }>(
        'SELECT s.id FROM workout_plan_set s JOIN workout_plan_exercise e ON s.plan_exercise_id = e.id WHERE e.plan_id = ?',
        [item.targetEntityId],
      );
      await this.db.executeTransaction([
        workoutPlanTombstoneTask(item.targetEntityId, null, now),
        ...exerciseRows.map((row) => workoutPlanExerciseTombstoneTask(row.id, null, now)),
        ...setRows.map((row) => workoutPlanSetTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'WeeklyPlan') {
      // documentation/Subfeatures/Heti terv.md: week delete cascades to its own slots locally too.
      const slotRows = await this.db.query<{ id: string }>('SELECT id FROM weekly_plan_slot WHERE weekly_plan_id = ?', [item.targetEntityId]);
      await this.db.executeTransaction([
        weeklyPlanTombstoneTask(item.targetEntityId, null, now),
        ...slotRows.map((row) => weeklyPlanSlotTombstoneTask(row.id, null, now)),
      ]);
    } else if (item.entityType === 'ShoppingListComplete') {
      // documentation/Subfeatures/Bevásárlás teljesítve.md: 409 ENTITY_DELETED here means the list was
      // completed or deleted elsewhere — this device's completion is void. The list itself is ARCHIVED
      // (or deleted) server-side, not something to tombstone, so flag it for a targeted re-read; and
      // undo the completion's local-only side effects (the spun-off list + items + StoredFood rows,
      // none of which have their own outbox entry) so they don't linger as phantom rows.
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
      await this.db.executeTransaction(tasks);
    }
  }

  /**
   * documentation/Subfeatures/Étkezés.md "Cascade": tombstones the given (already live) meal_item
   * rows, then also tombstones any meal left with zero remaining live items as a result — the
   * client-side mirror of the backend's MealCascade, applied immediately instead of waiting for the
   * next delta pull to report the same thing.
   */
  private async mealItemCascadeTombstoneTasks(mealItemRows: { id: string }[], now: string): Promise<SqlTask[]> {
    if (mealItemRows.length === 0) {
      return [];
    }
    const tombstonedIds = new Set(mealItemRows.map((row) => row.id));
    const affectedMealRows = await this.db.query<{ meal_id: string }>(
      `SELECT DISTINCT meal_id FROM meal_item WHERE id IN (${mealItemRows.map(() => '?').join(',')})`,
      mealItemRows.map((row) => row.id),
    );
    const tasks: SqlTask[] = mealItemRows.map((row) => mealItemTombstoneTask(row.id, null, now));
    for (const { meal_id: mealId } of affectedMealRows) {
      const remainingLiveRows = await this.db.query<{ id: string }>('SELECT id FROM meal_item WHERE meal_id = ? AND deleted = 0', [mealId]);
      const stillLive = remainingLiveRows.some((row) => !tombstonedIds.has(row.id));
      if (!stillLive) {
        tasks.push(mealTombstoneTask(mealId, null, now));
      }
    }
    return tasks;
  }

  /** documentation/Architektúra/Backend-offline first.md §8: cursor-paged delta pull. */
  private async pull(userId: string): Promise<void> {
    let hasMore = true;
    let syncedAt: string | null = null;
    const changedTypes = new Set<string>();
    while (hasMore) {
      const stateRows = await this.db.query<{ cursor: string | null }>('SELECT cursor FROM sync_state WHERE id = 1');
      const since = stateRows[0]?.cursor ?? undefined;

      const response = await firstValueFrom(this.syncApi.getSyncChanges(since)).catch(async (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 410) {
          await this.db.run('UPDATE sync_state SET cursor = NULL WHERE id = 1');
          return null;
        }
        throw error;
      });
      if (response === null) {
        continue;
      }

      const tasks: SqlTask[] = [];
      for (const change of response.changes) {
        tasks.push(...(await this.buildApplyTasks(change)));
      }
      tasks.push({
        statement: 'UPDATE sync_state SET cursor = ?, last_pull_at = ?, last_pull_status = ?, first_pull_completed = 1 WHERE id = 1',
        values: [response.nextCursor, response.serverTime, 'OK'],
      });
      await this.db.executeTransaction(tasks);
      for (const change of response.changes) {
        changedTypes.add(change.entityType);
      }
      syncedAt = response.serverTime;
      hasMore = response.hasMore;
    }
    if (syncedAt !== null) {
      this.lastSuccessfulSyncAt.set(syncedAt);
    }
    // documentation/Architektúra/Backend-offline first.md §8: cached core/data repositories observe
    // this to re-read the rows the pull just wrote into the local store — each one only reloads if
    // `changedTypes` names an entity type it serves.
    if (changedTypes.size > 0) {
      this.dataChanges.notifyChanged(changedTypes);
    }
    await this.offlineQueue.refreshCounts(userId);
  }

  private async buildApplyTasks(change: SyncChangeItem): Promise<SqlTask[]> {
    if (change.entityType === 'UserProfile') {
      if (!change.deleted) {
        return [profileServerApplyTask(change.data as UserProfile)];
      }
      return [profileTombstoneTask(change.id, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WeightHistoryEntry') {
      if (!change.deleted) {
        return [weightHistoryServerApplyTask(change.data as WeightHistoryEntry)];
      }
      return [weightHistoryTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'GearItem') {
      if (!change.deleted) {
        return [gearItemServerApplyTask(change.data as GearItem)];
      }
      return [gearItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingTemplate') {
      if (!change.deleted) {
        return [packingTemplateServerApplyTask(change.data as PackingTemplate)];
      }
      return [packingTemplateTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingTemplateItem') {
      if (!change.deleted) {
        return [packingTemplateItemServerApplyTask(change.data as PackingTemplateItem)];
      }
      return [packingTemplateItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingSession') {
      if (!change.deleted) {
        return [packingSessionServerApplyTask(change.data as PackingSession)];
      }
      return [packingSessionTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PackingSessionItem') {
      if (!change.deleted) {
        return [packingSessionItemServerApplyTask(change.data as PackingSessionItem)];
      }
      return [packingSessionItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'LifePlan') {
      if (!change.deleted) {
        return [lifePlanServerApplyTask(change.data as LifePlan)];
      }
      return [lifePlanTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'SwimLog') {
      if (!change.deleted) {
        return [swimLogServerApplyTask(change.data as SwimLog)];
      }
      return [swimLogTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'BikeRideLog') {
      if (!change.deleted) {
        return [bikeRideLogServerApplyTask(change.data as BikeRideLog)];
      }
      return [bikeRideLogTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'RecurringExpense') {
      if (!change.deleted) {
        return [recurringExpenseServerApplyTask(change.data as RecurringExpense)];
      }
      return [recurringExpenseTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'AycmPartner') {
      if (!change.deleted) {
        return [aycmPartnerServerApplyTask(change.data as AycmPartner)];
      }
      return [aycmPartnerTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'AycmPriceRule') {
      if (!change.deleted) {
        return [aycmPriceRuleServerApplyTask(change.data as AycmPriceRule)];
      }
      return [aycmPriceRuleTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'AycmCheckIn') {
      if (!change.deleted) {
        return [aycmCheckInServerApplyTask(change.data as AycmCheckIn)];
      }
      return [aycmCheckInTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'AycmSettings') {
      if (!change.deleted) {
        return [aycmSettingsServerApplyTask(change.data as AycmSettings)];
      }
      return [aycmSettingsTombstoneTask(change.id, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Gym') {
      if (!change.deleted) {
        return [gymServerApplyTask(change.data as Gym)];
      }
      return [gymTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'GymColorBand') {
      if (!change.deleted) {
        return [gymColorBandServerApplyTask(change.data as GymColorBand)];
      }
      return [gymColorBandTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'IndoorRoute') {
      if (!change.deleted) {
        return [indoorRouteServerApplyTask(change.data as IndoorRoute)];
      }
      return [indoorRouteTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Crag') {
      if (!change.deleted) {
        return [cragServerApplyTask(change.data as Crag)];
      }
      return [cragTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Sector') {
      if (!change.deleted) {
        return [sectorServerApplyTask(change.data as Sector)];
      }
      return [sectorTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Route') {
      if (!change.deleted) {
        return [routeServerApplyTask(change.data as Route)];
      }
      return [routeTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'BoulderProblem') {
      if (!change.deleted) {
        return [boulderProblemServerApplyTask(change.data as BoulderProblem)];
      }
      return [boulderProblemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Exercise') {
      if (!change.deleted) {
        return [exerciseServerApplyTask(change.data as Exercise)];
      }
      return [exerciseTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'HouseholdRoom') {
      if (!change.deleted) {
        return [householdRoomServerApplyTask(change.data as HouseholdRoom)];
      }
      return [householdRoomTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'HouseholdTask') {
      if (!change.deleted) {
        return [householdTaskServerApplyTask(change.data as HouseholdTask)];
      }
      return [householdTaskTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'CalendarEvent') {
      if (!change.deleted) {
        return [calendarEventServerApplyTask(change.data as CalendarEvent)];
      }
      return [calendarEventTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Food') {
      if (!change.deleted) {
        return [foodServerApplyTask(change.data as Food)];
      }
      // documentation/Subfeatures/Élelmiszerek.md: Food delete cascades to this device's own storage items and recipe ingredients too.
      const storedFoodRows = await this.db.query<{ id: string }>('SELECT id FROM stored_food WHERE food_id = ?', [change.id]);
      const recipeIngredientRows = await this.db.query<{ id: string }>('SELECT id FROM recipe_ingredient WHERE food_id = ?', [change.id]);
      const foodMealItemRows = await this.db.query<{ id: string }>('SELECT id FROM meal_item WHERE food_id = ? AND deleted = 0', [change.id]);
      return [
        foodTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...storedFoodRows.map((row) => storedFoodTombstoneTask(row.id, null, change.updatedAt)),
        ...recipeIngredientRows.map((row) => recipeIngredientTombstoneTask(row.id, null, change.updatedAt)),
        ...(await this.mealItemCascadeTombstoneTasks(foodMealItemRows, change.updatedAt)),
      ];
    }
    if (change.entityType === 'StoredFood') {
      if (!change.deleted) {
        return [storedFoodServerApplyTask(change.data as StoredFood)];
      }
      return [storedFoodTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Recipe') {
      if (!change.deleted) {
        return [recipeServerApplyTask(change.data as Recipe)];
      }
      // documentation/Subfeatures/Recept.md: recipe delete cascades to this device's own ingredients too.
      const ingredientRows = await this.db.query<{ id: string }>('SELECT id FROM recipe_ingredient WHERE recipe_id = ?', [change.id]);
      const recipeMealItemRows = await this.db.query<{ id: string }>('SELECT id FROM meal_item WHERE recipe_id = ? AND deleted = 0', [change.id]);
      return [
        recipeTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...ingredientRows.map((row) => recipeIngredientTombstoneTask(row.id, null, change.updatedAt)),
        ...(await this.mealItemCascadeTombstoneTasks(recipeMealItemRows, change.updatedAt)),
      ];
    }
    if (change.entityType === 'RecipeIngredient') {
      if (!change.deleted) {
        return [recipeIngredientServerApplyTask(change.data as RecipeIngredient)];
      }
      return [recipeIngredientTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'Meal') {
      if (!change.deleted) {
        return [mealServerApplyTask(change.data as Meal)];
      }
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM meal_item WHERE meal_id = ?', [change.id]);
      return [
        mealTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...itemRows.map((row) => mealItemTombstoneTask(row.id, null, change.updatedAt)),
      ];
    }
    if (change.entityType === 'MealItem') {
      if (!change.deleted) {
        return [mealItemServerApplyTask(change.data as MealItem)];
      }
      return [mealItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'ShoppingList') {
      if (!change.deleted) {
        return [shoppingListServerApplyTask(change.data as ShoppingList)];
      }
      // documentation/Subfeatures/Bevásárlólista írás.md: list delete cascades to this device's own items too.
      const itemRows = await this.db.query<{ id: string }>('SELECT id FROM shopping_list_item WHERE shopping_list_id = ?', [change.id]);
      return [
        shoppingListTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...itemRows.map((row) => shoppingListItemTombstoneTask(row.id, null, change.updatedAt)),
      ];
    }
    if (change.entityType === 'ShoppingListItem') {
      if (!change.deleted) {
        return [shoppingListItemServerApplyTask(change.data as ShoppingListItem)];
      }
      return [shoppingListItemTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WorkoutSession') {
      if (!change.deleted) {
        return [workoutSessionServerApplyTask(change.data as WorkoutSession)];
      }
      // documentation/Subfeatures/Edzésnapló.md: session delete cascades to this device's own exercise entries and sets too.
      const exerciseRows = await this.db.query<{ id: string }>('SELECT id FROM workout_exercise_entry WHERE session_id = ?', [change.id]);
      const setRows = await this.db.query<{ id: string }>(
        'SELECT s.id FROM workout_set_entry s JOIN workout_exercise_entry e ON s.exercise_entry_id = e.id WHERE e.session_id = ?',
        [change.id],
      );
      return [
        workoutSessionTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...exerciseRows.map((row) => workoutExerciseEntryTombstoneTask(row.id, null, change.updatedAt)),
        ...setRows.map((row) => workoutSetEntryTombstoneTask(row.id, null, change.updatedAt)),
      ];
    }
    if (change.entityType === 'WorkoutExerciseEntry') {
      if (!change.deleted) {
        return [workoutExerciseEntryServerApplyTask(change.data as WorkoutExerciseEntry)];
      }
      return [workoutExerciseEntryTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WorkoutSetEntry') {
      if (!change.deleted) {
        return [workoutSetEntryServerApplyTask(change.data as WorkoutSetEntry)];
      }
      return [workoutSetEntryTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'ClimbingSession') {
      if (!change.deleted) {
        return [climbingSessionServerApplyTask(change.data as ClimbingSession)];
      }
      // documentation/Features/Mászónapló.md: session delete cascades to this device's own attempts and pitches too.
      const attemptRows = await this.db.query<{ id: string }>('SELECT id FROM ascent_attempt WHERE session_id = ?', [change.id]);
      const pitchRows = await this.db.query<{ id: string }>(
        'SELECT p.id FROM pitch_log p JOIN ascent_attempt a ON p.attempt_id = a.id WHERE a.session_id = ?',
        [change.id],
      );
      return [
        climbingSessionTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...attemptRows.map((row) => ascentAttemptTombstoneTask(row.id, null, change.updatedAt)),
        ...pitchRows.map((row) => pitchLogTombstoneTask(row.id, null, change.updatedAt)),
      ];
    }
    if (change.entityType === 'AscentAttempt') {
      if (!change.deleted) {
        return [ascentAttemptServerApplyTask(change.data as AscentAttempt)];
      }
      return [ascentAttemptTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'PitchLog') {
      if (!change.deleted) {
        return [pitchLogServerApplyTask(change.data as PitchLog)];
      }
      return [pitchLogTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WorkoutPlan') {
      if (!change.deleted) {
        return [workoutPlanServerApplyTask(change.data as WorkoutPlan)];
      }
      // documentation/Subfeatures/Heti terv.md: plan delete cascades to this device's own exercise lines and target sets too.
      const exerciseRows = await this.db.query<{ id: string }>('SELECT id FROM workout_plan_exercise WHERE plan_id = ?', [change.id]);
      const setRows = await this.db.query<{ id: string }>(
        'SELECT s.id FROM workout_plan_set s JOIN workout_plan_exercise e ON s.plan_exercise_id = e.id WHERE e.plan_id = ?',
        [change.id],
      );
      return [
        workoutPlanTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...exerciseRows.map((row) => workoutPlanExerciseTombstoneTask(row.id, null, change.updatedAt)),
        ...setRows.map((row) => workoutPlanSetTombstoneTask(row.id, null, change.updatedAt)),
      ];
    }
    if (change.entityType === 'WorkoutPlanExercise') {
      if (!change.deleted) {
        return [workoutPlanExerciseServerApplyTask(change.data as WorkoutPlanExercise)];
      }
      return [workoutPlanExerciseTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WorkoutPlanSet') {
      if (!change.deleted) {
        return [workoutPlanSetServerApplyTask(change.data as WorkoutPlanSet)];
      }
      return [workoutPlanSetTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    if (change.entityType === 'WeeklyPlan') {
      if (!change.deleted) {
        return [weeklyPlanServerApplyTask(change.data as WeeklyPlan)];
      }
      // documentation/Subfeatures/Heti terv.md: week delete cascades to this device's own slots too.
      const slotRows = await this.db.query<{ id: string }>('SELECT id FROM weekly_plan_slot WHERE weekly_plan_id = ?', [change.id]);
      return [
        weeklyPlanTombstoneTask(change.id, null, change.updatedAt),
        discardPendingWritesTask(change.id),
        ...slotRows.map((row) => weeklyPlanSlotTombstoneTask(row.id, null, change.updatedAt)),
      ];
    }
    if (change.entityType === 'WeeklyPlanSlot') {
      if (!change.deleted) {
        return [weeklyPlanSlotServerApplyTask(change.data as WeeklyPlanSlot)];
      }
      return [weeklyPlanSlotTombstoneTask(change.id, null, change.updatedAt), discardPendingWritesTask(change.id)];
    }
    return [];
  }
}

/**
 * Backend-offline first.md §8 apply rule "`_dirty = 1` + `deleted = true` → a tombstone győz…
 * a `PENDING` `PUT`-ok eldobandók (nincs resurrect)": drops any not-yet-sent write for an entity
 * that the server reports as deleted, for every synced entity type — not just the ones that
 * happen to expose a delete UI today.
 */
function discardPendingWritesTask(targetEntityId: string): SqlTask {
  return {
    statement: "DELETE FROM outbox_item WHERE target_entity_id = ? AND method != 'DELETE' AND status IN ('PENDING','BLOCKED')",
    values: [targetEntityId],
  };
}

/** documentation/Subfeatures/Bevásárlás teljesítve.md: this row's final values were already correct locally before the request was sent — only its sync-pending flags need clearing. */
function clearDirtyFlagsTask(table: string, id: string): SqlTask {
  return {
    statement: `UPDATE ${table} SET _dirty = 0, _local_only = 0 WHERE id = ?`,
    values: [id],
  };
}

import { Injectable, Injector, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { bikeKcalForDay, climbingKcalForDay, stepKcalForDay, swimKcalForDay, workoutKcalForDay } from '../data/activity-kcal';
import { BikeRideLogRepository } from '../data/bike-ride-log.repository';
import { CalendarEventRepository } from '../data/calendar-event.repository';
import { ClimbingSessionRepository } from '../data/climbing-session.repository';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { FoodRepository } from '../data/food.repository';
import { HouseholdTaskRepository } from '../data/household-task.repository';
import { MealRepository } from '../data/meal.repository';
import { ProfileRepository } from '../data/profile.repository';
import { RecipeRepository } from '../data/recipe.repository';
import { StoredFoodRepository } from '../data/stored-food.repository';
import { SwimLogRepository } from '../data/swim-log.repository';
import { WorkoutSessionRepository } from '../data/workout-session.repository';
import { FeatureFlagsService } from '../config/feature-flags.service';
import { LanguageService } from '../config/language.service';
import { addDaysIso, today } from '../../shared/local-date';
import { computeTdee } from '../../shared/tdee-calculator';
import { calendarDayInZone, deviceTimeZoneId } from '../../shared/timezone';
import { computeDailyNutrition } from '../../pages/food/meal/daily-nutrition';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { BackgroundReminders } from './background-reminders.plugin';
import { LocalNotificationsGateway } from './local-notifications.gateway';
import { NotificationDedupeStore } from './notification-dedupe.store';
import { notificationNumericId } from './notification-ids';
import {
  CalorieStreakDay,
  calorieStreakRule,
  eventOccurrenceRules,
  foodExpiringDailyRules,
  foodSpoiledOnceRules,
  householdTaskDueRule,
  stepsLowRule,
} from './notification-rules';
import { NotificationSettingsService } from './notification-settings.service';
import { NOTIFICATION_SOURCE_FLAG, NOTIFICATION_TYPES, DesiredNotification, NotificationType } from './notification-types';

export type NotificationPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';

const CHANNEL_ID = 'lm2-default';
const REGISTRY_KEY = 'lm2_notifScheduled';
const REEVALUATE_DEBOUNCE_MS = 600;
/** Fixed-time (09:00 / 20:00) types only schedule their next occurrence; events project this far. */
const EVENT_HORIZON_DAYS = 30;
const CALORIE_STREAK_LENGTH = 5;

interface RegistryEntry {
  type: NotificationType;
  key: string;
  /** Local wall-clock instant the OS notification is set for (`YYYY-MM-DDTHH:mm:ss`). */
  fireAt: string;
  /** Active language when the text was baked in — a language change forces a reschedule. */
  lang: string;
}

type Registry = Record<string, RegistryEntry>;

/**
 * documentation/Features/Értesítések.md — the single local-notification orchestrator
 * (`NotificationScheduler` in documentation/Architektúra/Frontend.md). Entirely client-side, native
 * only (web has no local notifications — Platform-képességmátrix).
 *
 * Model: on every re-evaluation trigger (cold start, resume, source-data mutation, type-switch,
 * language change) it recomputes the desired notification set for a short horizon
 * ({@link notification-rules}), then reconciles against what the OS currently has pending —
 * scheduling new ones, firing past-due ones immediately once, and cancelling ones no longer wanted
 * (item deleted, task completed, step goal met before 20:00…). A local dedupe log
 * ({@link NotificationDedupeStore}) stops a re-fire across restarts; an already-delivered banner is
 * never retracted.
 *
 * **Known limitation (accepted, see IMPLEMENTATION_STATUS.md):** there is no background execution
 * (no `@capacitor/background-runner` wired for this), so a fixed-time notification whose day the app
 * is never opened on can be missed — the next app open fires it immediately if still relevant. Same
 * "app-open is the safety net" tradeoff as the Health Connect step sync. A real 08:00/20:00
 * background worker is the next recommended feature. One residual edge in the same class: if a
 * `FOOD_SPOILED_ONCE` alarm is force-stopped / OEM-killed after it was scheduled but before it
 * fired, the reconcile can't tell that apart from a delivery and won't re-fire it (every other type
 * self-heals because its dedupe key rotates daily).
 *
 * Notifications are scheduled **inexact** ({@link fire} passes `isExactNotification: false`): these
 * reminders don't need alarm-clock precision, so we avoid the Android 12+ exact-alarm permission
 * and its first-schedule settings-screen redirect. Events are only pre-scheduled
 * {@link EVENT_HORIZON_DAYS} ahead (narrower than the Események ±1yr projection) — a farther-out
 * occurrence gets its notification the first time the app is opened within that window.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSchedulerService {
  private readonly injector = inject(Injector);
  private readonly gateway = inject(LocalNotificationsGateway);
  private readonly settings = inject(NotificationSettingsService);
  private readonly dedupe = inject(NotificationDedupeStore);
  private readonly featureFlags = inject(FeatureFlagsService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly dataChange = inject(DataChangeNotifier);
  private readonly router = inject(Router);

  private readonly storedFood = inject(StoredFoodRepository);
  private readonly food = inject(FoodRepository);
  private readonly recipe = inject(RecipeRepository);
  private readonly meal = inject(MealRepository);
  private readonly profile = inject(ProfileRepository);
  private readonly stepLog = inject(DailyStepLogRepository);
  private readonly householdTask = inject(HouseholdTaskRepository);
  private readonly calendarEvent = inject(CalendarEventRepository);
  private readonly workout = inject(WorkoutSessionRepository);
  private readonly swim = inject(SwimLogRepository);
  private readonly bike = inject(BikeRideLogRepository);
  private readonly climbing = inject(ClimbingSessionRepository);

  readonly permission = signal<NotificationPermission>('unknown');

  private started = false;
  private running = false;
  private rerunRequested = false;
  private rerunRefresh = false;
  private pendingRefresh = false;
  private lastTick = 0;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  /**
   * Cold-start step 6 hook (fire-and-forget from main.ts, like `SyncEngine.init` /
   * `ActivityStepSyncService.init`). Never blocks first render.
   */
  async init(): Promise<void> {
    if (this.started) {
      // Re-invoked after an in-session login (LoginPage) — re-check permission (it may have been
      // granted in system settings meanwhile) and re-run the reconcile.
      await this.syncPermission();
      await this.reevaluate('reinit', true);
      this.armBackgroundWorker();
      return;
    }
    this.started = true;

    if (!Capacitor.isNativePlatform()) {
      this.permission.set('unavailable');
      return;
    }

    await this.syncPermission();
    await this.ensureChannel();

    void this.gateway.addActionPerformedListener((route) => {
      if (typeof route === 'string' && route.length > 0) {
        void this.router.navigateByUrl(route);
      }
    });

    // Re-check permission on every foreground (the user can flip it in system settings while
    // backgrounded), then reconcile against the freshly reloaded store.
    void App.addListener('resume', () => void this.onResume());

    this.lastTick = this.dataChange.tick();
    // React to source-data mutations (local writes bump repo signals; a pull bumps DataChangeNotifier)
    // and to type-switch / language changes. Debounced. A pull also needs a repo reload; a plain local
    // write does not (the writing repo already updated its own signal).
    effect(
      () => {
        const tick = this.dataChange.tick();
        this.settings.enabled();
        this.language.activeLanguage();
        this.storedFood.items();
        this.food.items();
        this.stepLog.items();
        this.meal.items();
        this.householdTask.items();
        this.calendarEvent.items();
        // CALORIE_STREAK also derives from these (recipe-based intake + TDEE allowance from the
        // profile and every activity source) — spec "forrás-entitás mutáció" must re-evaluate.
        this.recipe.items();
        this.profile.profile();
        this.workout.items();
        this.swim.items();
        this.bike.items();
        this.climbing.items();
        const pulled = tick !== this.lastTick;
        this.lastTick = tick;
        this.scheduleReevaluate(pulled);
      },
      { injector: this.injector },
    );

    await this.reevaluate('cold-start', true);
    this.armBackgroundWorker();
  }

  /**
   * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — (re-)arm the two
   * native inexact daily alarms that run {@link runReconcile}'s background equivalent on days the app
   * isn't opened. Fire-and-forget; the plugin proxy rejects on a build without the native module
   * (web / iOS) and that's fine.
   */
  private armBackgroundWorker(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    void BackgroundReminders.ensureScheduled().catch(() => undefined);
  }

  private async onResume(): Promise<void> {
    await this.syncPermission();
    await this.reevaluate('resume', true);
  }

  /**
   * Re-reads the OS notification permission into {@link permission}. Runs at cold start, on every
   * `resume`, and when the settings page opens. A transient plugin error (boot race) leaves the
   * signal at `unknown` so a later retry can still recover — it must not latch the feature off for
   * the whole process lifetime.
   */
  async syncPermission(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.permission.set('unavailable');
      return;
    }
    try {
      const perm = await this.gateway.checkPermissions();
      this.permission.set(perm.display === 'granted' ? 'granted' : 'denied');
    } catch {
      if (this.permission() !== 'granted' && this.permission() !== 'denied') {
        this.permission.set('unknown');
      }
    }
  }

  /** documentation/Features/Értesítések.md "OS értesítési engedély kérése első használatkor / bekapcsoláskor." */
  async requestPermission(): Promise<void> {
    if (this.permission() === 'unavailable') {
      return;
    }
    try {
      const result = await this.gateway.requestPermissions();
      this.permission.set(result.display === 'granted' ? 'granted' : 'denied');
    } catch {
      this.permission.set('denied');
    }
    if (this.permission() === 'granted') {
      await this.reevaluate('permission-granted', false);
    }
  }

  /** Called from the settings page — persists the switch, asks for permission on enable, reschedules. */
  async setTypeEnabled(type: NotificationType, value: boolean): Promise<void> {
    await this.settings.setEnabled(type, value);
    if (value && this.permission() !== 'granted') {
      await this.requestPermission();
    }
    await this.reevaluate('type-switch', false);
  }

  private scheduleReevaluate(refresh: boolean): void {
    this.pendingRefresh = this.pendingRefresh || refresh;
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle);
    }
    this.debounceHandle = setTimeout(() => {
      this.debounceHandle = null;
      const doRefresh = this.pendingRefresh;
      this.pendingRefresh = false;
      void this.reevaluate('reactive', doRefresh);
    }, REEVALUATE_DEBOUNCE_MS);
  }

  async reevaluate(_reason: string, refresh: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (this.running) {
      this.rerunRequested = true;
      // Don't lose a refresh-needing trigger (a pull, a resume) that lands mid-run.
      this.rerunRefresh = this.rerunRefresh || refresh;
      return;
    }
    this.running = true;
    try {
      if (refresh) {
        await this.refreshSources();
      }
      await this.runReconcile();
    } finally {
      this.running = false;
      if (this.rerunRequested) {
        this.rerunRequested = false;
        const rerunRefresh = this.rerunRefresh;
        this.rerunRefresh = false;
        await this.reevaluate('rerun', rerunRefresh);
      }
    }
  }

  private async refreshSources(): Promise<void> {
    await Promise.all([
      this.storedFood.load(),
      this.food.load(),
      this.recipe.load(),
      this.meal.load(),
      this.profile.load(),
      this.stepLog.load(),
      this.householdTask.load(),
      this.calendarEvent.load(),
      this.workout.load(),
      this.swim.load(),
      this.bike.load(),
      this.climbing.load(),
    ]);
  }

  private async runReconcile(): Promise<void> {
    const todayIso = today();
    const now = new Date();

    const registry = await this.loadRegistry();

    const featureOn = this.featureFlags.isEnabled('menu.ertesitesek');
    if (!featureOn || this.permission() !== 'granted') {
      await this.cancelIds(Object.keys(registry).map(Number));
      await this.saveRegistry({});
      return;
    }

    const desired: DesiredNotification[] = [];
    for (const type of this.activeTypes()) {
      desired.push(...this.computeDesired(type, todayIso, now));
    }

    const desiredById = new Map<number, DesiredNotification>();
    for (const n of desired) {
      desiredById.set(notificationNumericId(n.type, n.key), n);
    }

    const pendingIds = new Set(await this.pendingIds());
    const lang = this.language.activeLanguage();
    const nextRegistry: Registry = {};

    // 1. Reconcile the registry against what the OS still has queued (`pendingIds`):
    //    - fire time passed, OS no longer lists it        → delivered (or lost to a force-stop /
    //      OEM battery kill — indistinguishable, and the same accepted gap as "no background
    //      worker"): record dedupe so it isn't re-fired.
    //    - fire time passed but the OS still has it queued → a late alarm that has NOT fired yet:
    //      cancel it, forget the stale pending id, and let step 2 fire it immediately once.
    //    - still future, still wanted, same language, OS still has it → keep as-is.
    //    - anything else (no longer wanted / language changed / the OS dropped a future one) →
    //      cancel and let step 2 reschedule it.
    for (const [idStr, entry] of Object.entries(registry)) {
      const id = Number(idStr);
      const stillPending = pendingIds.has(id);
      if (new Date(entry.fireAt) <= now) {
        if (stillPending) {
          await this.cancelIds([id]);
          pendingIds.delete(id);
        } else {
          await this.dedupe.record(entry.type, entry.key, entry.fireAt.slice(0, 10));
        }
      } else if (stillPending && desiredById.has(id) && entry.lang === lang) {
        nextRegistry[idStr] = entry;
      } else {
        await this.cancelIds([id]);
        pendingIds.delete(id);
      }
    }

    // 2. Schedule everything desired that isn't already kept in the registry.
    for (const [id, n] of desiredById) {
      if (nextRegistry[id] !== undefined) {
        continue;
      }
      const fireDate = new Date(n.fireAt);
      if (fireDate <= now) {
        if ((await this.dedupe.has(n.type, n.key)) || pendingIds.has(id)) {
          continue;
        }
        await this.fire(id, n, null);
        await this.dedupe.record(n.type, n.key, todayIso);
      } else {
        await this.fire(id, n, fireDate);
        nextRegistry[id] = { type: n.type, key: n.key, fireAt: n.fireAt, lang };
      }
    }

    await this.saveRegistry(nextRegistry);
    await this.dedupe.prune(todayIso);
  }

  /** Types whose source feature flag is on AND whose device-local switch is on. */
  private activeTypes(): NotificationType[] {
    return NOTIFICATION_TYPES.filter(
      (type) => this.featureFlags.isEnabled(NOTIFICATION_SOURCE_FLAG[type]) && this.settings.isEnabled(type),
    );
  }

  private computeDesired(type: NotificationType, todayIso: string, now: Date): DesiredNotification[] {
    switch (type) {
      case 'FOOD_EXPIRING_DAILY':
        return foodExpiringDailyRules(this.storedFood.items(), this.food.items(), todayIso);
      case 'FOOD_SPOILED_ONCE':
        return foodSpoiledOnceRules(this.storedFood.items(), this.food.items(), todayIso);
      case 'STEPS_LOW':
        return stepsLowRule(this.stepLog.stepsForDay(todayIso), todayIso);
      case 'CALORIE_STREAK':
        return calorieStreakRule(this.calorieStreakDays(todayIso), todayIso);
      case 'HOUSEHOLD_TASK_DUE':
        return householdTaskDueRule(this.householdTask.items(), todayIso);
      case 'EVENT_OCCURRENCE':
        return eventOccurrenceRules(this.calendarEvent.items(), todayIso, wallClock(now), EVENT_HORIZON_DAYS);
    }
  }

  /** documentation/Features/Értesítések.md §4 — `D-5 … D-1` intake vs the day's TDEE allowance. */
  private calorieStreakDays(todayIso: string): CalorieStreakDay[] {
    const zone = deviceTimeZoneId();
    const profile = this.profile.profile();
    const weight = profile?.currentWeightKg ?? null;
    const recipes = this.recipe.items();
    const foods = this.food.items();
    const meals = this.meal.items().filter((m) => !m.deleted);

    const days: CalorieStreakDay[] = [];
    for (let offset = CALORIE_STREAK_LENGTH; offset >= 1; offset--) {
      const date = addDaysIso(todayIso, -offset);
      const dayMeals = meals.filter((m) => calendarDayInZone(m.eatenAt, zone) === date);
      const intakeKcal = computeDailyNutrition(dayMeals, recipes, foods).kcal;

      const activityKcal =
        stepKcalForDay(this.stepLog.items(), date, weight) +
        workoutKcalForDay(this.workout.items(), date, weight) +
        swimKcalForDay(this.swim.items(), date, weight) +
        bikeKcalForDay(this.bike.items(), date, weight) +
        climbingKcalForDay(this.climbing.items(), date, weight);

      const tdee = computeTdee(
        {
          birthDate: profile?.birthDate ?? null,
          sex: profile?.sex ?? null,
          heightCm: profile?.heightCm ?? null,
          currentWeightKg: profile?.currentWeightKg ?? null,
          goal: profile?.goal ?? null,
          kgPerWeek: profile?.kgPerWeek ?? null,
        },
        date,
        activityKcal,
      );

      days.push({ date, intakeKcal, allowanceKcal: tdee.computable ? tdee.dailyAllowanceKcal : null });
    }
    return days;
  }

  private async fire(id: number, n: DesiredNotification, at: Date | null): Promise<void> {
    await this.gateway.schedule({
      notifications: [
        {
          id,
          channelId: CHANNEL_ID,
          title: this.translate.instant(n.titleKey, n.params),
          body: this.translate.instant(n.bodyKey, n.params),
          // Inexact: daily 09:00 / 20:00 / event reminders tolerate a few minutes' drift and the
          // app-open reconcile catches misses — so we skip the exact-alarm permission entirely (no
          // "Alarms & reminders" settings redirect on first schedule, no Play-review friction).
          isExactNotification: false,
          ...(at ? { schedule: { at, allowWhileIdle: true } } : {}),
          extra: { route: n.route, type: n.type, key: n.key },
        },
      ],
    });
  }

  private async cancelIds(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    try {
      await this.gateway.cancelIds(ids);
    } catch {
      // Nothing pending under that id — fine.
    }
  }

  private async pendingIds(): Promise<number[]> {
    try {
      return (await this.gateway.getPending()).notifications.map((p) => p.id);
    } catch {
      return [];
    }
  }

  private async ensureChannel(): Promise<void> {
    try {
      await this.gateway.createChannel({
        id: CHANNEL_ID,
        name: this.translate.instant('NOTIFICATIONS.CHANNEL_NAME'),
        importance: 4,
        visibility: 1,
      });
    } catch {
      // iOS / older Android without channels — safe to ignore.
    }
  }

  private async loadRegistry(): Promise<Registry> {
    const raw = (await Preferences.get({ key: REGISTRY_KEY })).value;
    if (raw === null) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as Registry;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private async saveRegistry(registry: Registry): Promise<void> {
    await Preferences.set({ key: REGISTRY_KEY, value: JSON.stringify(registry) });
  }
}

/** Local wall-clock `YYYY-MM-DDTHH:mm:ss` for the device's own zone — matches `DesiredNotification.fireAt`. */
function wallClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

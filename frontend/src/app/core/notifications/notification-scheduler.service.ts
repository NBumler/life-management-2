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
import { buildBackgroundPlan } from './notification-background-plan';
import { LocalNotificationsGateway } from './local-notifications.gateway';
import { NotificationDedupeStore } from './notification-dedupe.store';
import { NotificationHistoryStore } from './notification-history.store';
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
import { NotificationTuningService } from './notification-tuning.service';
import { NOTIFICATION_SOURCE_FLAG, NOTIFICATION_TYPES, DesiredNotification, NotificationType } from './notification-types';

export type NotificationPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';

const CHANNEL_ID = 'lm2-default';
const REGISTRY_KEY = 'lm2_notifScheduled';
/** documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — the JS↔worker bridge. */
const BG_PLAN_KEY = 'lm2_notifBgPlan';
const BG_DEDUPE_KEY = 'lm2_notifBgDedupe';
const PENDING_ROUTE_KEY = 'lm2_notifPendingRoute';
/** Placeholder the worker replaces with the live step count in the STEPS_LOW body template. */
const STEPS_SENTINEL = '__STEPS__';
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
  /** Rendered text + tap target, carried so the notification-history log can be written from the
   *  reconcile that infers this notification's delivery (params aren't available there). */
  title?: string;
  body?: string;
  route?: string;
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
  private readonly tuning = inject(NotificationTuningService);
  private readonly dedupe = inject(NotificationDedupeStore);
  private readonly history = inject(NotificationHistoryStore);
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
      await this.drainPendingRoute();
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
        this.tuning.tuning();
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
    await this.drainPendingRoute();
  }

  /**
   * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — a notification the
   * native `ReminderWorker` posted directly (not via `@capacitor/local-notifications`) can't reach the
   * `localNotificationActionPerformed` listener, so its tap target writes the route to
   * `PENDING_ROUTE_KEY` and launches the app. Consume it here on cold start / reinit / resume.
   */
  private async drainPendingRoute(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const route = (await Preferences.get({ key: PENDING_ROUTE_KEY })).value;
    if (route !== null && route.length > 0) {
      await Preferences.remove({ key: PENDING_ROUTE_KEY });
      void this.router.navigateByUrl(route);
    }
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
    // A force-stop or aggressive OEM app-standby drops the two AlarmManager alarms; re-arm them on
    // every foreground so a user who only ever resumes the app (never a cold start) isn't left with
    // the background worker permanently disarmed. `ensureScheduled` is idempotent.
    this.armBackgroundWorker();
    await this.drainPendingRoute();
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

    // Fold in whatever the native ReminderWorker fired while the app was closed, so the immediate-fire
    // path below doesn't re-deliver it.
    await this.mergeNativeDedupe(todayIso);

    const registry = await this.loadRegistry();

    const featureOn = this.featureFlags.isEnabled('menu.ertesitesek');
    if (!featureOn || this.permission() !== 'granted') {
      await this.cancelIds(Object.keys(registry).map(Number));
      await this.saveRegistry({});
      await this.clearBackgroundPlan();
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
          await this.recordHistory(entry.type, entry.key, entry, new Date(entry.fireAt).getTime());
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
      const text = this.render(n);
      if (fireDate <= now) {
        if ((await this.dedupe.has(n.type, n.key)) || pendingIds.has(id)) {
          continue;
        }
        await this.fire(id, n, null, text);
        await this.dedupe.record(n.type, n.key, todayIso);
        await this.history.record({ type: n.type, key: n.key, ...text, route: n.route, firedAt: now.getTime() });
      } else {
        await this.fire(id, n, fireDate, text);
        nextRegistry[id] = { type: n.type, key: n.key, fireAt: n.fireAt, lang, ...text, route: n.route };
      }
    }

    await this.saveRegistry(nextRegistry);
    await this.dedupe.prune(todayIso);
    await this.writeBackgroundPlan(todayIso);
  }

  /**
   * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — serialize the
   * next few days of fixed-time notifications (pre-rendered in the current language) plus tonight's
   * STEPS_LOW template into `BG_PLAN_KEY`, for the native `ReminderWorker` to fire on days the app is
   * never opened. Rebuilt on every reconcile, so it only goes stale for days with zero app opens.
   */
  private async writeBackgroundPlan(todayIso: string): Promise<void> {
    const plan = buildBackgroundPlan(
      new Set(this.activeTypes()),
      {
        storedFoods: this.storedFood.items(),
        foods: this.food.items(),
        householdTasks: this.householdTask.items(),
        calorieStreakToday: this.calorieStreakDays(todayIso),
      },
      todayIso,
      this.tuning.tuning(),
    );

    // Drop anything the live scheduler already fired today: an immediate fire is recorded **only** in
    // the shared dedupe store, never in the registry the native worker reads (`osScheduledIds`), and
    // the worker's own `lm2_notifBgDedupe` ledger can't see the shared store either — so without this
    // filter the 20:00 run re-delivers every 09:00 banner on a day whose first app open was after 09:00.
    const entries: DesiredNotification[] = [];
    for (const n of plan.entries) {
      if (!(await this.dedupe.has(n.type, n.key))) {
        entries.push(n);
      }
    }
    const stepsLow = plan.stepsLow && !(await this.dedupe.has('STEPS_LOW', plan.stepsLow.key)) ? plan.stepsLow : null;

    const file = {
      version: 1,
      writtenAt: Date.now(),
      channelId: CHANNEL_ID,
      channelName: this.translate.instant('NOTIFICATIONS.CHANNEL_NAME'),
      entries: entries.map((n) => ({
        id: notificationNumericId(n.type, n.key),
        type: n.type,
        key: n.key,
        fireAtEpochMs: new Date(n.fireAt).getTime(),
        title: this.translate.instant(n.titleKey, n.params),
        body: this.translate.instant(n.bodyKey, n.params),
        route: n.route,
      })),
      stepsLow: stepsLow
        ? {
            id: notificationNumericId('STEPS_LOW', stepsLow.key),
            key: stepsLow.key,
            fireAtEpochMs: new Date(stepsLow.fireAt).getTime(),
            threshold: stepsLow.threshold,
            title: this.translate.instant(stepsLow.titleKey),
            // The worker substitutes the live count for STEPS_SENTINEL after its 20:00 Health Connect read.
            bodyTemplate: this.translate.instant(stepsLow.bodyKey, { steps: STEPS_SENTINEL }),
            stepsPlaceholder: STEPS_SENTINEL,
            route: stepsLow.route,
          }
        : null,
    };
    await Preferences.set({ key: BG_PLAN_KEY, value: JSON.stringify(file) });
  }

  private async clearBackgroundPlan(): Promise<void> {
    await Preferences.set({
      key: BG_PLAN_KEY,
      value: JSON.stringify({ version: 1, writtenAt: Date.now(), entries: [], stepsLow: null }),
    });
  }

  /**
   * Merge the native worker's "already fired" ledger ({@link BG_DEDUPE_KEY}) into the shared
   * {@link NotificationDedupeStore} and the {@link NotificationHistoryStore}, then clear it. The
   * worker appends `{type,key,day,title,body,route,firedAt}` rows — the last four let the history row
   * carry the text the worker actually posted (notably the STEPS_LOW body with the live count
   * substituted, which the plan template only has as `__STEPS__`) and its real fire time (20:00 for
   * STEPS_LOW, not 09:00). A row from an older worker build has only `{type,key,day}`; those fall
   * back to the last background plan the app wrote ({@link BG_PLAN_KEY}) — and if that plan has since
   * been rebuilt without the entry, to a route-only row timestamped at 09:00. A rare clear-vs-append
   * race just means one banner could be re-shown, which the spec already tolerates.
   */
  private async mergeNativeDedupe(todayIso: string): Promise<void> {
    const raw = (await Preferences.get({ key: BG_DEDUPE_KEY })).value;
    if (raw === null || raw === '' || raw === '[]') {
      return;
    }
    let rows: unknown;
    try {
      rows = JSON.parse(raw);
    } catch {
      await Preferences.set({ key: BG_DEDUPE_KEY, value: '[]' });
      return;
    }
    if (Array.isArray(rows)) {
      const planText = await this.loadBackgroundPlanText();
      for (const row of rows) {
        if (
          row !== null &&
          typeof row === 'object' &&
          typeof (row as { type?: unknown }).type === 'string' &&
          typeof (row as { key?: unknown }).key === 'string'
        ) {
          const r = row as {
            type: NotificationType;
            key: string;
            day?: unknown;
            title?: unknown;
            body?: unknown;
            route?: unknown;
            firedAt?: unknown;
          };
          const day = typeof r.day === 'string' ? r.day : todayIso;
          await this.dedupe.record(r.type, r.key, day);

          const fromPlan = planText.get(`${r.type}|${r.key}`);
          const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
          const text = {
            title: str(r.title) ?? fromPlan?.title,
            body: str(r.body) ?? fromPlan?.body,
            route: str(r.route) ?? fromPlan?.route,
          };
          const firedAt =
            typeof r.firedAt === 'number' && Number.isFinite(r.firedAt)
              ? r.firedAt
              : fromPlan?.firedAt ?? new Date(`${day}T09:00:00`).getTime();
          await this.recordHistory(r.type, r.key, text, firedAt);
        }
      }
    }
    await Preferences.set({ key: BG_DEDUPE_KEY, value: '[]' });
  }

  /** `type|key` → rendered text/route + scheduled epoch, read back from the background plan file for history recovery. */
  private async loadBackgroundPlanText(): Promise<
    Map<string, { title?: string; body?: string; route?: string; firedAt?: number }>
  > {
    const map = new Map<string, { title?: string; body?: string; route?: string; firedAt?: number }>();
    const raw = (await Preferences.get({ key: BG_PLAN_KEY })).value;
    if (raw === null) {
      return map;
    }
    try {
      const plan = JSON.parse(raw) as {
        entries?: { type?: string; key?: string; title?: string; body?: string; route?: string; fireAtEpochMs?: number }[];
        stepsLow?: { key?: string; title?: string; bodyTemplate?: string; route?: string; fireAtEpochMs?: number } | null;
      };
      for (const e of plan.entries ?? []) {
        if (typeof e.type === 'string' && typeof e.key === 'string') {
          map.set(`${e.type}|${e.key}`, {
            title: e.title,
            body: e.body,
            route: e.route,
            firedAt: typeof e.fireAtEpochMs === 'number' ? e.fireAtEpochMs : undefined,
          });
        }
      }
      if (plan.stepsLow && typeof plan.stepsLow.key === 'string') {
        map.set(`STEPS_LOW|${plan.stepsLow.key}`, {
          title: plan.stepsLow.title,
          // The template still carries the __STEPS__ placeholder — only used when the ledger row
          // (which has the substituted body) predates that field.
          body: plan.stepsLow.bodyTemplate,
          route: plan.stepsLow.route,
          firedAt: typeof plan.stepsLow.fireAtEpochMs === 'number' ? plan.stepsLow.fireAtEpochMs : undefined,
        });
      }
    } catch {
      // Corrupt plan — history rows for the native fires fall back to route-only.
    }
    return map;
  }

  /** Types whose source feature flag is on AND whose device-local switch is on. */
  private activeTypes(): NotificationType[] {
    return NOTIFICATION_TYPES.filter(
      (type) => this.featureFlags.isEnabled(NOTIFICATION_SOURCE_FLAG[type]) && this.settings.isEnabled(type),
    );
  }

  private computeDesired(type: NotificationType, todayIso: string, now: Date): DesiredNotification[] {
    const tuning = this.tuning.tuning();
    switch (type) {
      case 'FOOD_EXPIRING_DAILY':
        return foodExpiringDailyRules(this.storedFood.items(), this.food.items(), todayIso, {
          long: tuning.foodExpiringLeadDaysLong,
          short: tuning.foodExpiringLeadDaysShort,
        });
      case 'FOOD_SPOILED_ONCE':
        return foodSpoiledOnceRules(this.storedFood.items(), this.food.items(), todayIso);
      case 'STEPS_LOW':
        return stepsLowRule(this.stepLog.stepsForDay(todayIso), todayIso, tuning.stepsLowThreshold);
      case 'CALORIE_STREAK':
        return calorieStreakRule(this.calorieStreakDays(todayIso), todayIso, tuning.calorieStreakMarginKcal);
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

  /** Translate a desired notification's title/body once so the same strings feed the OS call, the
   *  registry entry and the notification-history log. */
  private render(n: DesiredNotification): { title: string; body: string } {
    return {
      title: this.translate.instant(n.titleKey, n.params),
      body: this.translate.instant(n.bodyKey, n.params),
    };
  }

  /**
   * documentation/Features/Értesítések.md "Értesítés-előzmény lista" — append a delivered banner to
   * {@link NotificationHistoryStore}. `source` carries the rendered text (a registry entry, or a
   * plain object built from the background plan); a missing title just yields a route-only row.
   */
  private async recordHistory(
    type: NotificationType,
    key: string,
    source: { title?: string; body?: string; route?: string },
    firedAt: number,
  ): Promise<void> {
    await this.history.record({
      type,
      key,
      title: source.title ?? '',
      body: source.body ?? '',
      route: source.route ?? '',
      firedAt,
    });
  }

  private async fire(id: number, n: DesiredNotification, at: Date | null, text: { title: string; body: string }): Promise<void> {
    await this.gateway.schedule({
      notifications: [
        {
          id,
          channelId: CHANNEL_ID,
          title: text.title,
          body: text.body,
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

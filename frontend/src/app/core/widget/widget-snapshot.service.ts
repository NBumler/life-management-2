import { Injectable, Injector, effect, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TranslateService } from '@ngx-translate/core';

import { today } from '../../shared/local-date';
import { LanguageService } from '../config/language.service';
import { DailyStepLogRepository } from '../data/daily-step-log.repository';
import { TodayNutritionService } from '../data/today-nutrition.service';
import { NotificationTuningService } from '../notifications/notification-tuning.service';
import { AuthSessionService } from '../session/auth-session.service';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { Lm2Widget } from './lm2-widget.plugin';
import { WIDGET_LABEL_KEYS, WIDGET_SNAPSHOT_KEY, WidgetLabels, buildWidgetSnapshot } from './widget-snapshot';

const DEBOUNCE_MS = 600;

/**
 * documentation/Features/Android kezdőképernyő widget.md — keeps the native home-screen widgets fed.
 *
 * The widget process runs no JS, so this root service pre-computes a small `lm2_widgetSnapshot` blob
 * (today's calorie / macro progress, today's step count, logged-in flag, pre-localized label strings)
 * and writes it via `@capacitor/preferences` — the exact pattern of
 * `NotificationSchedulerService.writeBackgroundPlan()`. It rewrites on every relevant source-data
 * change (debounced), on `resume`, and post-login; then asks the native `Lm2Widget` plugin to redraw.
 * `ensureBackgroundRefresh()` arms a ~30-minute worker that patches only the step count while the app
 * is closed. No-op on web. See [[Backend-offline first]] — snapshot is local-only, renders Full-offline.
 */
@Injectable({ providedIn: 'root' })
export class WidgetSnapshotService {
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly authSession = inject(AuthSessionService);
  private readonly nutrition = inject(TodayNutritionService);
  private readonly stepLog = inject(DailyStepLogRepository);
  private readonly tuning = inject(NotificationTuningService);
  private readonly dataChange = inject(DataChangeNotifier);

  private started = false;
  private lastTick = 0;
  private pendingReload = false;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  /**
   * Fire-and-forget from `main.ts` `provideAppInitializer` and re-invoked post-login by `LoginPage`
   * (like `ActivityStepSyncService.init` / `NotificationSchedulerService.init`). Never blocks render.
   */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (this.started) {
      await this.writeAndRefresh(true);
      return;
    }
    this.started = true;

    void App.addListener('resume', () => void this.writeAndRefresh(true));

    this.lastTick = this.dataChange.tick();
    effect(
      () => {
        const tick = this.dataChange.tick();
        // Read every signal the snapshot derives from so a change re-runs this effect.
        this.nutrition.summary();
        this.stepLog.items();
        this.language.activeLanguage();
        this.authSession.isAuthenticated();
        this.tuning.tuning();
        const pulled = tick !== this.lastTick;
        this.lastTick = tick;
        this.scheduleWrite(pulled);
      },
      { injector: this.injector },
    );

    await this.writeAndRefresh(false);
    void Lm2Widget.ensureBackgroundRefresh().catch(() => undefined);
  }

  private scheduleWrite(pulled: boolean): void {
    this.pendingReload ||= pulled;
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle);
    }
    this.debounceHandle = setTimeout(() => {
      this.debounceHandle = null;
      const reload = this.pendingReload;
      this.pendingReload = false;
      void this.writeAndRefresh(reload);
    }, DEBOUNCE_MS);
  }

  /**
   * @param reload reload the source repositories first — needed after a delta pull (the non-cached
   * Meal / DailyStepLog signals go stale on a pull); a plain local write already bumped its signal.
   */
  private async writeAndRefresh(reload: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (reload) {
      await Promise.all([this.nutrition.load(), this.stepLog.load()]);
    }
    const snapshot = buildWidgetSnapshot({
      loggedIn: this.authSession.isAuthenticated(),
      lang: this.language.activeLanguage(),
      nutrition: this.nutrition.summary(),
      stepCount: this.stepLog.stepsForDay(today()),
      stepGoal: this.tuning.tuning().stepsLowThreshold,
      labels: this.resolveLabels(),
    });
    await Preferences.set({ key: WIDGET_SNAPSHOT_KEY, value: JSON.stringify(snapshot) });
    void Lm2Widget.refresh().catch(() => undefined);
  }

  private resolveLabels(): WidgetLabels {
    const out = {} as WidgetLabels;
    for (const key of Object.keys(WIDGET_LABEL_KEYS) as (keyof typeof WIDGET_LABEL_KEYS)[]) {
      out[key] = this.translate.instant(WIDGET_LABEL_KEYS[key]);
    }
    return out;
  }
}

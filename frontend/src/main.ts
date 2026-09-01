import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideApi } from './app/api/provide-api';
import { AppConfigService } from './app/core/config/app-config.service';
import { registerIcons } from './app/core/config/icons';
import { LanguageService } from './app/core/config/language.service';
import { ThemeService } from './app/core/config/theme.service';
import { apiBaseUrlInterceptor } from './app/core/api/api-base-url.interceptor';
import { AuthSessionService } from './app/core/session/auth-session.service';
import { authInterceptor } from './app/core/session/auth.interceptor';
import { ActivityStepSyncService } from './app/core/health/activity-step-sync.service';
import { NotificationSchedulerService } from './app/core/notifications/notification-scheduler.service';
import { NotificationSettingsService } from './app/core/notifications/notification-settings.service';
import { LocalDatabaseService } from './app/core/storage/local-database.service';
import { provideStorageBackend } from './app/core/storage/storage-backend.provider';
import { SyncEngineService } from './app/core/sync/sync-engine.service';

registerIcons();

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // authInterceptor must run before apiBaseUrlInterceptor: it matches on the request URL still
    // starting with "/api" to decide whether to attach the Bearer header. apiBaseUrlInterceptor
    // rewrites that relative URL to an absolute one on native, so if it ran first, authInterceptor's
    // check would never match there and every native request would go out unauthenticated.
    provideHttpClient(withInterceptors([authInterceptor, apiBaseUrlInterceptor])),
    // Empty basePath: the generated client's own paths already start with /api (relative on web,
    // rewritten to the native apiBaseUrl by apiBaseUrlInterceptor) — see that interceptor's comment.
    provideApi({ basePath: '' }),
    provideStorageBackend(),
    provideTranslateService({
      lang: 'hu',
      fallbackLang: 'hu',
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
    }),
    // documentation/Architektúra/Frontend.md "Indulási sorrend (cold start)": steps 2-4 block the
    // router's initial navigation (no network calls involved, so this doesn't violate "nincs
    // blokkoló hálózati hívás") — otherwise the auth guard would see a not-yet-restored session and
    // bounce a logged-in user to /login. Step 6 (SyncEngine) is deliberately NOT awaited here.
    provideAppInitializer(async () => {
      const languageService = inject(LanguageService);
      const themeService = inject(ThemeService);
      const authSession = inject(AuthSessionService);
      const localDb = inject(LocalDatabaseService);
      const syncEngine = inject(SyncEngineService);
      const stepSync = inject(ActivityStepSyncService);
      const notificationSettings = inject(NotificationSettingsService);
      const notificationScheduler = inject(NotificationSchedulerService);

      await Promise.all([
        languageService.init(),
        themeService.init(),
        authSession.restore(),
        notificationSettings.init(),
      ]);

      const userId = authSession.userId();
      if (userId !== null && Capacitor.isNativePlatform()) {
        await localDb.open(userId);
      }

      void syncEngine.init();
      // documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md: app-open
      // Health Connect pull + 7-day gap backfill. Not awaited — no blocking work at cold start.
      // Called unconditionally like syncEngine.init(): init() is a no-op on web / when Health
      // Connect is unavailable, syncNow() bails while logged out, and LoginPage re-invokes it after
      // an in-session login so a logged-out cold start still gets step sync without an app restart.
      void stepSync.init();
      // documentation/Features/Értesítések.md — cold-start step 6: re-schedule local notifications
      // from the local store. Not awaited. init() is a no-op on web; reconcile bails while logged
      // out / without notification permission, and LoginPage re-invokes it after an in-session login.
      void notificationScheduler.init();
    }),
  ],
})
  .then((appRef) => {
    // Runtime apiBaseUrl for native builds only; no blocking network call at cold start.
    void appRef.injector.get(AppConfigService).load();
  })
  .catch((err) => console.error(err));

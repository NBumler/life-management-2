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

      await Promise.all([languageService.init(), themeService.init(), authSession.restore()]);

      const userId = authSession.userId();
      if (userId !== null && Capacitor.isNativePlatform()) {
        await localDb.open(userId);
      }

      void syncEngine.init();
    }),
  ],
})
  .then((appRef) => {
    // Runtime apiBaseUrl for native builds only; no blocking network call at cold start.
    void appRef.injector.get(AppConfigService).load();
  })
  .catch((err) => console.error(err));

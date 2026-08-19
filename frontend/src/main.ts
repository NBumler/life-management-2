import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideApi } from './app/api/provide-api';
import { AppConfigService } from './app/core/config/app-config.service';
import { apiBaseUrlInterceptor } from './app/core/api/api-base-url.interceptor';
import { authInterceptor } from './app/core/session/auth.interceptor';
import { provideStorageBackend } from './app/core/storage/storage-backend.provider';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([apiBaseUrlInterceptor, authInterceptor])),
    // Empty basePath: the generated client's own paths already start with /api (relative on web,
    // rewritten to the native apiBaseUrl by apiBaseUrlInterceptor) — see that interceptor's comment.
    provideApi({ basePath: '' }),
    provideStorageBackend(),
    provideTranslateService({
      lang: 'hu',
      fallbackLang: 'hu',
      loader: provideTranslateHttpLoader({ prefix: '/assets/i18n/', suffix: '.json' }),
    }),
  ],
})
  .then((appRef) => {
    // Runtime apiBaseUrl for native builds only; no blocking network call at cold start.
    void appRef.injector.get(AppConfigService).load();
  })
  .catch((err) => console.error(err));

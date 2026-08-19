import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AppConfigService } from '../config/app-config.service';

/**
 * The generated OpenAPI client (frontend/src/app/api/) is configured with an empty basePath,
 * so its requests are relative paths like `/api/health` — correct as-is on web (dev proxy /
 * reverse proxy serve the same origin). On native there is no same-origin backend, so this
 * rewrites relative /api/... requests to the runtime apiBaseUrl from AppConfigService, which
 * already ends in `/api` (documentation/Architektúra/Fejlesztői környezet.md).
 */
export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) {
    return next(req);
  }
  const appConfig = inject(AppConfigService);
  const origin = appConfig.apiBaseUrl().replace(/\/api\/?$/, '');
  if (origin === '') {
    return next(req);
  }
  return next(req.clone({ url: origin + req.url }));
};

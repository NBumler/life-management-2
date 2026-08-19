import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthSessionService } from './auth-session.service';
import { TokenRefreshCoordinatorService } from './token-refresh-coordinator.service';

/** Set on requests that must bypass the Bearer header + 401-refresh handling (the refresh call itself). */
export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);

/**
 * documentation/Architektúra/Frontend.md `core/session/`: Bearer header + 401 → refresh → retry.
 * Only touches /api requests; the SyncEngine's outbox replay sets its own Authorization header
 * per documentation/Architektúra/Backend-offline first.md §6 and is unaffected by this interceptor
 * only insofar as it also goes through HttpClient — the header it sets is simply overwritten with
 * the same current token, which is harmless.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api') || req.context.get(SKIP_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  const authSession = inject(AuthSessionService);
  const coordinator = inject(TokenRefreshCoordinatorService);

  const token = authSession.getAccessToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || token === null) {
        return throwError(() => error);
      }
      return from(coordinator.refresh()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            return throwError(() => error);
          }
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${authSession.getAccessToken()}` },
          });
          return next(retryReq);
        }),
      );
    }),
  );
};

import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../api/api/auth.service';
import { AuthSessionService } from './auth-session.service';
import { SKIP_AUTH_INTERCEPTOR } from './auth.interceptor';

/**
 * Single-flight token refresh: concurrent 401s from several in-flight requests must trigger
 * exactly one POST /api/auth/refresh, not one per request.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshCoordinatorService {
  private readonly authApi = inject(AuthService);
  private readonly authSession = inject(AuthSessionService);

  private inFlight: Promise<boolean> | null = null;

  /** @returns true if the session now has a fresh access token, false if refresh failed (session cleared). */
  refresh(): Promise<boolean> {
    this.inFlight ??= this.doRefresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.authSession.getRefreshToken();
    if (refreshToken === null) {
      return false;
    }
    try {
      const tokens = await firstValueFrom(
        this.authApi.refresh(
          { refreshToken },
          'body',
          undefined,
          { context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true) },
        ),
      );
      await this.authSession.setTokens(tokens);
      return true;
    } catch {
      await this.authSession.clear();
      return false;
    }
  }
}

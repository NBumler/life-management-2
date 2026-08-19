import { Injectable, computed, inject, signal } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../api/api/auth.service';
import { AuthTokens } from '../../api/model/authTokens';
import { decodeAccessToken } from './jwt';

const KEY_ACCESS_TOKEN = 'lm2_access_token';
const KEY_REFRESH_TOKEN = 'lm2_refresh_token';

interface SessionState {
  userId: string;
  username: string;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
}

/**
 * documentation/Subfeatures/Bejelentkezés.md: access + refresh token in platform secure storage,
 * survives app updates. Cold start step 3 reads this before any other UI decision.
 *
 * documentation/Architektúra/Frontend.md restricts the generated OpenAPI client to the
 * SyncEngine and the HttpStorageBackend — credential login/logout is the one call that has no
 * local entity or outbox behind it, so it is handled here instead of in page code, keeping the
 * "page code never touches the generated client directly" rule intact everywhere else.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthService);
  private readonly _session = signal<SessionState | null>(null);
  readonly userId = computed(() => this._session()?.userId ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);

  private restored = false;

  /** Cold start: populate the in-memory signal from secure storage. Idempotent. */
  async restore(): Promise<void> {
    if (this.restored) {
      return;
    }
    this.restored = true;
    const [accessToken, refreshToken] = await Promise.all([
      SecureStorage.get(KEY_ACCESS_TOKEN) as Promise<string | null>,
      SecureStorage.get(KEY_REFRESH_TOKEN) as Promise<string | null>,
    ]);
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      return;
    }
    try {
      const claims = decodeAccessToken(accessToken);
      this._session.set({
        userId: claims.sub,
        username: claims.username,
        accessToken,
        accessTokenExpiresAt: claims.exp * 1000,
        refreshToken,
      });
    } catch {
      // Corrupted/unparseable token: treat as logged out rather than crash cold start.
      await this.clear();
    }
  }

  getAccessToken(): string | null {
    return this._session()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this._session()?.refreshToken ?? null;
  }

  accessTokenExpiresSoon(marginMs = 5000): boolean {
    const session = this._session();
    return session === null || session.accessTokenExpiresAt - Date.now() < marginMs;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    const claims = decodeAccessToken(tokens.accessToken);
    this._session.set({
      userId: claims.sub,
      username: claims.username,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: claims.exp * 1000,
      refreshToken: tokens.refreshToken,
    });
    await Promise.all([
      SecureStorage.set(KEY_ACCESS_TOKEN, tokens.accessToken),
      SecureStorage.set(KEY_REFRESH_TOKEN, tokens.refreshToken),
    ]);
  }

  /** Auth tokens only — the local DB and outbox are deliberately left untouched (documentation/Architektúra/Backend-offline first.md §12). */
  async clear(): Promise<void> {
    this._session.set(null);
    await Promise.all([SecureStorage.remove(KEY_ACCESS_TOKEN), SecureStorage.remove(KEY_REFRESH_TOKEN)]);
  }

  /** documentation/Features/Bejelentkezés.md: username + password, no offline login (Backend-offline first.md §12). */
  async login(username: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(this.authApi.login({ username, password }));
    await this.setTokens(tokens);
  }

  /**
   * documentation/Features/Bejelentkezés.md: local logout always succeeds; the server-side
   * refresh-token revoke is best-effort and does not block navigation or clearing the session.
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    await this.clear();
    if (refreshToken !== null) {
      this.authApi.logout({ refreshToken }).subscribe({ error: () => undefined });
    }
  }
}

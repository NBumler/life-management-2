import { Injectable, computed, signal } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

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
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
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
}

import { TestBed } from '@angular/core/testing';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { of } from 'rxjs';

import { AuthService } from '../../api/api/auth.service';
import { AuthTokens } from '../../api/model/authTokens';
import { AuthSessionService } from './auth-session.service';

function makeJwt(claims: Record<string, unknown>): string {
  const json = JSON.stringify(claims);
  const base64url = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${base64url}.signature`;
}

/**
 * `SecureStorage` is a Capacitor plugin proxy (`registerPlugin`, dynamic-imported web fallback) —
 * `spyOn(SecureStorage, 'get')` etc. does not reliably intercept calls made through it (the proxy's
 * own `get` trap resolves the real implementation regardless of own-property overrides). These
 * tests instead let the real web fallback run against the browser's `localStorage` (that is what
 * `SecureStorageWeb` is backed by — see node_modules/@aparajita/capacitor-secure-storage), and
 * assert on stored values directly through the same `SecureStorage` API the service itself uses.
 */
describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let authApi: any;

  const validAccessToken = makeJwt({ sub: 'user-1', username: 'alice', exp: Math.floor(Date.now() / 1000) + 3600 });
  const tokens: AuthTokens = { accessToken: validAccessToken, refreshToken: 'refresh-abc', expiresIn: 3600 };

  beforeEach(() => {
    localStorage.clear();
    authApi = jasmine.createSpyObj('AuthService', ['login', 'logout', 'refresh']);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authApi }],
    });
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => localStorage.clear());

  describe('before restore() / setTokens()', () => {
    it('has no session', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.userId()).toBeNull();
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it('accessTokenExpiresSoon() is true when there is no session at all', () => {
      expect(service.accessTokenExpiresSoon()).toBe(true);
    });
  });

  describe('restore()', () => {
    it('leaves the session empty when secure storage has nothing stored', async () => {
      await service.restore();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('populates the session from valid stored tokens', async () => {
      await SecureStorage.set('lm2_access_token', validAccessToken);
      await SecureStorage.set('lm2_refresh_token', 'refresh-abc');

      await service.restore();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.userId()).toBe('user-1');
      expect(service.getAccessToken()).toBe(validAccessToken);
      expect(service.getRefreshToken()).toBe('refresh-abc');
    });

    it('treats a corrupted/unparseable stored access token as logged out rather than crashing, and clears it', async () => {
      await SecureStorage.set('lm2_access_token', 'not-a-valid-jwt');
      await SecureStorage.set('lm2_refresh_token', 'refresh-abc');

      await service.restore();

      expect(service.isAuthenticated()).toBe(false);
      expect(await SecureStorage.get('lm2_access_token')).toBeNull();
      expect(await SecureStorage.get('lm2_refresh_token')).toBeNull();
    });

    it('is idempotent: a second call does not re-read from storage', async () => {
      await SecureStorage.set('lm2_access_token', validAccessToken);
      await SecureStorage.set('lm2_refresh_token', 'refresh-abc');
      await service.restore();
      expect(service.isAuthenticated()).toBe(true);

      // If restore() re-read now, it would find nothing and the session would be cleared.
      localStorage.clear();
      await service.restore();

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('setTokens()', () => {
    it('decodes claims, updates the signal, and persists both tokens to secure storage', async () => {
      await service.setTokens(tokens);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.userId()).toBe('user-1');
      expect(service.getAccessToken()).toBe(validAccessToken);
      expect(service.getRefreshToken()).toBe('refresh-abc');
      expect(await SecureStorage.get('lm2_access_token')).toBe(validAccessToken);
      expect(await SecureStorage.get('lm2_refresh_token')).toBe('refresh-abc');
    });
  });

  describe('accessTokenExpiresSoon()', () => {
    it('is true when the token expires within the margin', async () => {
      const soonToken = makeJwt({ sub: 'user-1', username: 'alice', exp: Math.floor(Date.now() / 1000) + 2 });
      await service.setTokens({ accessToken: soonToken, refreshToken: 'r', expiresIn: 2 });

      expect(service.accessTokenExpiresSoon(5000)).toBe(true);
    });

    it('is false when the token has plenty of time left', async () => {
      await service.setTokens(tokens);

      expect(service.accessTokenExpiresSoon(5000)).toBe(false);
    });
  });

  describe('clear()', () => {
    it('clears the in-memory session and removes both keys from secure storage', async () => {
      await service.setTokens(tokens);

      await service.clear();

      expect(service.isAuthenticated()).toBe(false);
      expect(await SecureStorage.get('lm2_access_token')).toBeNull();
      expect(await SecureStorage.get('lm2_refresh_token')).toBeNull();
    });
  });

  describe('login()', () => {
    it('calls the generated AuthService and stores the returned tokens', async () => {
      authApi.login.and.returnValue(of(tokens));

      await service.login('alice', 'hunter2');

      expect(authApi.login).toHaveBeenCalledWith({ username: 'alice', password: 'hunter2' });
      expect(service.isAuthenticated()).toBe(true);
      expect(await SecureStorage.get('lm2_access_token')).toBe(validAccessToken);
    });
  });

  describe('logout()', () => {
    it('clears the local session and best-effort revokes the refresh token server-side', async () => {
      await service.setTokens(tokens);
      authApi.logout.and.returnValue(of(undefined));

      await service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(authApi.logout).toHaveBeenCalledWith({ refreshToken: 'refresh-abc' });
    });

    it('does not call the server when there was no refresh token to begin with', async () => {
      await service.logout();

      expect(authApi.logout).not.toHaveBeenCalled();
    });
  });
});

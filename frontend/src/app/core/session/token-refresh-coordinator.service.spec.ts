import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../../api/api/auth.service';
import { AuthTokens } from '../../api/model/authTokens';
import { AuthSessionService } from './auth-session.service';
import { TokenRefreshCoordinatorService } from './token-refresh-coordinator.service';

describe('TokenRefreshCoordinatorService', () => {
  let coordinator: TokenRefreshCoordinatorService;
  // See auth-session.service.spec.ts: AuthService's generated `refresh()` is overloaded on
  // `observe`, which fights jasmine.SpyObj<AuthService>'s return-type inference for no benefit here.
  let authApi: any;
  let authSession: jasmine.SpyObj<AuthSessionService>;

  const tokens: AuthTokens = { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 3600 };

  beforeEach(() => {
    authApi = jasmine.createSpyObj('AuthService', ['refresh']);
    authSession = jasmine.createSpyObj('AuthSessionService', ['getRefreshToken', 'setTokens', 'clear']);
    authSession.setTokens.and.resolveTo(undefined);
    authSession.clear.and.resolveTo(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authApi },
        { provide: AuthSessionService, useValue: authSession },
      ],
    });
    coordinator = TestBed.inject(TokenRefreshCoordinatorService);
  });

  it('returns false immediately, without calling the API, when there is no refresh token', async () => {
    authSession.getRefreshToken.and.returnValue(null);

    const result = await coordinator.refresh();

    expect(result).toBe(false);
    expect(authApi.refresh).not.toHaveBeenCalled();
  });

  it('on success: stores the new tokens and resolves true', async () => {
    authSession.getRefreshToken.and.returnValue('refresh-abc');
    authApi.refresh.and.returnValue(of(tokens));

    const result = await coordinator.refresh();

    expect(result).toBe(true);
    expect(authApi.refresh).toHaveBeenCalledWith({ refreshToken: 'refresh-abc' }, 'body', undefined, jasmine.any(Object));
    expect(authSession.setTokens).toHaveBeenCalledWith(tokens);
    expect(authSession.clear).not.toHaveBeenCalled();
  });

  it('on API failure: clears the session and resolves false', async () => {
    authSession.getRefreshToken.and.returnValue('refresh-abc');
    authApi.refresh.and.returnValue(throwError(() => new Error('refresh rejected')));

    const result = await coordinator.refresh();

    expect(result).toBe(false);
    expect(authSession.clear).toHaveBeenCalled();
    expect(authSession.setTokens).not.toHaveBeenCalled();
  });

  it('coalesces concurrent calls into a single in-flight request (single-flight)', async () => {
    const subject = new Subject<AuthTokens>();
    authSession.getRefreshToken.and.returnValue('refresh-abc');
    authApi.refresh.and.returnValue(subject.asObservable());

    const p1 = coordinator.refresh();
    const p2 = coordinator.refresh();
    expect(authApi.refresh).toHaveBeenCalledTimes(1);

    subject.next(tokens);
    subject.complete();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh request for a call made after the previous refresh has already completed', async () => {
    authSession.getRefreshToken.and.returnValue('refresh-abc');
    authApi.refresh.and.returnValues(of(tokens), of(tokens));

    await coordinator.refresh();
    await coordinator.refresh();

    expect(authApi.refresh).toHaveBeenCalledTimes(2);
  });
});

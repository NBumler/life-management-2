import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AuthSessionService } from './auth-session.service';
import { SKIP_AUTH_INTERCEPTOR, authInterceptor } from './auth.interceptor';
import { TokenRefreshCoordinatorService } from './token-refresh-coordinator.service';

// documentation/Architektúra/Frontend.md `core/session/`: Bearer header + 401 → refresh → retry.
describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authSession: jasmine.SpyObj<AuthSessionService>;
  let coordinator: jasmine.SpyObj<TokenRefreshCoordinatorService>;

  beforeEach(() => {
    authSession = jasmine.createSpyObj('AuthSessionService', ['getAccessToken']);
    coordinator = jasmine.createSpyObj('TokenRefreshCoordinatorService', ['refresh']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: authSession },
        { provide: TokenRefreshCoordinatorService, useValue: coordinator },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('attaches a Bearer header for /api requests when a token exists', () => {
    authSession.getAccessToken.and.returnValue('tok-123');

    httpClient.get('/api/things').subscribe();

    const req = httpMock.expectOne('/api/things');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush({});
  });

  it('sends no Authorization header when there is no token', () => {
    authSession.getAccessToken.and.returnValue(null);

    httpClient.get('/api/things').subscribe();

    const req = httpMock.expectOne('/api/things');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not touch non-/api requests at all', () => {
    authSession.getAccessToken.and.returnValue('tok-123');

    httpClient.get('https://external.example.com/thing').subscribe();

    const req = httpMock.expectOne('https://external.example.com/thing');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    expect(authSession.getAccessToken).not.toHaveBeenCalled();
  });

  it('respects SKIP_AUTH_INTERCEPTOR even on an /api URL (the refresh call itself)', () => {
    authSession.getAccessToken.and.returnValue('tok-123');

    httpClient.get('/api/auth/refresh', { context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true) }).subscribe();

    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    expect(authSession.getAccessToken).not.toHaveBeenCalled();
  });

  it('on 401 with no initial token, propagates the error without attempting a refresh', () => {
    authSession.getAccessToken.and.returnValue(null);
    let error: unknown;

    httpClient.get('/api/things').subscribe({ error: (e: unknown) => (error = e) });

    const req = httpMock.expectOne('/api/things');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(coordinator.refresh).not.toHaveBeenCalled();
  });

  it('on 401, a successful refresh retries the original request with the new token', fakeAsync(() => {
    authSession.getAccessToken.and.returnValues('old-tok', 'new-tok');
    coordinator.refresh.and.resolveTo(true);
    let result: unknown;

    httpClient.get('/api/things').subscribe({ next: (r) => (result = r) });

    const req1 = httpMock.expectOne('/api/things');
    expect(req1.request.headers.get('Authorization')).toBe('Bearer old-tok');
    req1.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    tick();

    const req2 = httpMock.expectOne('/api/things');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer new-tok');
    req2.flush({ ok: true });

    tick();

    expect(result).toEqual({ ok: true });
  }));

  it('on 401, a failed refresh propagates the original error and does not retry', fakeAsync(() => {
    authSession.getAccessToken.and.returnValue('old-tok');
    coordinator.refresh.and.resolveTo(false);
    let error: unknown;

    httpClient.get('/api/things').subscribe({ error: (e: unknown) => (error = e) });

    const req = httpMock.expectOne('/api/things');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    tick();

    expect(error).toBeTruthy();
    expect((error as { status: number }).status).toBe(401);
  }));
});

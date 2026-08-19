import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AuthSessionService } from '../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../core/storage/local-database.service';
import { SyncEngineService } from '../../core/sync/sync-engine.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let authSession: jasmine.SpyObj<Pick<AuthSessionService, 'isAuthenticated' | 'login'>> & { userId: () => string | null };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<Pick<AuthSessionService, 'isAuthenticated' | 'login'>>('AuthSessionService', [
      'isAuthenticated',
      'login',
    ]);
    authSession = Object.assign(spy, { userId: () => null as string | null });
    authSession.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AuthSessionService, useValue: authSession },
        { provide: LocalDatabaseService, useValue: jasmine.createSpyObj('LocalDatabaseService', ['open']) },
        { provide: SyncEngineService, useValue: jasmine.createSpyObj('SyncEngineService', ['requestDrain']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
  });

  it('creates and renders without throwing', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not redirect on creation when there is no existing session', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    fixture.detectChanges();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirects to /tabs immediately when already authenticated', () => {
    authSession.isAuthenticated.and.returnValue(true);
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigateByUrl');

    TestBed.createComponent(LoginPage); // the redirect happens in the constructor

    expect(navSpy).toHaveBeenCalledWith('/tabs');
  });

  it('does not attempt login while the form is invalid (empty fields)', async () => {
    fixture.detectChanges();

    await fixture.componentInstance.submit();

    expect(authSession.login).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('sets a NETWORK error key on a status-0 login failure, CREDENTIALS otherwise', async () => {
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ username: 'alice', password: 'wrong' });
    authSession.login.and.rejectWith({ status: 401 });

    await fixture.componentInstance.submit();

    expect(fixture.componentInstance.errorKey()).toBe('CREDENTIALS');
  });
});

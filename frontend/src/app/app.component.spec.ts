import { Component, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthSessionService } from './core/session/auth-session.service';
import { AppComponent } from './app.component';

@Component({ selector: 'app-blank', template: '' })
class BlankComponent {}

describe('AppComponent', () => {
  let authenticated: WritableSignal<boolean>;
  let router: Router;
  let fixture: ComponentFixture<AppComponent>;

  async function setup(initiallyAuthenticated: boolean): Promise<void> {
    authenticated = signal(initiallyAuthenticated);
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'login', component: BlankComponent },
          { path: 'tabs', component: BlankComponent },
        ]),
        { provide: AuthSessionService, useValue: { isAuthenticated: authenticated } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create the app', async () => {
    await setup(false);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('redirects to /login the moment an authenticated session is lost', async () => {
    await setup(true);
    await router.navigateByUrl('/tabs');
    expect(router.url).toBe('/tabs');

    authenticated.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/login');
  });

  it('does not redirect on a logged-out cold start (no auth transition)', async () => {
    await setup(false);
    const navSpy = spyOn(router, 'navigateByUrl').and.callThrough();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(navSpy).not.toHaveBeenCalled();
  });

  it('does not navigate again when the user is already on /login', async () => {
    await setup(true);
    await router.navigateByUrl('/login');
    const navSpy = spyOn(router, 'navigateByUrl').and.callThrough();

    authenticated.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navSpy).not.toHaveBeenCalled();
    expect(router.url).toBe('/login');
  });
});

import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { AuthSessionService } from './core/session/auth-session.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  /**
   * documentation/Features/Bejelentkezés.md "Session": a failed silent refresh (or a 401 in the
   * sync drain) clears the session via AuthSessionService.clear(). Without this, the user would
   * keep looking at the now-unauthenticated screen until their next guarded navigation — this
   * effect makes the redirect to /login active the moment auth is lost. It only fires on an
   * authenticated → unauthenticated transition, so a logged-out cold start (handled by the auth
   * guard) does not trigger a second navigation.
   */
  private wasAuthenticated = this.authSession.isAuthenticated();

  constructor() {
    effect(() => {
      const authenticated = this.authSession.isAuthenticated();
      const sessionLost = this.wasAuthenticated && !authenticated;
      this.wasAuthenticated = authenticated;
      if (sessionLost && !this.router.url.startsWith('/login')) {
        void this.router.navigateByUrl('/login');
      }
    });
  }
}

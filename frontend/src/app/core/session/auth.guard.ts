import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = () => {
  if (inject(AuthSessionService).isAuthenticated()) {
    return true;
  }
  return inject(Router).parseUrl('/login');
};

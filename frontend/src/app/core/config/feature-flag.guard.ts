import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { FeatureFlagKey, FeatureFlagsService } from './feature-flags.service';

/**
 * documentation/Architektúra/Frontend.md: "A letiltott tab route-jai guardolva vannak: deep link →
 * default tab." A tab whose flag is off is already hidden from the bar (`tabs.page.ts`); this stops
 * a restored URL or a hand-typed deep link from rendering its route tree anyway. Redirects to Menü —
 * the always-on default tab (same file: "Login utáni default tab").
 */
export function featureFlagGuard(flag: FeatureFlagKey): CanActivateFn {
  return () => (inject(FeatureFlagsService).isEnabled(flag) ? true : inject(Router).parseUrl('/tabs/menu'));
}

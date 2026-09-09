import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { FeatureFlagKey, FeatureFlagsService } from './feature-flags.service';
import { firstEnabledTabRoute } from './tab-registry';

/**
 * documentation/Architektúra/Frontend.md: "A letiltott tab route-jai guardolva vannak: deep link →
 * default tab." A tab whose flag is off is already hidden from the bar (`tabs.page.ts`); this stops
 * a restored URL or a hand-typed deep link from rendering its route tree anyway. Redirects to the
 * registry's first enabled tab (`firstEnabledTabRoute`) — the same "default tab" the post-login
 * `''` redirect uses; Menü is always enabled, so there is always a target.
 */
export function featureFlagGuard(flag: FeatureFlagKey): CanActivateFn {
  return () => {
    const featureFlags = inject(FeatureFlagsService);
    return featureFlags.isEnabled(flag) ? true : inject(Router).parseUrl(firstEnabledTabRoute(featureFlags));
  };
}

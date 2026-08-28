import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { featureFlagGuard } from './feature-flag.guard';
import { FeatureFlagsService } from './feature-flags.service';

describe('featureFlagGuard', () => {
  let featureFlags: jasmine.SpyObj<FeatureFlagsService>;
  let router: jasmine.SpyObj<Pick<Router, 'parseUrl'>>;

  beforeEach(() => {
    featureFlags = jasmine.createSpyObj<FeatureFlagsService>('FeatureFlagsService', ['isEnabled']);
    router = jasmine.createSpyObj<Pick<Router, 'parseUrl'>>('Router', ['parseUrl']);
    router.parseUrl.and.callFake((url: string) => ({ url }) as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureFlagsService, useValue: featureFlags },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      featureFlagGuard('tab.edzes')(new ActivatedRouteSnapshot(), {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('allows activation when the tab flag is on', () => {
    featureFlags.isEnabled.and.returnValue(true);

    expect(run()).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects to the default tab when the flag is off', () => {
    featureFlags.isEnabled.and.returnValue(false);

    const result = run();

    expect(featureFlags.isEnabled).toHaveBeenCalledWith('tab.edzes');
    expect(router.parseUrl).toHaveBeenCalledWith('/tabs/menu');
    expect((result as unknown as { url: string }).url).toBe('/tabs/menu');
  });
});

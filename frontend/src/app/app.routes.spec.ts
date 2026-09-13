import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Route, ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { routes } from './app.routes';
import { FeatureFlagKey, FeatureFlagsService } from './core/config/feature-flags.service';

/**
 * documentation/Architektúra/Frontend.md: "A letiltott tab/al-oldal route-jai guardolva vannak:
 * deep link → default tab." Regression cover for backlog/013-... siblings: every feature-flagged
 * menu / tasks sub-tree must carry its own `featureFlagGuard`, not just hide its hub tile.
 * The redirect target is `firstEnabledTabRoute` (backlog/096) — the registry's first enabled tab.
 */
describe('app.routes feature-flag guards', () => {
  /** Walk the tree, joining `path` segments, and return the node at the given slash path. */
  function nodeAt(path: string): Route {
    const segments = path.split('/');
    let level: Route[] = routes;
    let node: Route | undefined;
    for (const segment of segments) {
      node = level.find((r) => r.path === segment);
      if (!node) throw new Error(`route "${path}" not found (missing segment "${segment}")`);
      level = node.children ?? [];
    }
    return node!;
  }

  /** Run the node's first `canActivate` guard with every flag on except `off`. */
  function guardResult(node: Route, off: FeatureFlagKey): boolean | UrlTree {
    const guard = (node.canActivate ?? [])[0] as CanActivateFn | undefined;
    if (!guard) throw new Error('node has no canActivate guard');

    const router = jasmine.createSpyObj<Pick<Router, 'parseUrl'>>('Router', ['parseUrl']);
    router.parseUrl.and.callFake((url: string) => ({ url }) as unknown as UrlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureFlagsService, useValue: { isEnabled: (k: FeatureFlagKey) => k !== off } },
        { provide: Router, useValue: router },
      ],
    });

    return TestBed.runInInjectionContext(() =>
      guard(new ActivatedRouteSnapshot(), {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  const cases: { path: string; flag: FeatureFlagKey }[] = [
    { path: 'tabs/menu/shopping', flag: 'menu.bevasarlas' },
    { path: 'tabs/menu/gear', flag: 'menu.gearcheck' },
    { path: 'tabs/menu/tura', flag: 'menu.tura' },
    { path: 'tabs/tasks/life-plans', flag: 'feladatok.eletTervek' },
    { path: 'tabs/tasks/events', flag: 'feladatok.esemenyek' },
    { path: 'tabs/tasks/calendar', flag: 'feladatok.naptar' },
  ];

  for (const { path, flag } of cases) {
    it(`"${path}" redirects to the first enabled tab (/tabs/home) when "${flag}" is off`, () => {
      // `guardResult` leaves every tab flag on, so the registry's first entry (tab.kezdolap) wins.
      const result = guardResult(nodeAt(path), flag) as unknown as { url: string };
      expect(result.url).toBe('/tabs/home');
    });

    it(`"${path}" activates when "${flag}" is on`, () => {
      expect(guardResult(nodeAt(path), 'tab.kaja' as FeatureFlagKey)).toBe(true);
    });
  }

  it('"tabs/home" carries its own tab.kezdolap guard and falls through to the next enabled tab', () => {
    const result = guardResult(nodeAt('tabs/home'), 'tab.kezdolap') as unknown as { url: string };
    expect(result.url).toBe('/tabs/food');
  });

  it('"tabs/home" activates when tab.kezdolap is on', () => {
    expect(guardResult(nodeAt('tabs/home'), 'tab.kaja' as FeatureFlagKey)).toBe(true);
  });
});

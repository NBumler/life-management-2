import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { ExternalBrowserService } from './external-browser.service';

describe('ExternalBrowserService', () => {
  let service: ExternalBrowserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExternalBrowserService);
  });

  // The native branch delegates to @capacitor/browser, whose web shim also falls back to
  // window.open, so it is not distinguishable from the web branch under Karma/Chrome. The
  // native path is only meaningful on a device; callers mock this service in their own specs.
  it('on the web opens the URL in a new tab with rel=noopener', async () => {
    expect(Capacitor.isNativePlatform()).toBe(false);
    const open = spyOn(window, 'open').and.returnValue(null);

    await service.open('https://example.com/weather');

    expect(open).toHaveBeenCalledWith('https://example.com/weather', '_blank', 'noopener');
  });
});

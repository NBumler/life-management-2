// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// backlog/147 — make a failing random-order run reproducible and surface slow specs: the seed is logged
// up front (replay it with `JASMINE_SEED=<seed> npm run test:ci`, see karma.conf.js), and every spec
// slower than SLOW_SPEC_MS is reported with its duration (a stalled spec is the usual timeout culprit).
const SLOW_SPEC_MS = 1000;
jasmine.getEnv().addReporter({
  jasmineStarted: (info) => console.log(`[jasmine] random order seed: ${info.order.seed}`),
  specDone: (result) => {
    if ((result.duration ?? 0) > SLOW_SPEC_MS) {
      console.warn(`[jasmine] slow spec (${result.duration} ms): ${result.fullName}`);
    }
  },
});

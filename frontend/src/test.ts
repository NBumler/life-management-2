// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

import { registerIcons } from './app/core/config/icons';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// backlog/158 — the same icon registry main.ts installs; without it every <ion-icon> in a spec
// logs an Ionicons warning (+ a "Failed to construct 'URL'" TypeError from the network fallback).
registerIcons();

// backlog/157/158 — an icon missing from core/config/icons.ts renders blank on-device, so an
// Ionicons "Could not load icon" warning fails the spec that rendered it instead of being noise.
// ion-icon loads lazily, so a warning can land just after its spec; it then fails the next one.
const ionIconWarnings: string[] = [];
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('[Ionicons Warning]')) {
    ionIconWarnings.push(args[0]);
  }
  originalWarn(...args);
};
afterEach(() => {
  const warnings = ionIconWarnings.splice(0);
  if (warnings.length > 0) {
    fail(`Unregistered ion-icon (add it to core/config/icons.ts): ${warnings.join(' | ')}`);
  }
});

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

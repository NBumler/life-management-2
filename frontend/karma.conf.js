// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // backlog/147: the run's random-order seed is logged by src/test.ts — replay a failing order
        // with `JASMINE_SEED=<seed> npm run test:ci`.
        ...(process.env.JASMINE_SEED ? { seed: process.env.JASMINE_SEED } : {}),
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/app'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    customLaunchers: {
      // CI / non-interactive local runs: `ng test -- --browsers=ChromeHeadlessCI --watch=false`.
      // backlog/147: a long run must not get its timers throttled (Chrome throttles background /
      // occluded renderers, which surfaced as random 5 s Jasmine timeouts on trivial specs), and no
      // spec should need a real audio device.
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--mute-audio',
        ],
      },
    },
    singleRun: false,
    restartOnFileChange: true
  });
};

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hu.bumler.lm2',
  appName: 'Life Management 2.0',
  webDir: 'www',
  // Chromium blocks plain-HTTP XHR/fetch from an https:// origin as Mixed Content, even when
  // network_security_config.xml permits cleartext at the OS level. Local LAN dev installs (see
  // scripts/install-android.ps1) point at a plain-http backend, so they need the WebView itself
  // served over http:// too. Never set for production builds.
  ...(process.env.LM2_CAP_HTTP_SCHEME === '1' ? { server: { androidScheme: 'http' } } : {}),
};

export default config;

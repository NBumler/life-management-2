#!/usr/bin/env node
// Rasterises assets/notification-icon.svg into the Android status-bar (small) notification icon at
// every density, plus regenerates the web favicon from assets/icon-only.svg.
//
// `@capacitor/assets` (run first by `npm run gen:assets`) covers the launcher icon, adaptive layers
// and splash screens, but NOT the notification small icon — Android status-bar icons are a
// white-on-transparent alpha silhouette the OS tints itself (see capacitor.config.ts →
// plugins.LocalNotifications.smallIcon / iconColor, and ReminderWorker.kt for the background worker).
// This script fills that gap. Re-run whenever assets/notification-icon.svg or assets/icon-only.svg
// changes; commit the generated PNGs.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(here, '..');
const res = resolve(frontend, 'android/app/src/main/res');

// Android status-bar icon: 24dp baseline. mdpi=24px, scaling up by density bucket.
const NOTIFICATION_DENSITIES = [
  ['drawable-mdpi', 24],
  ['drawable-hdpi', 36],
  ['drawable-xhdpi', 48],
  ['drawable-xxhdpi', 72],
  ['drawable-xxxhdpi', 96],
];

async function genNotificationIcons() {
  const svg = resolve(frontend, 'assets/notification-icon.svg');
  for (const [dir, size] of NOTIFICATION_DENSITIES) {
    const outDir = resolve(res, dir);
    mkdirSync(outDir, { recursive: true });
    const out = resolve(outDir, 'ic_stat_notify.png');
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log(`CREATE ${dir}/ic_stat_notify.png (${size}x${size})`);
  }
}

async function genFavicon() {
  const svg = resolve(frontend, 'assets/icon-only.svg');
  const out = resolve(frontend, 'src/assets/icon/favicon.png');
  await sharp(svg, { density: 384 }).resize(64, 64).png().toFile(out);
  console.log('CREATE src/assets/icon/favicon.png (64x64)');
}

await genNotificationIcons();
await genFavicon();

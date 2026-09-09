import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * documentation/Architektúra/Frontend.md — Capacitor plugin list (`@capacitor/browser`).
 * Opens an external URL outside the app's own view: native → in-app / system browser via
 * `@capacitor/browser`; web → a new browser tab. Used by the GearCheck weather entry
 * (documentation/Subfeatures/Pakolás.md, backlog/086).
 */
@Injectable({ providedIn: 'root' })
export class ExternalBrowserService {
  async open(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
      return;
    }
    window.open(url, '_blank', 'noopener');
  }
}

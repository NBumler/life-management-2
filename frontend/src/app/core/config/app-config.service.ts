import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

interface AppConfig {
  apiBaseUrl: string;
}

/**
 * documentation/Architektúra/Fejlesztői környezet.md "API base URL a kliensen":
 * web = relative /api (dev proxy / reverse proxy); native = runtime asset
 * assets/config/app-config.json, rewritten in place by scripts/install-android.ps1
 * for the target host without a rebuild.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);

  private readonly _apiBaseUrl = signal<string>('/api');
  readonly apiBaseUrl = this._apiBaseUrl.asReadonly();

  /** Non-blocking: called after bootstrap in main.ts, never on the native cold-start path. */
  async load(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const config = await firstValueFrom(this.http.get<AppConfig>('assets/config/app-config.json'));
    this._apiBaseUrl.set(config.apiBaseUrl);
  }
}

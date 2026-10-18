import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { TrackingFix } from './location-tracking.service';
import { TRACK_BUFFER_PERSIST_EVERY_N_POINTS } from './tracking-config';

const PREFERENCES_KEY_PREFIX = 'lm2_track_buffer_';

/**
 * backlog/150 — eszköz-lokális, append-only raw-point buffer for a live GPS session (bike Pontos
 * mode, later the #106 hike tracker). Survives an app kill/restart (`Preferences`, same pattern as
 * `ClimbingLiveSessionService`'s draft); cleared once the session is saved or discarded. Never
 * synced — only the aggregated `BikeRideLog` values go through the outbox.
 */
@Injectable({ providedIn: 'root' })
export class TrackBufferService {
  private points: TrackingFix[] = [];
  private sessionKind: string | null = null;
  private unflushedCount = 0;

  /** Re-reads a buffer left over from before an app kill — call on entry to the live screen. */
  async restore(sessionKind: string): Promise<TrackingFix[]> {
    this.sessionKind = sessionKind;
    const stored = await Preferences.get({ key: this.key() });
    this.points = stored.value ? (JSON.parse(stored.value) as TrackingFix[]) : [];
    this.unflushedCount = 0;
    return [...this.points];
  }

  async append(fix: TrackingFix): Promise<void> {
    this.points.push(fix);
    this.unflushedCount++;
    if (this.unflushedCount >= TRACK_BUFFER_PERSIST_EVERY_N_POINTS) {
      await this.flush();
    }
  }

  current(): readonly TrackingFix[] {
    return this.points;
  }

  /** Forces a write even if the point count hasn't reached the batch threshold — call before pause/stop. */
  async flush(): Promise<void> {
    if (this.sessionKind === null) {
      return;
    }
    await Preferences.set({ key: this.key(), value: JSON.stringify(this.points) });
    this.unflushedCount = 0;
  }

  async clear(): Promise<void> {
    if (this.sessionKind !== null) {
      await Preferences.remove({ key: this.key() });
    }
    this.points = [];
    this.unflushedCount = 0;
  }

  private key(): string {
    return `${PREFERENCES_KEY_PREFIX}${this.sessionKind}`;
  }
}

import { Preferences } from '@capacitor/preferences';

/**
 * backlog/106 — one GPS session at a time: the live bike ride and the hike navigation drive the same
 * background-geolocation plugin, so neither may start while the other has a draft (running, paused or
 * waiting for its summary). The drafts' `Preferences` keys are the lock — no separate state to drift.
 */
export type GpsSessionKind = 'bike' | 'hike';

export const BIKE_LIVE_DRAFT_KEY = 'lm2_bike_live_draft';
export const HIKE_NAVIGATION_DRAFT_KEY = 'lm2_hike_navigation_draft';

/** Whether the other kind of GPS session has a draft. */
export async function otherGpsSessionActive(self: GpsSessionKind): Promise<boolean> {
  const key = self === 'bike' ? HIKE_NAVIGATION_DRAFT_KEY : BIKE_LIVE_DRAFT_KEY;
  return (await Preferences.get({ key })).value !== null;
}

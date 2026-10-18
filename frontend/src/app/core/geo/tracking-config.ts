/**
 * backlog/150 — tunable constants for the GPS tracking layer (Pontos and Becsült modes). Kept out of
 * `location-tracking.service.ts` so every threshold lives in one place.
 */

/** Suppresses updates while stationary (parked / standing still) to cut down on noise. */
export const LIVE_DISTANCE_FILTER_METERS = 5;

/** A fix less accurate than this is rejected (flips `weakSignal`, not forwarded to `onFix`). */
export const MAX_ACCEPTED_ACCURACY_METERS = 30;

/** A fix implying a faster speed than this since the previous accepted one is an implausible jump and is rejected. */
export const MAX_PLAUSIBLE_SPEED_KMH = 80;

/** A recorded track is resampled at this spacing for the DEM lookup — dense enough for real climbs, sparse enough to smooth GPS jitter. */
export const ELEVATION_SAMPLE_SPACING_METERS = 50;

/** `TrackBufferService` flushes to `Preferences` after this many appended points, not on every single one (write-amplification on a multi-hour ride). */
export const TRACK_BUFFER_PERSIST_EVERY_N_POINTS = 10;

/** Becsült mode: at the start and the end fix we wait this long for a good fix, then take the best one seen. */
export const ENDPOINT_FIX_TIMEOUT_SECONDS = 20;

/** Becsült mode: an endpoint fix at least this accurate ends the wait early. */
export const ENDPOINT_FIX_GOOD_ACCURACY_METERS = 20;

/** Becsült mode: a lower estimated average speed is suspicious (loop ride, near-loop, big detour) → warn and ask for the distance. */
export const MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH = 2;

/** Becsült mode, rough fallback (no route on the device network): straight line × the road network's typical circuity (1.2–1.4). */
export const ROAD_CIRCUITY_FACTOR = 1.3;

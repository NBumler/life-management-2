/**
 * backlog/150 — tunable constants for the GPS tracking layer (Pontos mode). Kept out of
 * `location-tracking.service.ts` so every threshold lives in one place.
 */

/** Suppresses updates while stationary (parked / standing still) to cut down on noise. */
export const LIVE_DISTANCE_FILTER_METERS = 5;

/** A fix less accurate than this is rejected (flips `weakSignal`, not forwarded to `onFix`). */
export const MAX_ACCEPTED_ACCURACY_METERS = 30;

/** A fix implying a faster speed than this since the previous accepted one is an implausible jump and is rejected. */
export const MAX_PLAUSIBLE_SPEED_KMH = 80;

/** `TrackBufferService` flushes to `Preferences` after this many appended points, not on every single one (write-amplification on a multi-hour ride). */
export const TRACK_BUFFER_PERSIST_EVERY_N_POINTS = 10;

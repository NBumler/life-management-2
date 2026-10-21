/**
 * backlog/106 — tunable constants for hike navigation along a planned route (progress, off-route
 * detection, turn instructions and their announcements). Kept in one place, like `tracking-config.ts`.
 */

/** Further than this from the planned line counts towards "off route"… */
export const OFF_ROUTE_ENTER_METERS = 50;

/** …and closer than this counts as back on it; the gap keeps a walker near the edge from flapping between the two. */
export const OFF_ROUTE_EXIT_METERS = 30;

/** This many consecutive fixes beyond `OFF_ROUTE_ENTER_METERS` before "off route" is raised — one noisy fix is not a detour. */
export const OFF_ROUTE_CONFIRM_FIXES = 2;

/**
 * The next fix is matched only to the stretch of the route from this far behind the current progress…
 * (an out-and-back or loop route passes the same place twice — the window keeps the walker on the right leg).
 */
export const PROGRESS_SEARCH_BACK_METERS = 100;

/** …to this far ahead of it. Outside the window (e.g. after a long GPS gap or a shortcut) the whole route is searched instead. */
export const PROGRESS_SEARCH_AHEAD_METERS = 1_000;

/** Within this distance of the route's end (and on the route) the hike counts as arrived. */
export const ARRIVAL_METERS = 30;

/** The route is simplified (Douglas–Peucker) with this tolerance before turns are looked for, so a wiggly path is not a string of turns. */
export const TURN_SIMPLIFY_TOLERANCE_METERS = 10;

/** A turn's angle is measured between the bearing this far before the vertex and this far after it. */
export const TURN_BEARING_SPAN_METERS = 25;

/** A smaller change of direction is not a turn. */
export const MIN_TURN_DEGREES = 35;

/** Below this a turn is "slight", … */
export const SLIGHT_TURN_MAX_DEGREES = 60;

/** …below this a plain turn, … */
export const TURN_MAX_DEGREES = 130;

/** …below this "sharp", above it a U-turn (e.g. the turning point of an out-and-back route). */
export const SHARP_TURN_MAX_DEGREES = 165;

/** Turns closer to each other than this are one turn (the sharper one) — e.g. a slightly offset crossing. */
export const TURN_MERGE_METERS = 40;

/**
 * With the trail network known along the route, a turn on a trail is kept only within this distance of a
 * junction (a hairpin on a single trail needs no instruction); a route vertex further than this from any
 * trail (a manually drawn stretch) keeps its turns.
 */
export const TURN_JUNCTION_RADIUS_METERS = 20;

/** First announcement of a turn, this far before it… */
export const TURN_ANNOUNCE_FAR_METERS = 150;

/** …and the second ("now"), this far before it. */
export const TURN_ANNOUNCE_NEAR_METERS = 30;

/** A turn this far behind the walker is passed and never announced any more. */
export const TURN_PASSED_METERS = 10;

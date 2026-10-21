import {
  ARRIVAL_METERS,
  OFF_ROUTE_CONFIRM_FIXES,
  OFF_ROUTE_ENTER_METERS,
  OFF_ROUTE_EXIT_METERS,
  TURN_ANNOUNCE_FAR_METERS,
  TURN_ANNOUNCE_NEAR_METERS,
  TURN_PASSED_METERS,
} from './navigation-config';
import { RouteLine, RouteProjection, projectOntoRoute } from './route-progress';
import { RouteTurn } from './turn-instructions';

/**
 * backlog/106 — the navigation state machine, one GPS fix at a time: progress along the route, the
 * off-route state (with hysteresis: `OFF_ROUTE_ENTER_METERS` for `OFF_ROUTE_CONFIRM_FIXES` fixes in a
 * row to leave, `OFF_ROUTE_EXIT_METERS` to be back), the turn announcements (each one once) and the
 * arrival. Pure: the session service persists `NavigationProgress` (plain JSON) and turns the events
 * into speech, vibration and notifications.
 */

export interface NavigationProgress {
  /** False until the first fix; the first one is matched against the whole route. */
  located: boolean;
  /** Distance along the route of the last on-route fix, in metres. */
  progressMeters: number;
  offRoute: boolean;
  /** Consecutive fixes beyond `OFF_ROUTE_ENTER_METERS` while still on route. */
  offRouteStreak: number;
  /** `announcementKey()` of every announcement already made. */
  announced: string[];
  arrived: boolean;
}

export type TurnPhase = 'FAR' | 'NEAR';

export type NavigationEvent =
  | { type: 'TURN'; turn: RouteTurn; phase: TurnPhase; distanceMeters: number }
  | { type: 'OFF_ROUTE'; offsetMeters: number }
  | { type: 'BACK_ON_ROUTE' }
  | { type: 'ARRIVED' };

export interface NavigationStep {
  progress: NavigationProgress;
  projection: RouteProjection;
  events: NavigationEvent[];
}

export function initialNavigationProgress(): NavigationProgress {
  return { located: false, progressMeters: 0, offRoute: false, offRouteStreak: 0, announced: [], arrived: false };
}

export function announcementKey(turn: RouteTurn, phase: TurnPhase): string {
  return `${Math.round(turn.distanceAlongMeters)}:${phase}`;
}

export function advanceNavigation(
  line: RouteLine,
  turns: readonly RouteTurn[],
  progress: NavigationProgress,
  point: readonly number[],
): NavigationStep {
  const projection = projectOntoRoute(line, point, progress.located ? progress.progressMeters : undefined);
  const events: NavigationEvent[] = [];
  let { offRoute, offRouteStreak, progressMeters, arrived } = progress;
  const announced = [...progress.announced];

  if (offRoute) {
    if (projection.offsetMeters <= OFF_ROUTE_EXIT_METERS) {
      offRoute = false;
      offRouteStreak = 0;
      events.push({ type: 'BACK_ON_ROUTE' });
    }
  } else if (projection.offsetMeters > OFF_ROUTE_ENTER_METERS) {
    offRouteStreak++;
    if (offRouteStreak >= OFF_ROUTE_CONFIRM_FIXES) {
      offRoute = true;
      events.push({ type: 'OFF_ROUTE', offsetMeters: projection.offsetMeters });
    }
  } else {
    offRouteStreak = 0;
  }

  // a fix off the line says nothing about how far along the walker is
  const onLine = projection.offsetMeters <= OFF_ROUTE_ENTER_METERS;
  if (onLine) {
    progressMeters = projection.distanceAlongMeters;
  }

  if (!offRoute && onLine) {
    for (const turn of turns) {
      const ahead = turn.distanceAlongMeters - progressMeters;
      if (ahead < -TURN_PASSED_METERS || ahead > TURN_ANNOUNCE_FAR_METERS) {
        continue;
      }
      const near = announcementKey(turn, 'NEAR');
      const far = announcementKey(turn, 'FAR');
      if (ahead <= TURN_ANNOUNCE_NEAR_METERS) {
        if (!announced.includes(near)) {
          // reached the turn without the first announcement (e.g. a GPS gap): only the "now" one
          announced.push(near, ...(announced.includes(far) ? [] : [far]));
          events.push({ type: 'TURN', turn, phase: 'NEAR', distanceMeters: Math.max(0, ahead) });
        }
      } else if (!announced.includes(far)) {
        announced.push(far);
        events.push({ type: 'TURN', turn, phase: 'FAR', distanceMeters: ahead });
      }
    }
    if (!arrived && line.totalMeters - progressMeters <= ARRIVAL_METERS) {
      arrived = true;
      events.push({ type: 'ARRIVED' });
    }
  }

  return {
    progress: { located: true, progressMeters, offRoute, offRouteStreak, announced, arrived },
    projection,
    events,
  };
}

/** The next turn ahead of `progressMeters` (not yet passed) and how far it is, or `null` when no turn is left. */
export function nextTurn(turns: readonly RouteTurn[], progressMeters: number): { turn: RouteTurn; distanceMeters: number } | null {
  const turn = turns.find((candidate) => candidate.distanceAlongMeters - progressMeters >= -TURN_PASSED_METERS);
  return turn === undefined ? null : { turn, distanceMeters: Math.max(0, turn.distanceAlongMeters - progressMeters) };
}

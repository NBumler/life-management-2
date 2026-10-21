import { OFF_ROUTE_ENTER_METERS, TURN_ANNOUNCE_FAR_METERS, TURN_ANNOUNCE_NEAR_METERS } from './navigation-config';
import { NavigationEvent, NavigationProgress, advanceNavigation, initialNavigationProgress, nextTurn } from './route-navigation';
import { routeLine } from './route-progress';
import { routeTurns } from './turn-instructions';

/** `[lon, lat]` of a point `x` metres east and `y` metres north of a reference point in Hungary. */
function at(x: number, y: number): [number, number] {
  const metersPerDegreeLat = (Math.PI * 6_371_000) / 180;
  return [19 + x / (metersPerDegreeLat * Math.cos((47.5 * Math.PI) / 180)), 47.5 + y / metersPerDegreeLat];
}

describe('route-navigation (backlog/106)', () => {
  // 600 m north, right turn, 400 m east
  const line = routeLine([at(0, 0), at(0, 600), at(400, 600)]);
  const turns = routeTurns(line, null);

  /** Feeds the fixes one after the other; returns the final progress and every event. */
  function walk(points: [number, number][], start: NavigationProgress = initialNavigationProgress()) {
    let progress = start;
    const events: NavigationEvent[] = [];
    for (const point of points) {
      const step = advanceNavigation(line, turns, progress, point);
      progress = step.progress;
      events.push(...step.events);
    }
    return { progress, events };
  }

  it('progress follows the walker along the route', () => {
    const { progress, events } = walk([at(0, 0), at(2, 100), at(-3, 200)]);
    expect(progress.located).toBeTrue();
    expect(progress.progressMeters).toBeCloseTo(200, 0);
    expect(events).toEqual([]);
  });

  it('a turn is announced once from afar and once when near', () => {
    const { events } = walk([at(0, 400), at(0, 600 - TURN_ANNOUNCE_FAR_METERS + 10), at(0, 520), at(0, 600 - TURN_ANNOUNCE_NEAR_METERS + 5), at(0, 590)]);
    const turnEvents = events.filter((event) => event.type === 'TURN');
    expect(turnEvents.map((event) => event.phase)).toEqual(['FAR', 'NEAR']);
    expect(turnEvents[0].turn.direction).toBe('RIGHT');
  });

  it('reaching a turn without the first announcement gives only the "now" one', () => {
    const { events } = walk([at(0, 300), at(0, 590), at(0, 595)]);
    expect(events.filter((event) => event.type === 'TURN').map((event) => event.phase)).toEqual(['NEAR']);
  });

  it('one fix off the line is not off route; two in a row are, once', () => {
    const far = OFF_ROUTE_ENTER_METERS + 20;
    const one = walk([at(0, 100), at(far, 150), at(0, 200)]);
    expect(one.events).toEqual([]);
    expect(one.progress.offRoute).toBeFalse();

    const two = walk([at(0, 100), at(far, 150), at(far, 160), at(far + 10, 170)]);
    expect(two.events.map((event) => event.type)).toEqual(['OFF_ROUTE']);
    expect(two.progress.offRoute).toBeTrue();
    expect(two.progress.progressMeters).toBeCloseTo(100, 0);
  });

  it('back on route only below the exit distance (no flapping in between)', () => {
    const far = OFF_ROUTE_ENTER_METERS + 20;
    const { progress, events } = walk([at(0, 100), at(far, 150), at(far, 160), at(40, 170), at(10, 180)]);
    expect(events.map((event) => event.type)).toEqual(['OFF_ROUTE', 'BACK_ON_ROUTE']);
    expect(progress.offRoute).toBeFalse();
    expect(progress.progressMeters).toBeCloseTo(180, 0);
  });

  it('no turn announcement while off route', () => {
    // west of the line, so the eastward leg after the turn is not nearer either
    const far = -(OFF_ROUTE_ENTER_METERS + 20);
    const { events } = walk([at(0, 400), at(far, 500), at(far, 560), at(far, 590)]);
    expect(events.map((event) => event.type)).toEqual(['OFF_ROUTE']);
  });

  it('arrival at the end, once', () => {
    const { progress, events } = walk([at(300, 600), at(390, 601), at(398, 600)]);
    expect(events.filter((event) => event.type === 'ARRIVED').length).toBe(1);
    expect(progress.arrived).toBeTrue();
  });

  it('the progress survives a JSON round trip (persisted between fixes)', () => {
    const first = walk([at(0, 400), at(0, 500)]);
    const restored = JSON.parse(JSON.stringify(first.progress)) as NavigationProgress;
    const { events } = walk([at(0, 520)], restored);
    expect(events).toEqual([]); // the far announcement was already made before the round trip
  });

  it('nextTurn: the coming turn and its distance; none after it', () => {
    expect(nextTurn(turns, 450)?.distanceMeters).toBeCloseTo(150, 0);
    expect(nextTurn(turns, 700)).toBeNull();
  });
});

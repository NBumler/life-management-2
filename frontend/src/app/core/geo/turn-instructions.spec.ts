import { routeLine } from './route-progress';
import { bearingChange, bearingDegrees, routeTurns, simplifiedIndexes, trailJunctions, turnDirection } from './turn-instructions';

/** `[lon, lat]` of a point `x` metres east and `y` metres north of a reference point in Hungary. */
function at(x: number, y: number): [number, number] {
  const metersPerDegreeLat = (Math.PI * 6_371_000) / 180;
  return [19 + x / (metersPerDegreeLat * Math.cos((47.5 * Math.PI) / 180)), 47.5 + y / metersPerDegreeLat];
}

describe('turn-instructions (backlog/106)', () => {
  it('bearingDegrees: north 0°, east 90°', () => {
    expect(bearingDegrees(at(0, 0), at(0, 100))).toBeCloseTo(0, 1);
    expect(bearingDegrees(at(0, 0), at(100, 0))).toBeCloseTo(90, 1);
  });

  it('bearingChange: signed, across north', () => {
    expect(bearingChange(350, 10)).toBe(20);
    expect(bearingChange(10, 350)).toBe(-20);
    expect(bearingChange(0, 180)).toBe(180);
  });

  it('turnDirection: classes by size and side', () => {
    expect(turnDirection(20)).toBeNull();
    expect(turnDirection(-45)).toBe('SLIGHT_LEFT');
    expect(turnDirection(90)).toBe('RIGHT');
    expect(turnDirection(-140)).toBe('SHARP_LEFT');
    expect(turnDirection(175)).toBe('U_TURN');
  });

  it('simplifiedIndexes: drops points within the tolerance, keeps the corner', () => {
    const wiggly = [at(0, 0), at(3, 100), at(-2, 200), at(0, 300), at(100, 300)];
    expect(simplifiedIndexes(wiggly, 10)).toEqual([3]);
  });

  it('routeTurns: a right-angle corner is a right turn at its distance', () => {
    const turns = routeTurns(routeLine([at(0, 0), at(0, 300), at(300, 300)]), null);
    expect(turns.length).toBe(1);
    expect(turns[0].direction).toBe('RIGHT');
    expect(turns[0].distanceAlongMeters).toBeCloseTo(300, 0);
  });

  it('routeTurns: a left corner, and nothing at the start or the end', () => {
    const turns = routeTurns(routeLine([at(0, 0), at(0, 300), at(-300, 300)]), null);
    expect(turns.map((turn) => turn.direction)).toEqual(['LEFT']);
  });

  it('routeTurns: a gentle bend is no turn', () => {
    expect(routeTurns(routeLine([at(0, 0), at(0, 300), at(50, 600)]), null)).toEqual([]);
  });

  it('routeTurns: two corners closer than the merge distance are one (the sharper)', () => {
    const turns = routeTurns(routeLine([at(0, 0), at(0, 300), at(20, 300), at(20, 600), at(25, 900)]), null);
    expect(turns.length).toBe(1);
  });

  describe('with the trail network', () => {
    // a north–south trail with a side trail branching east at y = 300, and a hairpin trail elsewhere
    const main = [at(0, 0), at(0, 300), at(0, 600)];
    const side = [at(0, 300), at(300, 300)];

    it('trailJunctions: the shared vertex with three directions', () => {
      const junctions = trailJunctions([main, side]);
      expect(junctions.length).toBe(1);
      expect(junctions[0][0]).toBeCloseTo(at(0, 300)[0], 9);
    });

    it('a turn at a junction is kept', () => {
      const turns = routeTurns(routeLine([at(0, 0), at(0, 300), at(300, 300)]), [main, side]);
      expect(turns.map((turn) => turn.direction)).toEqual(['RIGHT']);
    });

    it('a hairpin on a single trail is not a turn', () => {
      const hairpin = [at(1000, 0), at(1000, 300), at(1200, 300), at(1200, 0)];
      expect(routeTurns(routeLine(hairpin), [hairpin])).toEqual([]);
    });

    it('a manually drawn stretch away from every trail keeps its turns', () => {
      const turns = routeTurns(routeLine([at(5000, 0), at(5000, 300), at(5300, 300)]), [main, side]);
      expect(turns.map((turn) => turn.direction)).toEqual(['RIGHT']);
    });
  });
});

import { CLIMBING_CONTEXTS } from './climbing-contexts';

describe('climbing-contexts', () => {
  it('defines exactly the 4 Indoor/Outdoor × Boulder/Kötél dashboard entries', () => {
    expect(CLIMBING_CONTEXTS.map((c) => c.key)).toEqual([
      'indoor-boulder',
      'indoor-rope',
      'outdoor-boulder',
      'outdoor-rope',
    ]);
  });

  it('pairs each key with the matching locationType + discipline discriminators', () => {
    for (const ctx of CLIMBING_CONTEXTS) {
      const [location, discipline] = ctx.key.split('-');
      expect(ctx.locationType).toBe(location === 'indoor' ? 'INDOOR' : 'OUTDOOR');
      expect(ctx.discipline).toBe(discipline === 'boulder' ? 'BOULDER' : 'ROPE');
    }
  });

  it('marks every context wired (M4 indoor boulder, M5 indoor rope, M6 outdoor boulder, M7 outdoor rope)', () => {
    expect(CLIMBING_CONTEXTS.filter((c) => c.wired).map((c) => c.key)).toEqual([
      'indoor-boulder',
      'indoor-rope',
      'outdoor-boulder',
      'outdoor-rope',
    ]);
  });

  it('gives every context a distinct route and label key', () => {
    const routes = CLIMBING_CONTEXTS.map((c) => c.route);
    const labels = CLIMBING_CONTEXTS.map((c) => c.labelKey);
    expect(new Set(routes).size).toBe(routes.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(routes).toEqual(CLIMBING_CONTEXTS.map((c) => c.key));
    expect(labels.every((l) => l.startsWith('WORKOUT.CLIMBING.CONTEXT.'))).toBeTrue();
  });
});

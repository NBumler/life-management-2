import fixture from '../../../../shared/fixtures/aspect-degrees.json';
import { ASPECTS, Aspect, aspectToDegrees, degreesToAspect, isAspect } from './aspect';

describe('aspect (shared/fixtures/aspect-degrees.json)', () => {
  for (const { degrees, aspect } of fixture.toAspect) {
    it(`bins ${degrees}° → ${aspect}`, () => {
      expect(degreesToAspect(degrees)).toBe(aspect as Aspect);
    });
  }

  for (const { aspect, degrees } of fixture.centerDegrees) {
    it(`${aspect} points at ${degrees}°`, () => {
      expect(aspectToDegrees(aspect as Aspect)).toBe(degrees);
    });
  }

  it('round-trips every aspect through its centre degree', () => {
    for (const aspect of ASPECTS) {
      expect(degreesToAspect(aspectToDegrees(aspect))).toBe(aspect);
    }
  });

  it('isAspect guards the token set', () => {
    expect(isAspect('N')).toBe(true);
    expect(isAspect('NW')).toBe(true);
    expect(isAspect('north')).toBe(false);
    expect(isAspect('')).toBe(false);
    expect(isAspect(null)).toBe(false);
    expect(isAspect(0)).toBe(false);
  });
});

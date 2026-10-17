import { buildTimeline, completedItems, nextItemStart, previousItemStart } from './stretch-timeline';
import { STRETCH_TRANSITION_SECONDS } from './stretch-timing';

describe('stretch-timeline (backlog/169)', () => {
  const items = [
    { holdSeconds: 30, perSide: true, repetitions: 1 },
    { holdSeconds: 20, perSide: false, repetitions: 2 },
  ];
  const timeline = buildTimeline(items);

  it('a transition before every hold; per side runs left then right; repetitions repeat', () => {
    expect(timeline.map((phase) => `${phase.itemIndex}${phase.kind[0]}${phase.side?.[0] ?? '-'}${phase.rep}`)).toEqual([
      '0TL1',
      '0HL1',
      '0TR1',
      '0HR1',
      '1T-1',
      '1H-1',
      '1T-2',
      '1H-2',
    ]);
    expect(timeline[0].seconds).toBe(STRETCH_TRANSITION_SECONDS);
    expect(timeline[1].seconds).toBe(30);
  });

  it('nextItemStart(): jumps to the next stretch, or past the end from the last one', () => {
    expect(nextItemStart(timeline, 1)).toBe(4);
    expect(nextItemStart(timeline, 5)).toBe(timeline.length);
  });

  it('previousItemStart(): back to the start of this stretch, or to the previous one when already there', () => {
    expect(previousItemStart(timeline, 6)).toBe(4);
    expect(previousItemStart(timeline, 4)).toBe(0);
    expect(previousItemStart(timeline, 0)).toBe(0);
  });

  it('completedItems(): held to the end and not skipped', () => {
    expect(completedItems(timeline, 2, 4, new Set())).toEqual([true, false]);
    expect(completedItems(timeline, 2, timeline.length, new Set([0]))).toEqual([false, true]);
    expect(completedItems(timeline, 2, 3, new Set())).toEqual([false, false]);
  });
});

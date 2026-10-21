import { HOME_WIDGETS } from './home-widget-registry';

// documentation/Features/Kezdőlap.md — the home widget set (backlog/095).
describe('home-widget-registry', () => {
  it('backlog/232 — has no in-app quick-actions widget (quick actions live on the Android widget)', () => {
    expect(HOME_WIDGETS.map((widget) => widget.key)).toEqual(['today-nutrition', 'today-workouts']);
  });

  it('gates the nutrition widget on tab.kaja', () => {
    const nutrition = HOME_WIDGETS.find((widget) => widget.key === 'today-nutrition');
    expect(nutrition?.flag).toBe('tab.kaja');
  });
});

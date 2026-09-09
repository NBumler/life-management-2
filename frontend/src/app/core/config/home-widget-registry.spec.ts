import { HOME_QUICK_ACTIONS, HOME_WIDGETS } from './home-widget-registry';

// documentation/Features/Kezdőlap.md — the home widget set (backlog/095).
describe('home-widget-registry', () => {
  it('keeps quick-actions first and unflagged so the home tab always has some content', () => {
    expect(HOME_WIDGETS[0]).toEqual({ key: 'quick-actions', flag: null });
  });

  it('gates the nutrition widget on tab.kaja', () => {
    const nutrition = HOME_WIDGETS.find((widget) => widget.key === 'today-nutrition');
    expect(nutrition?.flag).toBe('tab.kaja');
  });

  it('every quick action points at an absolute in-app route and has a label + icon', () => {
    for (const action of HOME_QUICK_ACTIONS) {
      expect(action.route.startsWith('/tabs/')).toBe(true);
      expect(action.labelKey).toMatch(/^HOME\.QUICK\./);
      expect(action.icon).toBeTruthy();
    }
  });

  it('the climbing quick action is gated on edzes.maszonaplo', () => {
    expect(HOME_QUICK_ACTIONS.find((action) => action.key === 'new-climb')?.flag).toBe('edzes.maszonaplo');
  });
});

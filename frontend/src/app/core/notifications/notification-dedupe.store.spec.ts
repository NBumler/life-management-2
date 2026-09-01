import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { addDaysIso } from '../../shared/local-date';
import { NotificationDedupeStore } from './notification-dedupe.store';

describe('NotificationDedupeStore', () => {
  let store: NotificationDedupeStore;

  beforeEach(async () => {
    await Preferences.clear();
    TestBed.configureTestingModule({ providers: [NotificationDedupeStore] });
    store = TestBed.inject(NotificationDedupeStore);
  });

  it('records a key once and reports it as seen', async () => {
    expect(await store.has('STEPS_LOW', '2026-09-01')).toBeFalse();
    await store.record('STEPS_LOW', '2026-09-01', '2026-09-01');
    expect(await store.has('STEPS_LOW', '2026-09-01')).toBeTrue();
    // Same type + key, different type stays independent.
    expect(await store.has('HOUSEHOLD_TASK_DUE', '2026-09-01')).toBeFalse();
  });

  it('is idempotent — recording the same key twice keeps one entry', async () => {
    await store.record('STEPS_LOW', '2026-09-01', '2026-09-01');
    await store.record('STEPS_LOW', '2026-09-01', '2026-09-05');
    const raw = JSON.parse((await Preferences.get({ key: 'lm2_notifDedupe' })).value!);
    expect(raw.length).toBe(1);
    expect(raw[0].day).toBe('2026-09-01');
  });

  it('prunes daily-keyed entries older than the retention window', async () => {
    const today = '2026-09-01';
    await store.record('STEPS_LOW', 'old', addDaysIso(today, -40));
    await store.record('STEPS_LOW', 'recent', addDaysIso(today, -3));

    await store.prune(today);

    expect(await store.has('STEPS_LOW', 'old')).toBeFalse();
    expect(await store.has('STEPS_LOW', 'recent')).toBeTrue();
  });

  it('never prunes FOOD_SPOILED_ONCE — its once-per-lifetime guarantee has no day in the key', async () => {
    const today = '2026-09-01';
    await store.record('FOOD_SPOILED_ONCE', 'item-1', addDaysIso(today, -400));

    await store.prune(today);

    expect(await store.has('FOOD_SPOILED_ONCE', 'item-1')).toBeTrue();
  });

  it('survives a corrupt stored blob', async () => {
    await Preferences.set({ key: 'lm2_notifDedupe', value: '{not json' });
    expect(await store.has('STEPS_LOW', 'x')).toBeFalse();
    await store.record('STEPS_LOW', 'x', '2026-09-01');
    expect(await store.has('STEPS_LOW', 'x')).toBeTrue();
  });
});

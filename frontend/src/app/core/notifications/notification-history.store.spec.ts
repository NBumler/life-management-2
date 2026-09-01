import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { NotificationHistoryEntry, NotificationHistoryStore } from './notification-history.store';

function entry(overrides: Partial<NotificationHistoryEntry> = {}): NotificationHistoryEntry {
  return {
    type: 'STEPS_LOW',
    key: '2026-09-01',
    title: 'Kevés lépés ma',
    body: '1400 lépés',
    route: '/tabs/menu/steps',
    firedAt: Date.parse('2026-09-01T20:00:00Z'),
    ...overrides,
  };
}

describe('NotificationHistoryStore', () => {
  let store: NotificationHistoryStore;

  beforeEach(async () => {
    await Preferences.clear();
    TestBed.configureTestingModule({ providers: [NotificationHistoryStore] });
    store = TestBed.inject(NotificationHistoryStore);
    await store.init();
  });

  it('records an entry and exposes it via the signal', async () => {
    await store.record(entry());
    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].title).toBe('Kevés lépés ma');
  });

  it('is idempotent on (type, key) — a re-inferred delivery does not stack a duplicate', async () => {
    await store.record(entry({ title: 'first' }));
    await store.record(entry({ title: 'second' }));
    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].title).toBe('first');
  });

  it('keeps entries newest-first', async () => {
    await store.record(entry({ key: 'a', firedAt: Date.parse('2026-09-01T09:00:00Z') }));
    await store.record(entry({ key: 'b', firedAt: Date.parse('2026-09-03T09:00:00Z') }));
    await store.record(entry({ key: 'c', firedAt: Date.parse('2026-09-02T09:00:00Z') }));
    expect(store.entries().map((e) => e.key)).toEqual(['b', 'c', 'a']);
  });

  it('caps the log at 60 entries, dropping the oldest', async () => {
    for (let i = 0; i < 65; i++) {
      await store.record(entry({ key: `k${i}`, firedAt: Date.parse('2026-09-01T00:00:00Z') + i * 60_000 }));
    }
    expect(store.entries().length).toBe(60);
    // The five oldest (k0..k4) fell off.
    expect(store.entries().some((e) => e.key === 'k0')).toBeFalse();
    expect(store.entries().some((e) => e.key === 'k64')).toBeTrue();
  });

  it('clear() empties both the signal and Preferences', async () => {
    await store.record(entry());
    await store.clear();
    expect(store.entries()).toEqual([]);
    expect((await Preferences.get({ key: 'lm2_notifHistory' })).value).toBe('[]');
  });

  it('a record() that beats init() loads the persisted log first instead of overwriting it', async () => {
    await Preferences.set({
      key: 'lm2_notifHistory',
      value: JSON.stringify([entry({ key: 'old', title: 'earlier banner' })]),
    });
    const fresh = new NotificationHistoryStore();

    // No init() call — record() must lazy-load the persisted log before appending.
    await fresh.record(entry({ key: 'new', title: 'new banner' }));

    expect(fresh.entries().map((e) => e.key).sort()).toEqual(['new', 'old']);
    const persisted = JSON.parse((await Preferences.get({ key: 'lm2_notifHistory' })).value!) as { key: string }[];
    expect(persisted.map((e) => e.key).sort()).toEqual(['new', 'old']);
  });

  it('reloads a persisted log and survives a corrupt blob', async () => {
    await store.record(entry());
    const reloaded = TestBed.inject(NotificationHistoryStore);
    // Same injected instance in this TestBed, so assert via a fresh init after corrupting.
    await Preferences.set({ key: 'lm2_notifHistory', value: '{not json' });
    await reloaded.init();
    expect(reloaded.entries()).toEqual([]);
  });
});

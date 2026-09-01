import { datesNeedingBackfill, drainPendingNativeStepReadings } from './step-sync-plan';

describe('datesNeedingBackfill', () => {
  it('returns the last N calendar days before today, most recent first, that have no local row', () => {
    expect(datesNeedingBackfill('2026-09-10', [], 7)).toEqual([
      '2026-09-09',
      '2026-09-08',
      '2026-09-07',
      '2026-09-06',
      '2026-09-05',
      '2026-09-04',
      '2026-09-03',
    ]);
  });

  it('excludes today and any day that already has a local row', () => {
    const existing = ['2026-09-10', '2026-09-09', '2026-09-06'];
    expect(datesNeedingBackfill('2026-09-10', existing, 7)).toEqual([
      '2026-09-08',
      '2026-09-07',
      '2026-09-05',
      '2026-09-04',
      '2026-09-03',
    ]);
  });

  it('crosses month and year boundaries', () => {
    expect(datesNeedingBackfill('2026-01-02', [], 3)).toEqual(['2026-01-01', '2025-12-31', '2025-12-30']);
  });

  it('is empty when every look-back day already has a row', () => {
    const existing = ['2026-09-04', '2026-09-03', '2026-09-02'];
    expect(datesNeedingBackfill('2026-09-05', existing, 3)).toEqual([]);
  });

  it('treats a deliberately deleted (tombstoned) day as "has a row" so it is not re-pulled', () => {
    // The caller feeds every known date, tombstoned included — a deleted day must stay out of the gap list.
    expect(datesNeedingBackfill('2026-09-05', ['2026-09-03'], 3)).toEqual(['2026-09-04', '2026-09-02']);
  });
});

describe('drainPendingNativeStepReadings', () => {
  it('parses valid `steps.pendingHealthConnect.<date>` entries into readings, ignoring other keys', () => {
    const out = drainPendingNativeStepReadings([
      { key: 'steps.pendingHealthConnect.2026-08-31', value: '4200' },
      { key: 'lm2_notifBgPlan', value: '{}' },
      { key: 'steps.pendingHealthConnect.2026-08-30', value: '9000.4' },
    ]);
    expect(out.readings).toEqual([
      { date: '2026-08-31', steps: 4200 },
      { date: '2026-08-30', steps: 9000 },
    ]);
    expect(out.keysToClear).toEqual([
      'steps.pendingHealthConnect.2026-08-31',
      'steps.pendingHealthConnect.2026-08-30',
    ]);
  });

  it('clears but does not emit a reading for a malformed date, a non-numeric value, null, or zero', () => {
    const out = drainPendingNativeStepReadings([
      { key: 'steps.pendingHealthConnect.not-a-date', value: '100' },
      { key: 'steps.pendingHealthConnect.2026-08-31', value: 'abc' },
      { key: 'steps.pendingHealthConnect.2026-08-30', value: null },
      { key: 'steps.pendingHealthConnect.2026-08-29', value: '0' },
    ]);
    expect(out.readings).toEqual([]);
    expect(out.keysToClear.length).toBe(4);
  });
});

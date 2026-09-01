import { datesNeedingBackfill } from './step-sync-plan';

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

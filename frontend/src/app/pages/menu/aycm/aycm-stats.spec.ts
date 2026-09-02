import { AycmCheckIn } from '../../../api/model/aycmCheckIn';
import { AycmPartner } from '../../../api/model/aycmPartner';
import {
  filterCheckIns,
  groupByPartner,
  summarize,
  visitList,
  windowRange,
} from './aycm-stats';

function partner(overrides: Partial<AycmPartner> = {}): AycmPartner {
  return { id: 'p1', name: 'Life1', notes: null, deleted: false, ...overrides };
}

function checkIn(overrides: Partial<AycmCheckIn> = {}): AycmCheckIn {
  return {
    id: 'c1',
    checkInDate: '2026-08-10',
    checkInTime: '18:00',
    partnerId: 'p1',
    partnerName: 'Life1',
    ruleId: 'r1',
    ruleLabel: 'Este',
    listPriceHuf: 3000,
    coPaymentHuf: 500,
    visitValueHuf: 3000,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

describe('aycm-stats windowRange', () => {
  it('THIS_MONTH spans the current calendar month, monthCount 1', () => {
    expect(windowRange('THIS_MONTH', '2026-08-31')).toEqual({ from: '2026-08-01', to: '2026-08-31', monthCount: 1 });
  });

  it('PREV_MONTH is the whole previous month, wrapping the year', () => {
    expect(windowRange('PREV_MONTH', '2026-08-15')).toEqual({ from: '2026-07-01', to: '2026-07-31', monthCount: 1 });
    expect(windowRange('PREV_MONTH', '2026-01-09')).toEqual({ from: '2025-12-01', to: '2025-12-31', monthCount: 1 });
  });

  it('LAST_3_MONTHS covers current-2 .. current, monthCount 3', () => {
    expect(windowRange('LAST_3_MONTHS', '2026-08-31')).toEqual({ from: '2026-06-01', to: '2026-08-31', monthCount: 3 });
    expect(windowRange('LAST_3_MONTHS', '2026-02-10')).toEqual({ from: '2025-12-01', to: '2026-02-28', monthCount: 3 });
  });

  it('handles February leap length via the last-day helper', () => {
    expect(windowRange('THIS_MONTH', '2028-02-05').to).toBe('2028-02-29');
  });

  it('THIS_YEAR spans the whole current calendar year, monthCount 12', () => {
    expect(windowRange('THIS_YEAR', '2026-08-31')).toEqual({ from: '2026-01-01', to: '2026-12-31', monthCount: 12 });
    expect(windowRange('THIS_YEAR', '2026-01-01')).toEqual({ from: '2026-01-01', to: '2026-12-31', monthCount: 12 });
    expect(windowRange('THIS_YEAR', '2028-12-31')).toEqual({ from: '2028-01-01', to: '2028-12-31', monthCount: 12 });
  });
});

describe('aycm-stats filterCheckIns', () => {
  const rows = [
    checkIn({ id: 'in', checkInDate: '2026-08-01' }),
    checkIn({ id: 'also-in', checkInDate: '2026-08-31' }),
    checkIn({ id: 'before', checkInDate: '2026-07-31' }),
    checkIn({ id: 'after', checkInDate: '2026-09-01' }),
    checkIn({ id: 'deleted', checkInDate: '2026-08-15', deleted: true }),
    checkIn({ id: 'future-but-in', checkInDate: '2026-08-20' }),
  ];

  it('keeps only live rows in the inclusive window, future dates included', () => {
    const kept = filterCheckIns(rows, '2026-08-01', '2026-08-31').map((c) => c.id);
    expect(kept.sort()).toEqual(['also-in', 'future-but-in', 'in']);
  });
});

describe('aycm-stats summarize', () => {
  it('counts every row and sums visitValueHuf (0 rows → 0/0)', () => {
    expect(summarize([])).toEqual({ visitCount: 0, visitValueSumHuf: 0 });
    expect(summarize([checkIn({ visitValueHuf: 0 }), checkIn({ visitValueHuf: 3000 })])).toEqual({
      visitCount: 2,
      visitValueSumHuf: 3000,
    });
  });
});

describe('aycm-stats groupByPartner', () => {
  it('groups by partnerId, sorts by sum desc then name', () => {
    const partners = [partner({ id: 'p1', name: 'Alpha' }), partner({ id: 'p2', name: 'Beta' })];
    const rows = [
      checkIn({ id: 'a', partnerId: 'p1', visitValueHuf: 1000 }),
      checkIn({ id: 'b', partnerId: 'p2', visitValueHuf: 3000 }),
      checkIn({ id: 'c', partnerId: 'p2', visitValueHuf: 500 }),
    ];
    const grouped = groupByPartner(rows, partners);
    expect(grouped.map((g) => [g.displayName, g.visitCount, g.visitValueSumHuf])).toEqual([
      ['Beta', 2, 3500],
      ['Alpha', 1, 1000],
    ]);
  });

  it('uses the live partner name even when snapshots hold an older one', () => {
    const partners = [partner({ id: 'p1', name: 'Renamed Gym' })];
    const rows = [checkIn({ partnerId: 'p1', partnerName: 'Old Name' })];
    expect(groupByPartner(rows, partners)[0].displayName).toBe('Renamed Gym');
  });

  it('falls back to the lexicographically-first snapshot name for a deleted partner', () => {
    const partners = [partner({ id: 'p1', name: 'Ignored', deleted: true })];
    const rows = [
      checkIn({ id: 'a', partnerId: 'p1', partnerName: 'Zed Fitness' }),
      checkIn({ id: 'b', partnerId: 'p1', partnerName: 'Aha Fitness' }),
    ];
    expect(groupByPartner(rows, partners)[0].displayName).toBe('Aha Fitness');
  });
});

describe('aycm-stats visitList', () => {
  it('sorts by date desc then time desc and resolves the display name', () => {
    const partners = [partner({ id: 'p1', name: 'Live', deleted: true })];
    const rows = [
      checkIn({ id: 'a', partnerId: 'p1', checkInDate: '2026-08-10', checkInTime: '08:00', partnerName: 'B' }),
      checkIn({ id: 'b', partnerId: 'p1', checkInDate: '2026-08-10', checkInTime: '20:00', partnerName: 'A' }),
      checkIn({ id: 'c', partnerId: 'p1', checkInDate: '2026-08-11', checkInTime: '06:00', partnerName: 'C' }),
    ];
    const list = visitList(rows, partners);
    expect(list.map((v) => v.id)).toEqual(['c', 'b', 'a']);
    expect(list[0].displayName).toBe('A'); // lexicographically-first snapshot for the deleted partner
  });
});

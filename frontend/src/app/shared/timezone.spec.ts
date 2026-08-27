import { calendarDayInZone, deviceTimeZoneId, instantFromLocalDateTime } from './timezone';

describe('timezone', () => {
  describe('deviceTimeZoneId', () => {
    it('returns a non-empty IANA-looking zone id', () => {
      const zone = deviceTimeZoneId();
      expect(typeof zone).toBe('string');
      expect(zone.length).toBeGreaterThan(0);
    });
  });

  describe('calendarDayInZone', () => {
    it('resolves the calendar day in a zone ahead of UTC, past midnight', () => {
      // 2026-01-01T23:30:00Z in Europe/Budapest (CET, UTC+1 in winter) is already 2026-01-02T00:30.
      expect(calendarDayInZone('2026-01-01T23:30:00Z', 'Europe/Budapest')).toBe('2026-01-02');
    });

    it('resolves the calendar day in a zone behind UTC, still the previous day', () => {
      // Same instant in America/New_York (EST, UTC-5 in winter) is 2026-01-01T18:30 — same day.
      expect(calendarDayInZone('2026-01-01T23:30:00Z', 'America/New_York')).toBe('2026-01-01');
    });

    it('gives different calendar days for the same instant viewed from different zones', () => {
      const instant = '2026-06-15T22:00:00Z';
      // Europe/Budapest (CEST, UTC+2 in summer): local 2026-06-16T00:00 — already the next day.
      expect(calendarDayInZone(instant, 'Europe/Budapest')).toBe('2026-06-16');
      // America/New_York (EDT, UTC-4 in summer): local 2026-06-15T18:00 — still the same day.
      expect(calendarDayInZone(instant, 'America/New_York')).toBe('2026-06-15');
    });

    it('resolves correctly across a DST spring-forward transition (Europe/Budapest, 2026-03-29)', () => {
      // Before the transition (CET, UTC+1): local 2026-03-29T00:30 — already the new day.
      expect(calendarDayInZone('2026-03-28T23:30:00Z', 'Europe/Budapest')).toBe('2026-03-29');
      // After the transition (CEST, UTC+2): local 2026-03-30T00:30 — already the next day.
      expect(calendarDayInZone('2026-03-29T22:30:00Z', 'Europe/Budapest')).toBe('2026-03-30');
    });
  });

  describe('instantFromLocalDateTime', () => {
    it('matches a plain local Date construction (device-zone, no arbitrary-zone conversion)', () => {
      const instant = instantFromLocalDateTime('2026-08-26', '14:30');
      const expected = new Date(2026, 7, 26, 14, 30, 0, 0).toISOString();
      expect(instant).toBe(expected);
    });

    it('round-trips back to the same calendar day when viewed in the device zone', () => {
      const instant = instantFromLocalDateTime('2026-08-26', '14:30');
      expect(calendarDayInZone(instant, deviceTimeZoneId())).toBe('2026-08-26');
    });
  });
});

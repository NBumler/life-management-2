import { notificationNumericId } from './notification-ids';
import { NOTIFICATION_TYPES } from './notification-types';

describe('notificationNumericId', () => {
  it('is deterministic for the same type + key', () => {
    expect(notificationNumericId('STEPS_LOW', '2026-09-01')).toBe(notificationNumericId('STEPS_LOW', '2026-09-01'));
  });

  it('always returns a positive 31-bit integer', () => {
    for (const type of NOTIFICATION_TYPES) {
      for (const key of ['a', '2026-09-01', 'sf-123:2026-12-31', 'ev-abc:2027-02-28', '']) {
        const id = notificationNumericId(type, key);
        expect(Number.isInteger(id)).toBeTrue();
        expect(id).toBeGreaterThan(0);
        expect(id).toBeLessThanOrEqual(0x7fffffff);
      }
    }
  });

  it('separates type from key so "a|b" and "ab|" cannot collide by concatenation', () => {
    expect(notificationNumericId('FOOD_EXPIRING_DAILY', 'x')).not.toBe(notificationNumericId('FOOD_SPOILED_ONCE', 'x'));
  });

  it('produces distinct ids across a realistic batch (no collision)', () => {
    const ids = new Set<number>();
    for (const type of NOTIFICATION_TYPES) {
      for (let i = 0; i < 500; i++) {
        ids.add(notificationNumericId(type, `item-${i}:2026-09-${(i % 28) + 1}`));
      }
    }
    expect(ids.size).toBe(NOTIFICATION_TYPES.length * 500);
  });
});

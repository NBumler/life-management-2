import { NotificationType } from './notification-types';

/**
 * `@capacitor/local-notifications` needs a **numeric** id per scheduled notification, and Android
 * stores it as a 32-bit signed int. We derive it deterministically from `type + '|' + key` so that
 * re-evaluating produces the same id for the same logical notification — scheduling it again is then
 * an idempotent replace, and a stale one can be cancelled by id without a side table.
 *
 * FNV-1a over the string, masked to 31 bits (always positive), and forced non-zero (id 0 is a valid
 * LocalNotifications id but we keep it reserved so "no id" stays unambiguous).
 */
export function notificationNumericId(type: NotificationType, key: string): number {
  const source = `${type}|${key}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const positive = hash & 0x7fffffff;
  return positive === 0 ? 1 : positive;
}

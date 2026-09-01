import { FeatureFlagKey } from '../config/feature-flags.service';

/**
 * documentation/Features/Értesítések.md "Aktív típusok (első kör)" — the six local-notification
 * types shipped in round one. Everything else in that spec ("Későbbi típusok") is deliberately not
 * modelled here until its source feature spec closes.
 */
export const NOTIFICATION_TYPES = [
  'FOOD_EXPIRING_DAILY',
  'FOOD_SPOILED_ONCE',
  'STEPS_LOW',
  'CALORIE_STREAK',
  'HOUSEHOLD_TASK_DUE',
  'EVENT_OCCURRENCE',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * documentation/Features/Értesítések.md "Ismétlés-védelem (deduplikáció)" table: `FOOD_SPOILED_ONCE`
 * is the only **1 / élettartam** type — its dedupe key carries no calendar day, so its "already
 * sent" entry must survive the retention prune forever. Every other type embeds the day in its key
 * and is safe to age out.
 */
export const LIFETIME_DEDUPE_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>(['FOOD_SPOILED_ONCE']);

/**
 * documentation/Architektúra/Frontend.md: "Az [[Értesítések]] típus-kapcsolói nem feature flag-ek:
 * device-local user beállítások, és a forrás-feature flagje fedi őket (forrás ki → a típus nem
 * jelenik meg és nem ütemez)." This maps each type to the flag that gates its source feature.
 */
export const NOTIFICATION_SOURCE_FLAG: Record<NotificationType, FeatureFlagKey> = {
  FOOD_EXPIRING_DAILY: 'tab.kaja',
  FOOD_SPOILED_ONCE: 'tab.kaja',
  STEPS_LOW: 'menu.lepesszam',
  CALORIE_STREAK: 'tab.kaja',
  HOUSEHOLD_TASK_DUE: 'tab.feladatok',
  EVENT_OCCURRENCE: 'feladatok.esemenyek',
};

/**
 * A single notification the rules layer wants delivered. `fireAt` is a **local wall-clock** instant
 * (`YYYY-MM-DDTHH:mm:ss`, no zone) — the scheduler turns it into a `Date` in the device TZ. When
 * `fireAt` is already in the past at evaluation time the scheduler fires it immediately (once),
 * unless the dedupe log already has `type`+`key` for that day.
 */
export interface DesiredNotification {
  type: NotificationType;
  /** Dedupe + stable-id key. Includes the calendar day for every type except `FOOD_SPOILED_ONCE`. */
  key: string;
  fireAt: string;
  titleKey: string;
  bodyKey: string;
  params: Record<string, string | number>;
  /** Router URL opened when the banner is tapped. */
  route: string;
}

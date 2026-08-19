import { OutboxItem } from './outbox-item';
import { OUTBOX_PAYLOAD_SCHEMA_VERSION } from './offline-queue.service';

/**
 * documentation/Architektúra/Backend-offline first.md §7 "Payload-verziózás (app frissítés)".
 *
 * A pure `(payload, url) => { payload, url }` transform for one schema step. Registry key is
 * `"<entityType>:<fromVersion>"` (e.g. `"HouseholdTask:1"`), meaning "how to turn a v1 payload
 * for this entity into a v2 payload". Steps must be pure and side-effect-free — the migrator may
 * call them speculatively while walking a chain, and never persists anything itself.
 */
export type MigrationStep = (payload: unknown, url: string) => { payload: unknown; url: string };

/**
 * Empty today: `OUTBOX_PAYLOAD_SCHEMA_VERSION` is still 1, so no outbox item can have an older
 * `payloadVersion` and there is nothing to migrate from yet. Register future steps here as the
 * DTO/route schema changes — see the "Fejlesztői szabály" in §7: every breaking DTO/URL change
 * either adds a step here or knowingly accepts that surviving old items go to ERROR.
 */
const MIGRATIONS: ReadonlyMap<string, MigrationStep> = new Map<string, MigrationStep>([]);

export interface OutboxMigrationResult {
  /** false when the item was already at the target version — nothing to do, nothing to persist. */
  migrated: boolean;
  payload: unknown;
  url: string;
  payloadVersion: number;
  /**
   * Set when a step in the chain has no registered migration. `payload`/`url`/`payloadVersion` in
   * this case are the item's original (unmigrated, unpersisted) values — the caller must mark the
   * item ERROR with this message rather than draining it or persisting a partial migration.
   */
  errorMessage: string | null;
}

/**
 * Walks `item.payloadVersion → targetVersion` one registered step at a time. Every successful step
 * advances the local version by exactly one before the next step's key is looked up (§7: "minden
 * sikeres lépés után a tétel helyi payloadVersion-je eggyel nő, mielőtt a következő lépés kulcsát
 * keresné a registry"), so a single migration function only ever has to know how to go from N to
 * N+1, not from N straight to the current version.
 *
 * `registry` defaults to the real, production `MIGRATIONS` map; tests pass a synthetic one so the
 * step-walking mechanism can be exercised without a real cross-version migration existing yet.
 */
export function migrateOutboxItem(
  item: OutboxItem,
  targetVersion: number = OUTBOX_PAYLOAD_SCHEMA_VERSION,
  registry: ReadonlyMap<string, MigrationStep> = MIGRATIONS,
): OutboxMigrationResult {
  if (item.payloadVersion >= targetVersion) {
    return { migrated: false, payload: item.payload, url: item.url, payloadVersion: item.payloadVersion, errorMessage: null };
  }

  let payload = item.payload;
  let url = item.url;
  let version = item.payloadVersion;

  while (version < targetVersion) {
    const step = registry.get(`${item.entityType}:${version}`);
    if (!step) {
      return {
        migrated: false,
        payload: item.payload,
        url: item.url,
        payloadVersion: item.payloadVersion,
        errorMessage: `Az alkalmazás frissült (${item.entityType} payload v${version} → v${targetVersion}), és nincs regisztrált migráció ehhez a lépéshez. A tételt kézzel kell újraküldeni.`,
      };
    }
    const stepResult = step(payload, url);
    payload = stepResult.payload;
    url = stepResult.url;
    version += 1;
  }

  return { migrated: true, payload, url, payloadVersion: version, errorMessage: null };
}

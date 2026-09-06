import { OutboxItem, OutboxEntityType } from './outbox-item';
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
 * The closed set of outbox entity types (mirror of `OutboxEntityType`) — every one needs a `:1`
 * step for the v1 → v2 bump so a stale pending write survives it. Kept as a plain array (not derived
 * from the union) because a union has no runtime representation.
 *
 * Two compile-time checks keep it honest, in both directions:
 *  - `satisfies readonly OutboxEntityType[]` — no array entry that isn't a real `OutboxEntityType`;
 *  - `assertAllEntityTypesListed` below — no `OutboxEntityType` member missing from the array.
 */
const ALL_ENTITY_TYPES = [
  'UserProfile',
  'WeightHistoryEntry',
  'GearItem',
  'PackingTemplate',
  'PackingSession',
  'PackingSessionItem',
  'LifePlan',
  'Exercise',
  'WorkoutSession',
  'WorkoutPlan',
  'WeeklyPlan',
  'SwimLog',
  'BikeRideLog',
  'RecurringExpense',
  'AycmPartner',
  'AycmPriceRule',
  'AycmCheckIn',
  'AycmSettings',
  'Gym',
  'GymColorBand',
  'IndoorRoute',
  'Crag',
  'Sector',
  'Route',
  'BoulderProblem',
  'ClimbingSession',
  'HouseholdRoom',
  'HouseholdTask',
  'CalendarEvent',
  'Food',
  'StoredFood',
  'Recipe',
  'Meal',
  'DailyStepLog',
  'ShoppingList',
  'ShoppingListComplete',
] as const satisfies readonly OutboxEntityType[];

/**
 * Compile-time completeness guard for `ALL_ENTITY_TYPES` — the direction `satisfies` cannot check.
 * If a member of `OutboxEntityType` is missing from the array, `MissingEntityTypes` is that member
 * instead of `never`, and this declaration fails to type-check (`true` is not assignable to a string
 * literal). Without it a new entity type added to the union alone would silently lose its `:1`
 * migration step and send every stale pending write of that type to ERROR on the next
 * `OUTBOX_PAYLOAD_SCHEMA_VERSION` bump. Exported so it is a "used" symbol and the spec can assert it.
 */
type MissingEntityTypes = Exclude<OutboxEntityType, (typeof ALL_ENTITY_TYPES)[number]>;
export const ALL_ENTITY_TYPES_EXHAUSTIVE: [MissingEntityTypes] extends [never] ? true : MissingEntityTypes = true;

/**
 * v1 → v2 (backlog/063): recursively rewrite every `netUnit` / `quantityUnit` string equal to
 * `'db'` into `'cs'` (the quantity unit rename). A no-op for any payload without those keys, so the
 * same step is registered for every entity type — the version bump is global, so a stale pending
 * write of *any* kind must have a `:1` step or it goes to ERROR (§7 "Fejlesztői szabály").
 */
export function rewriteDbUnitToCs(payload: unknown, url: string): { payload: unknown; url: string } {
  return { payload: rewriteNode(payload), url };
}

const UNIT_KEYS = new Set(['netUnit', 'quantityUnit', 'pieceUnit']);

function rewriteNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(rewriteNode);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    out[key] = UNIT_KEYS.has(key) && value === 'db' ? 'cs' : rewriteNode(value);
  }
  return out;
}

/** A pure pass-through — the step for an entity type a given version bump does not touch. */
export function identityStep(payload: unknown, url: string): { payload: unknown; url: string } {
  return { payload, url };
}

/**
 * v2 → v3 (backlog/080): #77 folded `AscentAttempt.failurePoint` ("hol akadt el") into `notes` and
 * removed the field (`V31__ascent_attempt_merge_failure_point_into_notes.sql`). A `ClimbingSession`
 * write still pending on a phone from before that app update carries `attempts[].failurePoint`,
 * which the (post-#77) server now rejects. Strip it from every attempt, folding any non-blank text
 * into `notes` with the same rule the migration used: both present → `notes\nfailurePoint`; only one
 * → that one. DELETE items (null payload) and any non-session-shaped payload pass through untouched.
 */
export function stripClimbingSessionFailurePoint(payload: unknown, url: string): { payload: unknown; url: string } {
  if (payload === null || typeof payload !== 'object') {
    return { payload, url };
  }
  const session = payload as { attempts?: unknown };
  if (!Array.isArray(session.attempts)) {
    return { payload, url };
  }
  const attempts = session.attempts.map((attempt) => {
    if (attempt === null || typeof attempt !== 'object' || !('failurePoint' in attempt)) {
      return attempt;
    }
    const { failurePoint, ...rest } = attempt as Record<string, unknown> & { failurePoint?: unknown };
    const salvaged = typeof failurePoint === 'string' ? failurePoint.trim() : '';
    if (salvaged === '') {
      return rest;
    }
    const existingNotes = typeof rest['notes'] === 'string' ? (rest['notes'] as string) : '';
    return { ...rest, notes: existingNotes.trim() !== '' ? `${existingNotes}\n${salvaged}` : salvaged };
  });
  return { payload: { ...session, attempts }, url };
}

/**
 * Per global version step: the function every entity type gets for that `N → N+1` bump, plus
 * per-entity `overrides`. `MIGRATIONS` is built by walking 1 … `OUTBOX_PAYLOAD_SCHEMA_VERSION`-1 and
 * registering `<entityType>:<v>` for *every* entity type — so a version can never leave a hole for a
 * known type, and a bump with no `STEPS_BY_VERSION` entry throws at module load (guard for
 * "bumped the version but forgot the steps"; the schema-drift guard `npm run verify:outbox` covers
 * the other direction).
 */
interface VersionSteps {
  default: MigrationStep;
  overrides?: Partial<Record<OutboxEntityType, MigrationStep>>;
}

const STEPS_BY_VERSION: Readonly<Record<number, VersionSteps>> = {
  1: { default: rewriteDbUnitToCs },
  2: { default: identityStep, overrides: { ClimbingSession: stripClimbingSessionFailurePoint } },
};

function buildMigrations(): ReadonlyMap<string, MigrationStep> {
  const map = new Map<string, MigrationStep>();
  for (let version = 1; version < OUTBOX_PAYLOAD_SCHEMA_VERSION; version += 1) {
    const steps = STEPS_BY_VERSION[version];
    if (!steps) {
      throw new Error(
        `outbox-migrator: OUTBOX_PAYLOAD_SCHEMA_VERSION is ${OUTBOX_PAYLOAD_SCHEMA_VERSION} but no STEPS_BY_VERSION entry ` +
          `for the v${version} → v${version + 1} step. Add one (default: identityStep, plus overrides for any ` +
          `entity whose payload shape actually changed).`,
      );
    }
    for (const entityType of ALL_ENTITY_TYPES) {
      map.set(`${entityType}:${version}`, steps.overrides?.[entityType] ?? steps.default);
    }
  }
  return map;
}

const MIGRATIONS: ReadonlyMap<string, MigrationStep> = buildMigrations();

/**
 * Every `<entityType>:<v>` key the registry must hold for the current `OUTBOX_PAYLOAD_SCHEMA_VERSION`
 * (`v` = 1 … version-1). Exported so `outbox-migrator.spec.ts` can assert `MIGRATIONS` covers all of
 * them — the runtime half of the "a version bump registers a step for every entity type" guard.
 */
export function expectedMigrationKeys(targetVersion: number = OUTBOX_PAYLOAD_SCHEMA_VERSION): string[] {
  const keys: string[] = [];
  for (let version = 1; version < targetVersion; version += 1) {
    for (const entityType of ALL_ENTITY_TYPES) {
      keys.push(`${entityType}:${version}`);
    }
  }
  return keys;
}

/** Read-only view of the production registry, for the completeness assertion in the spec. */
export function registeredMigrationKeys(): string[] {
  return [...MIGRATIONS.keys()];
}

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

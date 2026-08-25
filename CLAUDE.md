# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Life Management 2.0 — a personal life-management app (hybrid mobile + web), in active implementation.
Monorepo: `backend/` (Java Spring Boot) + `frontend/` (Ionic Angular / Capacitor).

The full specification lives as an Obsidian vault in `documentation/` (mostly Hungarian). It is the
**source of truth** for behavior — when in doubt about how a feature should work, read the relevant
spec there before guessing. Four SSOT architecture notes anchor everything else:

- [`documentation/Architektúra/Backend.md`](documentation/Architektúra/Backend.md) — server stack, OpenAPI, schema, sync endpoints
- [`documentation/Architektúra/Frontend.md`](documentation/Architektúra/Frontend.md) — app-shell, routing, state, feature flags
- [`documentation/Architektúra/Backend-offline first.md`](documentation/Architektúra/Backend-offline%20first.md) — the offline contract (see below)
- [`documentation/Architektúra/Fejlesztői környezet.md`](documentation/Architektúra/Fejlesztői%20környezet.md) — dev environment, run/test commands, Android install

`claude-hobby-starter-kit/` in the repo root is a **vendored reference copy** of a generic starter-kit
template, not an active part of this app. Its `.claude/skills/spring-boot-conventions` and
`.claude/skills/ionic-angular-conventions` are the baseline code conventions this project builds on
(feature-based packages, constructor injection, thin controllers, standalone components, OnPush) —
consult them for baseline style, but this project's own architecture notes override them where they
differ (notably: **Angular Signals replace the `async` pipe / RxJS-in-templates rule** — see Frontend.md
"State management").

## Commands

Database (Postgres via Docker, named volume):
```
docker compose up -d db
```

Backend (`backend/`, Java 25, Spring Boot 4, Gradle):
```
cd backend && ./gradlew bootRun              # local profile, http://localhost:8080
cd backend && ./gradlew build
cd backend && ./gradlew test
cd backend && ./gradlew test --tests "hu.bumler.lm2.gear.PackingSessionServiceTest"
```
On Windows use `gradlew.bat`. `bootRun` auto-loads secrets from the repo-root `.env` (same file
docker-compose reads) if not already set in the environment; `test` does not — Testcontainers
provisions its own Postgres.

Frontend (`frontend/`, Angular 22 / Ionic 8 / Capacitor 8):
```
cd frontend && npm start                     # ng serve; /api proxied to :8080 via proxy.conf.json
cd frontend && npm run build
cd frontend && npm test                      # interactive Karma, watch mode, Chrome
cd frontend && npm run test:ci                # non-interactive, single run — use this in CI / agent sessions
cd frontend && npm run lint
cd frontend && npm run gen:api                # regenerate the Angular API client from backend/src/main/resources/openapi.yaml
```
`test:ci` uses the `ChromeHeadlessCI` Karma launcher, which does not auto-discover Chrome on this
machine — set `CHROME_BIN` explicitly. From the Bash tool:
```
CHROME_BIN="/c/Program Files/Google/Chrome/Application/chrome.exe" npm run test:ci
```

Android install onto a phone on the dev LAN (debug build against the dev machine's backend):
```
scripts/install-android.ps1 [-ApiHost <ip|hostname>] [-Usb]
```
Writes `frontend/src/assets/config/app-config.json` (`apiBaseUrl`), runs `npm run build` +
`npx cap sync android`, builds the debug APK, installs it via `adb`, then probes `GET /api/health`
before finishing. See Fejlesztői környezet.md for Wi-Fi/USB/wireless-debugging setup (firewall rule,
`adb reverse`, cleartext HTTP network-security-config for the debug variant only).

Required env vars (`.env`, git-ignored; `.env.example` is the tracked template): `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB`, `LM2_JWT_SECRET`, `LM2_ADMIN_API_KEY`. Backend local secrets also
go in git-ignored `backend/src/main/resources/application-local.yml` — never in `application.yaml` or
in code.

## Architecture

### Backend-offline first — the central design constraint

This whole app is built around one promise: **the native app is fully usable with no network and no
reachable backend.** Every reads/writes decision below follows from it. Full contract, state machine,
and 20 acceptance criteria: [`Backend-offline first.md`](documentation/Architektúra/Backend-offline%20first.md).

- Connectivity states: `ONLINE`, `BACKEND_OFFLINE` (internet up, own API down), `FULL_OFFLINE`
  (airplane mode), `UNKNOWN` (cold start — treated as offline).
- **Local-first writes only** — there is no "try online, queue on failure" branch. Every mutation
  writes to local SQLite *and* an outbox row in one transaction, always, even when online. The UI
  renders from the local store; the server is a convergence target, not the source of truth for
  rendering.
- Every synced entity gets a **client-generated UUID** (v4, or deterministic v5 for entities with a
  natural key — `UserProfile`, `DailyStepLog`, seeded `Exercise` rows, etc. — so two offline devices
  converge instead of conflicting). Server-side `IDENTITY`/auto-increment PKs are forbidden.
- Deletes are **soft** (`deleted`/`deleted_at` tombstones) so they sync across devices instead of
  producing 404s. A never-synced local draft can still be hard-removed.
- **Outbox** (`outbox_item`): FIFO by `sequence`, coalescing on repeated edits to the same entity,
  dependency chains (`dependsOn`) between not-yet-synced parent/child rows, and a fixed error taxonomy
  (network → retry with backoff; `401` → refresh; `403`/`400`/`422` → `ERROR`; `404` on `DELETE` →
  success; `409 ENTITY_DELETED` → silently drop, tombstone wins; `409 UNIQUE_VIOLATION` → `ERROR` for
  manual resolution; `5xx`/`408`/`429` → retry up to 5 times then `ERROR`).
  Manual recovery (Skip/Unskip/Fix/Drop) lives in the sync center UI (`/tabs/menu/sync`).
- **Pull** is a paginated delta sync against `GET /api/sync/changes?since=<opaque cursor>` — drain
  always runs before pull. `410 CURSOR_TOO_OLD` triggers a full re-pull.
- Conflict policy is deliberately simple: **row-level last-write-wins**, no field merge, no CRDT, no
  ETags/optimistic locking. This is accepted, not overlooked — see §9/§17 for the reasoning and known
  limits (e.g. counter-like fields such as stock deduction can lose a relative update across two
  offline devices).
- **Web build is online-only** — no SQLite, no outbox. The `offlineCapable` flag (native=true,
  web=false) is the only thing feature code may branch on; never branch on platform strings.
- Every spec file under `documentation/` is required to document this per-feature under
  `#### Backend-offline` — see "Documentation specs" below.

### Backend (`backend/src/main/java/hu/bumler/lm2/`)

- **Feature-based packages**, not layers: `hu.bumler.lm2.<feature>` (`auth`, `gear`, `profile`, …) plus
  `hu.bumler.lm2.common` for cross-cutting config/error-handling/normalization. Within a feature:
  Controller (thin, implements a generated interface) → Service (`@Transactional`, business logic) →
  Repository. DTOs only at the boundary — generated OpenAPI models in/out, JPA entities never leave
  the service layer; mapping is done by hand in a `*Mapper` per feature.
- **OpenAPI is spec-first and hand-written**: `backend/src/main/resources/openapi.yaml` (root) plus
  `openapi/paths/*.yaml` and `openapi/components/schemas/*.yaml` via `$ref`. Nothing is generated from
  code (no springdoc code-first). The `openApiGenerate` Gradle task runs before `compileJava` and
  produces Java interfaces + DTOs (with jakarta validation) into `build/generated/openapi/` —
  **not committed**. Controllers implement those generated interfaces, so a spec/implementation
  mismatch is a compile error. `GET /api/sync/changes` and `GET /api/health` are hand-added to the
  spec (they aren't CRUD-template endpoints).
- **Flyway** migrations in `src/main/resources/db/migration/V<n>__<description>.sql`; applied
  migrations are never edited. `ddl-auto=validate`, no auto-DDL. Every synced table carries
  `id uuid` (client-supplied PK), `created_at`, `updated_at` (`timestamptz`, set by a DB `BEFORE
  INSERT OR UPDATE` trigger — including on bulk cascade updates, which is load-bearing for the delta
  pull), `deleted boolean`, `deleted_at`, and `user_id uuid` on user-owned tables. Uniqueness is
  enforced with **partial unique indexes on live rows** (`WHERE deleted = false`) over a
  `name_normalized` column — this is why Postgres is required (MySQL/MariaDB/H2 can't do partial
  indexes, which is also why integration tests use Testcontainers Postgres, pinned to the same image
  tag as `docker-compose.yml`, rather than H2).
- **Name/barcode/hex-color/quantity normalization must match the frontend bit-for-bit** — shared
  parity fixtures live in `shared/fixtures/*.json` and are read by both the Java and TypeScript test
  suites. Adding an edge case means adding a fixture row, not a one-off test on either side.
- Global error shape: `{ code, message, field?, conflictingId? }` from one `@RestControllerAdvice`.
  `message` is server-side/undebugged text only (diagnostics + sync-center fallback) — user-facing
  text is always translated client-side from `code`, so every new error class needs a stable `code`.
  `POST` with an existing id is idempotent upsert (`200`, never `409`); `PUT` on a soft-deleted row is
  `409 ENTITY_DELETED`; `GET` by id on your own deleted row is `200` with `deleted: true`; on someone
  else's row it's `404` (never `403`, to avoid enumeration).
- `Idempotency-Key` header required on all mutating requests, tracked in an `idempotency_key` table for
  30 days — needed because the atomic multi-entity endpoints (e.g.
  `POST /api/shopping-lists/{id}/complete`) are not naturally idempotent the way plain CRUD upsert is.
- Admin API (`/api/admin/**`) is gated by `X-Admin-Api-Key`, not a JWT role.

### Frontend (`frontend/src/app/`)

Layering (`pages/`, `shared/`, `core/`, `api/`):

| Layer | Responsibility |
|---|---|
| `api/` | Generated OpenAPI client (models + services). **Never hand-edited.** Only `SyncEngine` and `HttpStorageBackend` call it — page/component code never does. |
| `core/storage/` | `StorageBackend` interface (see [`storage-backend.ts`](frontend/src/app/core/storage/storage-backend.ts)) with two implementations: `SqliteStorageBackend` (native: local store + outbox in one transaction) and `HttpStorageBackend` (web: direct call to the generated client). Chosen once, in DI, by `offlineCapable`. |
| `core/data/<entity>.repository.ts` | Typed façade over `StorageBackend`; reads as signals. This is the only thing feature code talks to for data. |
| `core/sync/` | `SyncEngine` (drain/pull orchestration, connectivity signal), `OfflineQueueService` (outbox CRUD — the only writer to `outbox_item`, used by both `SyncEngine` and the sync-center UI), `OutboxMigrator` (payload schema migration across app updates). |
| `core/session/`, `core/config/` | Auth/token lifecycle; `FeatureFlags`, `NetworkStatus`, `AppConfig`, `LanguageService`, `ThemeService`. |
| `pages/<page>/` | Screens; child components live inside their parent's folder. Naming: `{name}.page.ts`, `{name}.component.ts`, `{name}.service.ts`, `{name}.guard.ts`, `{name}.repository.ts`. |
| `shared/` | Cross-feature pure components/utilities (quantity input, text search, name-uniqueness, reorder list, status-cycle card, sync-status button). |

- **State management: Angular Signals + `providedIn: 'root'` services. No NgRx, no global store
  library.** On native, local SQLite is the source of truth, so a duplicate in-memory global store
  would just be a second copy to keep in sync. RxJS is confined to the HTTP/plugin boundary; the UI
  side is signals, OnPush everywhere. **This deliberately overrides** the starter-kit convention's
  `async` pipe / manual-subscribe guidance.
  RxJS discipline still applies at the boundary.
- **API base URL:** web uses a relative `/api` (dev proxy / prod reverse proxy, no CORS needed).
  Native uses a **runtime** asset, `frontend/src/assets/config/app-config.json` → `apiBaseUrl`, so the
  install script can retarget a build without touching TypeScript. `environment.ts` only holds
  build-time constants (`production`); feature flags are likewise a runtime asset
  (`assets/config/features.json`), not a code constant, so they're available Full-Offline too.
- **Tab registry, not hardcoded tabs**: 4 bottom tabs (Kaja/food, Edzés/workout, Feladatok/tasks, Menü),
  built from a feature-flagged config. Disabling a flag removes its tab/segment/route (guarded), never
  leaves a disabled-looking button. Full route map and flag registry: Frontend.md.
- Every screen/entity spec documents its offline behavior per the vault's shared template — see
  "Documentation specs" below.

### Documentation specs (`documentation/`)

This is an **Obsidian vault**, and it's under active governance:

- Every spec file (Features, Subfeatures, Architektúra) uses a fixed heading structure: `# Title` →
  `## Business` (Státusz/Szülő/Kapcsolódó table, Célállapot, Funkcionális leírás, UI/UX elvárások,
  Megjegyzések, Nyitott kérdések) → `## Architektúra` (Frontend → **Backend-offline** → Backend →
  Nyitott kérdések). Exact template and placeholder text for "not applicable" sections:
  `.cursor/skills/documentation-spec/SKILL.md` (also mirrored in `documentation/SPEC-TEMPLATE.md`).
- **A `#### Backend-offline` subsection under Frontend is mandatory on every spec** (except
  `SPEC-TEMPLATE.md` and `Backend-offline first.md` itself) — describing whether/how the feature works
  Backend-offline and Full-offline, and referencing `[[Backend-offline first]]`. A `.cursor/hooks`
  Python hook (`check-backend-offline-spec.py`) checks for this after file writes/edits.
  When you edit a doc under `documentation/`, reformat it to this structure and don't skip this
  section, unless the user explicitly says not to.
- Status field is one of exactly: `TODO`, `Váz`, `Ideiglenes`, `Kész`.
- Use `[[Wikilink]]` syntax for cross-references between notes.

## Notes

- Repo is mid-implementation: the spec (`documentation/`) is fully closed (`Kész`), and the backend
  and frontend are being built out feature by feature (auth, profile, and the GearCheck slice — gear
  items, packing templates, packing sessions — exist so far). Check a feature's own spec under
  `documentation/Features/` or `documentation/Subfeatures/` for its concrete contract before
  implementing it.
- [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) (repo root) tracks *code* completeness per
  feature — separate from the vault's `Státusz` field, which only tracks spec completeness (and is
  always `Kész`). Each done entry pins the spec file's commit hash at verification time; if that spec
  file has since moved on, the feature is stale and needs re-verification before being trusted as done.
  Check it before re-surveying the whole repo, and update it when you finish or touch a feature.
- Backend/frontend version numbers are **not pinned by the spec** — `build.gradle.kts` and
  `package.json` are the source of truth; the architecture docs only state constraints (e.g. Java 25,
  Spring Boot 4.x, Postgres, Ionic 8+, Angular Signals + standalone, Capacitor 8+).

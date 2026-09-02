# Audit — Chunk 14: Architecture SSOTs + cross-cutting + hub
Audit commit: `ff23984`

Specek:
- `documentation/Architektúra/Backend.md`
- `documentation/Architektúra/Frontend.md`
- `documentation/Architektúra/Backend-offline first.md`
- `documentation/Architektúra/Fejlesztői környezet.md`
- `documentation/Architektúra/Mennyiség mező.md`
- `documentation/Architektúra/Névegyediség.md`
- `documentation/Architektúra/Szöveges keresés.md`
- `documentation/Life Management 2.0.md`

Kód:
- `frontend/src/app/core/sync/` (sync-engine.service.ts, offline-queue.service.ts, outbox-migrator.ts, data-change-notifier.ts, connection-state.ts, outbox-item.ts, uuid.ts, outbox-entity-registry.ts)
- `frontend/src/app/core/storage/` (storage-backend.ts, storage-backend.provider.ts, sqlite-storage-backend.ts, http-storage-backend.ts, local-database.service.ts)
- `frontend/src/app/core/config/` (feature-flags.service.ts, feature-flag.guard.ts, tab-registry.ts, app-config.service.ts), `core/session/`, `core/health/`
- `frontend/src/app/shared/` (name-normalization.ts, barcode-normalization.ts, hex-color-normalization.ts, quantity.ts, text-search.ts + specs)
- `backend/src/main/java/hu/bumler/lm2/common/` (NameNormalizer, BarcodeNormalizer, HexColorNormalizer, QuantityConverter, DeterministicUuid, GlobalExceptionHandler, HealthController, NestedChildResolver, IdempotencyKey*, sync/*)
- `backend/src/main/java/hu/bumler/lm2/auth/AdminApiKeyFilter.java`, `SecurityConfig.java`
- `backend/src/main/resources/openapi.yaml` + `openapi/paths/*` + `openapi/components/schemas/*`
- `backend/src/main/resources/db/migration/V1..V29`
- `backend/build.gradle.kts`, `frontend/package.json`, `docker-compose.yml`, `frontend/proxy.conf.json`, `scripts/install-android.ps1`, `shared/fixtures/*.json`

Tesztek:
- backend: `common/{NameNormalizerTest,BarcodeNormalizerTest,HexColorNormalizerTest,QuantityConverterTest,NestedChildResolverTest,GlobalExceptionHandlerTest,ProfileUniqueConstraintRaceTest,AycmSettingsUniqueConstraintRaceTest}`, `common/sync/{SyncChangesViewCompletenessTest,SyncEndpointIntegrationTest}`
- frontend: `core/sync/{offline-queue.service,outbox-migrator,outbox-entity-registry,sync-engine.service}.spec.ts`, `core/config/{feature-flags.service,feature-flag.guard}.spec.ts`, `shared/{name-normalization,barcode-normalization,hex-color-normalization,quantity,text-search,timezone,local-date}.spec.ts`

---

## documentation/Architektúra/Backend.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| B1 | Stack: Java 25, Spring Boot 4.x, Gradle Kotlin DSL, Postgres, Spring Data JPA, Flyway, JUnit5+AssertJ+Mockito, Testcontainers | Implemented | `backend/build.gradle.kts` (`languageVersion = 25`, `org.springframework.boot" version "4.1.0"`, flyway + data-jpa + testcontainers-postgresql deps) | — |
| B2 | Build fájl az SSOT a verziókra, spec csak megkötést ír | Implemented | `build.gradle.kts` pins SB 4.1.0 / generator 7.24.0; spec pillanatkép (SB 4.1) egyezik | — |
| B3 | OpenAPI spec-first, kézzel írt `openapi.yaml` gyökér + `openapi/paths/*` + `openapi/components/schemas/*` `$ref`-fel; semmi kódból | Implemented | `openapi.yaml` (75+ `$ref` path), `openapi/paths/` (74 fájl), `openapi/components/schemas/` (95 fájl); nincs springdoc dep | — |
| B4 | `GET /api/sync/changes` és `GET /api/health` kézzel felvéve a specbe | Implemented | `openapi/paths/health.yaml`, `openapi/paths/sync-changes.yaml`; `SyncApi`/`HealthApi` generált interfészt implementál `SyncController`/`HealthController` | — |
| B5 | `openApiGenerate` a `compileJava` előtt fut, `build/generated/openapi/`-ba, nem commitolva; `spring` generátor `interfaceOnly=true`, `useTags=true`, jakarta validation | Implemented | `build.gradle.kts` `openApiGenerate {}` + `tasks.named("compileJava") { dependsOn("openApiGenerate") }`, `useBeanValidation=true`, `useJakartaEe=true` | — |
| B6 | Validáció a sémában él (`required`/`maxLength`/`pattern`/`minimum`) → generált DTO jakarta annotációt kap | Implemented | `openapi/paths/sync-changes.yaml` (`limit` `minimum:1 maximum:2000 default:500`); `useBeanValidation=true`; `GlobalExceptionHandler.handleValidation(MethodArgumentNotValidException)` | — |
| B7 | Swagger UI a becsomagolt statikus specből szolgálódik ki | Missing (non-blocking) | Nincs springdoc / swagger-ui-webjar dependency a `build.gradle.kts`-ben; nincs statikus swagger asset | Spec: törölni a Swagger UI mondatot, vagy külön backlog-jegy (dev-only kényelem, nem blokkoló) |
| B8 | Angular kliens: `typescript-angular` profil, `providedInRoot=true`, `frontend/src/app/api/`-ba, **commitolva** | Implemented | `frontend/package.json` `gen:api` script (`-g typescript-angular ... providedInRoot=true`); `frontend/src/app/api/` verziókövetett | — |
| B9 | Flyway `V<n>__<leírás>.sql`, alkalmazott migráció nem módosul, `ddl-auto=validate`, auto-DDL tilos | Implemented | `db/migration/V1..V29`; `application.yaml` `ddl-auto: validate` | — |
| B10 | Közös oszlopok minden szinkronizált táblán: `id uuid` PK (kliens adja), `created_at`, `updated_at timestamptz`, `deleted bool default false`, `deleted_at`, user-owned: `user_id uuid not null` | Implemented | `V6__gear_item.sql` (`id uuid PRIMARY KEY`, `user_id uuid NOT NULL REFERENCES users`, `timestamptz` audit, `deleted boolean NOT NULL DEFAULT false`, `deleted_at`) — minta minden entitás-migrációra | — |
| B11 | `updated_at` DB triggerből (`BEFORE INSERT OR UPDATE` → `now()`), cascade bulk UPDATE-re is; JPA `@Generated` | Implemented | `V1__common_infrastructure.sql` `set_updated_at()`; `V6` `CREATE TRIGGER gear_item_set_updated_at ... EXECUTE FUNCTION set_updated_at()` | — |
| B12 | Partial unique index élő sorokra (`WHERE deleted = false`) a `name_normalized` oszlopon; `name_normalized` alkalmazás-írott, nem generated column | Implemented | `V6` `CREATE UNIQUE INDEX idx_gear_item_user_id_name_normalized ON gear_item (user_id, name_normalized) WHERE deleted = false`; komment: "name_normalized is application-written" | — |
| B13 | `(user_id, updated_at)` index a delta pull szűréshez | Implemented | `V6` `CREATE INDEX idx_gear_item_user_id_updated_at ON gear_item (user_id, updated_at)` | — |
| B14 | Tombstone fizikai törlés 180 nap után, ütemezett job; `sync_meta.tombstone_horizon` | Partial | `V1` `sync_meta` tábla + `tombstone_horizon` (`now() - interval '180 days'`); `SyncService.tombstoneHorizon()` olvassa a `410`-hez. **Ütemezett cleanup job nincs a kódban** (nincs `@Scheduled` / horizon-frissítő) | Spec: jelezni, hogy a retenciós job későbbi (a `410` ág és a horizon-olvasás áll); vagy backlog-jegy a cleanup jobra |
| B15 | Névnormalizálás kliens–szerver paritás: NFC → trim (`U+00A0`) → belső whitespace 1 szóköz → `toLowerCase(Locale.ROOT)`, ékezet marad; közös fixture `shared/fixtures/name-normalization.json` | Implemented | `common/NameNormalizer.normalize` (NFC + `[\s ]+`→" "+trim + `Locale.ROOT`); `NameNormalizerTest` (`FIXTURE_PATH = ../shared/fixtures/name-normalization.json`, `@MethodSource`); frontend `shared/name-normalization.ts` + `.spec.ts` | — |
| B16 | `normalizeBarcode` és `normalizeHexColor` saját fixture-fájllal | Implemented | `common/BarcodeNormalizer`, `common/HexColorNormalizer`; `shared/fixtures/{barcode,hex-color}-normalization.json`; `BarcodeNormalizerTest`, `HexColorNormalizerTest`, frontend `shared/{barcode,hex-color}-normalization.spec.ts` | — |
| B17 | Mennyiség kanonikus egység-konverzió közös fixture-ön (`shared/fixtures/quantity-conversion.json`), Java + TS | Implemented | `common/QuantityConverter` (WEIGHT/VOLUME/PIECE/TIME multipliers = fixture); `QuantityConverterTest` asserts table == fixture; frontend `shared/quantity.ts` + `.spec.ts` | — |
| B18 | `Food` mezőhalmaz-duplikáció alkalmazás-szintű, nem index | Implemented | `common/QuantityConverter.quantitiesEqual` (family-check + kanonikus amount); IMPLEMENTATION_STATUS "Élelmiszerek" — app-level minden mezőre | — |
| B19 | `GET /api/health`: publikus, DB-kör nélküli, konstans válasz | Implemented | `common/HealthController.getHealth()` → `new HealthResponse("UP")`; `SyncEndpointIntegrationTest.health_isPublic_andRespondsWithoutAnAuthorizationHeader` | — |
| B20 | `GET /api/sync/changes`: keyset pagináció `(updated_at, id)` egy `sync_changes` SQL view-n, minden szinkronizált tábla `UNION ALL` (`entity_type`,`id`,`user_id` shared=NULL,`updated_at`,`deleted`) | Implemented | `V4__sync_changes_view.sql` + minden entitás-migráció `CREATE OR REPLACE VIEW sync_changes` (V29: 40+ UNION ALL, `Food`/`Recipe`/`RecipeIngredient` `NULL::uuid AS user_id`); `common/sync/SyncChangesRepository`, `SyncService.pull` | — |
| B21 | Szűrés `user_id = :userId OR user_id IS NULL`; lapozás `(ts,id) > (:ts,:id) ORDER BY updated_at,id LIMIT :limit+1`; `+1` adja `hasMore`-t | Implemented | `SyncService.pull` (`rows.size() > limit`, `page = rows.subList(0, limit)`); `SyncChangesRepository.page(userId, since, types, limit+1)` | — |
| B22 | `data` payload nem a view-ból: típusonként batch-load, ugyanaz a mapper mint a CRUD `GET` | Implemented | `SyncService.loadData` → `SyncedEntityDataLoader.loadByIds` per entityType (`loadersByEntityType`) | — |
| B23 | `nextCursor` opaque base64(`updated_at` + `id`), nem nyers timestamp | Implemented | `common/sync/SyncCursor.encode` (`Base64.getUrlEncoder().withoutPadding()` of `instant + "_" + id`) | — |
| B24 | Kötelező teszt: minden `deleted` oszlopos tábla szerepel a view-ban | Implemented | `common/sync/SyncChangesViewCompletenessTest.everyTableWithADeletedColumn_isReferencedBySyncChangesView` (élő sémából diszkveri mindkét oldalt) | — |
| B25 | `410 CURSOR_TOO_OLD`, ha `since` régebbi a `sync_meta.tombstone_horizon`-nál | Implemented | `SyncService.pull` (`since.updatedAt().isBefore(tombstoneHorizon())` → `CursorTooOldException`); `GlobalExceptionHandler.handleCursorTooOld` → `410` + `CURSOR_TOO_OLD`; `SyncEndpointIntegrationTest.syncChanges_sinceOlderThanTombstoneHorizon_is410CursorTooOld` | — |
| B26 | Cursor-lapozás kihagyás és duplikátum nélkül | Implemented | `SyncEndpointIntegrationTest.syncChanges_pagesThroughAllChanges_withoutSkippingOrDuplicating` | — |
| B27 | `Idempotency-Key` minden módosító kérésen; `idempotency_key` tábla (`key`,`user_id`,`endpoint`,`http_status`,`response_body`,`created_at`), replaynél tárolt válasz, 30 nap retenció | Partial | `V1` `idempotency_key` tábla + `idx_idempotency_key_created_at` (30-day prune komment); `common/IdempotencyKeyEntity`/`Repository`; `food/ShoppingListService.complete` olvassa/írja (replay → `readCachedResponse`). **De: az OpenAPI-ban `Idempotency-Key` header csak `shopping-lists-item-complete.yaml`-on van; a plain CRUD végpontok nem kérik/ellenőrzik.** A natív drain minden kérésre küldi (`sync-engine.service.ts` `executeOutboxItem` header), a web (`HttpStorageBackend`) csak a complete-re | Spec: pontosítani — `Idempotency-Key`-t a natív drain minden replay-en küldi, a szerver a **nem-idempotens atomi** végpontokon kényszeríti ki (`idempotency_key`, 30 nap); a plain CRUD a kliens-UUID upsert idempotenciájára támaszkodik. A retenciós prune job (mint B14) még nincs kódban |
| B28 | Upsert: explicit `findById` → insert/update a service-ben; `POST` létező `id`-val → `200` + frissített sor, nem `409` | Implemented | `openapi/paths/gear-items.yaml` post: "idempotent upsert on the client-supplied id", `200` "Created or, on retry with the same id, the existing row"; feature service-ek (`NestedChildResolver` komment: manuálisan assigned `@Id`) | — |
| B29 | Nested aggregate `PUT`: teljes fa cseréje egy tranzakcióban, gyerekeken soft delete a kiesőkre; `common/NestedChildResolver` (create/undelete/error) | Implemented | `common/NestedChildResolver.resolve` (existing→undelete / existsElsewhere→`EntityNotFoundException` / else→factory); `NestedChildResolverTest`; frontend tükör `sync-engine` `*ApplyTasks` (PackingTemplate/Recipe/Meal/ShoppingList/WorkoutSession/ClimbingSession/WorkoutPlan/WeeklyPlan) | — |
| B30 | Egy globális `@RestControllerAdvice`, nincs szétszórt try/catch; válasz `{ code, message, field?, conflictingId? }`; `conflictingId` csak `409 UNIQUE_VIOLATION`-nél | Implemented | `common/GlobalExceptionHandler` (`@RestControllerAdvice`, minden domain kivétel → HTTP); `ApiError` model `code/message/field/conflictingId`; `handleUniqueViolation` tölti `conflictingId`-t | — |
| B31 | Szerver hibaüzenete nincs lokalizálva; user-szöveg kliensen `code`-ból; minden hibaosztálynak stabil `code` | Implemented | `GlobalExceptionHandler` — statikus angol `message`, stabil `code` (`NOT_FOUND`/`ENTITY_DELETED`/`UNIQUE_VIOLATION`/`CURSOR_TOO_OLD`/`UNAUTHORIZED`/`VALIDATION_ERROR`/`INTERNAL_ERROR`) | — |
| B32 | Postgres `23505` elkapva → `409` + `UNIQUE_VIOLATION` + `field`; index-név → mező leképezés a `common`-ban egy helyen; `500`-nál nincs stack trace | Implemented | `GlobalExceptionHandler.handleUniqueConstraint` (`DataIntegrityViolationException` → `extractConstraintName` → `UNIQUE_INDEX_TO_FIELD` map, 14 index); `handleUnexpected` → `INTERNAL_ERROR`/"Unexpected error" | — |
| B33 | `PUT` törölt entitáson → `409` + `ENTITY_DELETED`; idegen user sora → `404` (nem `403`) | Implemented | `GlobalExceptionHandler.handleDeleted` (`EntityDeletedException`→`409`/`ENTITY_DELETED`), `handleNotFound`→`404`; feature service-ek dobják; frontend `sync-engine.classifyAndHandle` kezeli a `409 ENTITY_DELETED`-et | — |
| B34 | Admin API `/api/admin/**` `X-Admin-Api-Key` filterrel, nem JWT role-lal | Implemented | `auth/AdminApiKeyFilter` (`request.getRequestURI().startsWith("/api/admin/")` → `X-Admin-Api-Key` `MessageDigest.isEqual` konstans-idejű összevetés → `401` `ApiError` ha rossz); `SecurityConfig` wire-eli | — |
| B35 | Kliens UUID (v4, természetes kulcsnál v5); szerveroldali `IDENTITY`/auto-increment **tilos**; OpenAPI ID-k UUID típusúak | Implemented | `common/DeterministicUuid.v5` (fix namespace `b8f1d9a0...`, SHA-1, v5 nibble); minden entitás-migráció `id uuid PRIMARY KEY` (nincs `serial`/`IDENTITY`); frontend `core/sync/uuid.ts` párja | — |
| B36 | Külső integrációk nincsenek proxyzva a backenden | Implemented | Nincs OFF / Health Connect / Google proxy-controller a `backend/`-ben; `core/health/health-connect.plugin.ts` + `pages/food/catalog/open-food-facts.service.ts` közvetlen kliens-hívás | — |
| B37 | Nincs titok kódban / `application.yml`-ben (env + git-ignorált `application-local.yml`) | Implemented | `build.gradle.kts` `bootRun` env-loader `.env`-ből; `application.yaml` `${...}` placeholderek; CLAUDE.md megerősíti | — |
| B38 | Shared/global entitások (`Food`,`Recipe`,`RecipeIngredient`) — nincs `user_id`, `WHERE (user_id = ? OR user_id IS NULL)` a sync-ben | Implemented | `V12__food.sql` (nincs `user_id` a `food`-on); `sync_changes` view `NULL::uuid AS user_id` a `food`/`recipe`/`recipe_ingredient` soraiban; `SyncChangesRepository` generikus szűrő | — |
| B39 | Nyitott kérdés: prod hosting / TLS | STILL OPEN | — | Spec: `> Tervezett: [[backlog/006-prod-hosting-tls]]` pointerre rövidíteni |
| B40 | Nyitott kérdés: openapi-generator `spring` profil SB4/Framework7 kimenet ellenőrzés | CODE-RESOLVED (részben) | `build.gradle.kts` generátor `7.24.0` + `spring` profil SB `4.1.0`-val, `useBeanValidation`/`useJakartaEe` pinelve, build zöld (~40 controller implementálja a generált interfészeket) | Spec: jelenlegi működésre átírni ("a 7.24.0 generátor SB 4.1-gyel fordul; a tartalék kézi interface nem kellett"); a verzió-emeléskori re-check karbantartási emlékeztetőt `> Tervezett: [[backlog/008-openapi-generator-spring-boot-4-kimenet-ellenorzes]]` pointerre rövidíteni |

---

## documentation/Architektúra/Frontend.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| F1 | Ionic 8+ Angular standalone, lazy-loaded route-ok, hibrid natív + web | Implemented | `frontend/package.json` (`@ionic/angular ^8`, `@angular/core 20.3.25`, `@capacitor/core 8.5.0`) | — |
| F2 | Verziópolitika: `package.json` az SSOT, spec csak megkötést ír (Signals + standalone + OnPush; Capacitor 8+) | Implemented | `package.json`; spec pillanatkép (Angular 22 / Ionic 8.8) kb. egyezik (Angular 20.3 van — pillanatkép "nem szerződés") | — |
| F3 | Rétegzés: `api/` generált, soha nem kézi; csak `SyncEngine` + `HttpStorageBackend` hívja | Implemented | `frontend/src/app/api/` generált; hívók: `core/sync/sync-engine.service.ts`, `core/storage/http-storage-backend.ts` (page-kód nem importál `api/`-t) | — |
| F4 | `core/storage/`: `StorageBackend` interfész két impl-lel (`SqliteStorageBackend` natív, `HttpStorageBackend` web); a választás DI-ban egyszer, `offlineCapable`-ből | Implemented | `core/storage/storage-backend.provider.ts` `provideStorageBackend()` (`Capacitor.isNativePlatform() ? SqliteStorageBackend : HttpStorageBackend`) | — |
| F5 | `core/data/<entity>.repository.ts`: tipizált homlokzat, olvasás signalként; nagy megosztott katalógusok (`Food`,`Recipe`) in-memory cache, pull után `DataChangeNotifier` billenti | Implemented | `core/data/` 60+ repository; `core/sync/data-change-notifier.ts` (`tick` + `changedTypes` signal); `sync-engine.pull()` → `dataChanges.notifyChanged(changedTypes)` | — |
| F6 | `core/sync/`: `SyncEngine` (orchesztráció), `OfflineQueueService` (outbox CRUD — egyetlen író), `OutboxMigrator` (payload-verzió), `DataChangeNotifier` | Implemented | mind a 4 fájl megvan; `SyncEngineService` sosem ír közvetlenül az `outbox_item`-be (minden `this.offlineQueue.*`-on át) | — |
| F7 | `core/session/`: `AuthSession`, auth guard, token interceptor, secure storage | Implemented | `core/session/{auth-session.service,auth.guard,auth.interceptor,token-refresh-coordinator.service,jwt}.ts` | — |
| F8 | `core/config/`: `FeatureFlags`, `NetworkStatus`, `AppConfig`, `LanguageService`, `ThemeService` | Implemented | `core/config/{feature-flags.service,app-config.service,language.service,theme.service}.ts`; `NetworkStatus` = `SyncEngineService.connectionState` signal + `@capacitor/network` listener az `init()`-ben | — |
| F9 | State: Angular Signals + `providedIn:'root'`, nincs NgRx; RxJS csak a határon; OnPush | Implemented | Nincs `@ngrx` a `package.json`-ban; `SyncEngineService`/`OfflineQueueService` `signal()`-ök; `rxjs` csak HTTP/plugin határon (`firstValueFrom`) | — |
| F10 | Tab registry: 4 gomb feature-flagelt configból, nem beégetve; 5. gomb / átrendezés = config-változás | Implemented | `core/config/tab-registry.ts` `TAB_REGISTRY` (food/workout/tasks flaggel, menu `flag: null`) | — |
| F11 | Route-térkép gyökerei (`/login` tabokon kívül, `/tabs/food/meals` default, `/tabs/menu/sync` stb.); régi `/tabs/dashboard/sync` elavult | Partial | tab-registry + IMPLEMENTATION_STATUS szerint a route-ok élnek (`pages/menu/sync/`, `pages/food/meal/`); a teljes route-tábla feature-specenként — nem auditáltam mind fájl-szinten ebben a chunkban | Feature-chunkok dolga; itt nincs eltérés jelezve |
| F12 | `SyncStatusButton` shared komponens minden tab-gyökér toolbar `end` slotjában; állapotok (nincs jelzés / forgó / offline / óra+db / piros hibaszám); tap → `/tabs/menu/sync`; weben csak kapcsolat-állapot | Implemented | `shared/sync-status-button/sync-status-button.component.ts` + `.spec.ts`; `SyncEngineService.draining` signal a "forgó" állapothoz; `OfflineQueueService.pendingCount`/`errorCount` | — |
| F13 | Feature flag: build-time ship config `src/assets/config/features.json`, tipizált `FeatureFlags` root service **szinkron** olvassa; teljes kulcslista; hiányzó/ismeretlen = dev hard error / prod `false` | Implemented (kis eltérés) | `core/config/feature-flags.service.ts` `import featuresConfig from '../../../assets/config/features.json'` (build-időben bundle-ölt, szinkron); `FEATURE_FLAG_KEYS` + dev hiba. A spec "build-time validált, szabálysértés fordítási hiba" — a kód **load-time** dev-hibával közelíti (a komment ezt kimondja) | Spec: megjegyezni, hogy a dependency-validáció load-time dev-hiba (runtime asset), nem szó szerinti fordítási hiba |
| F14 | Kikapcsolt feature: route guard blokkol (deep link → default tab), seed/ütemező/háttérfeladat sem indul; delta pull nem szűr flag szerint | Implemented | `core/config/feature-flag.guard.ts` + `.spec.ts`; `sync-engine.getSyncChanges(since)` `types` nélkül hívja (nincs flag-szűrés) | — |
| F15 | Flag registry 19 kulcs (`tab.kaja`..`menu.gearcheck`) + függőségek (`kaja.* → tab.kaja`, `menu.bevasarlas → tab.kaja`, `feladatok.googleExport → feladatok.esemenyek` stb.) | Implemented | `feature-flags.service.ts` `FeatureFlagKey` union (19 kulcs 1:1 a spec táblával), `FEATURE_FLAG_DEPENDENCIES` map (11 él, egyezik a spec "Függőségek" táblájával) | — |
| F16 | `offlineCapable` nem feature flag, hanem platform-képesség (natív=true, web=false); a feature kód erre ágazik, nem platform-stringre | Implemented | `storage-backend.provider.ts` (egyszeri DI-döntés); `sync-engine.probeAndSync` `nativeSyncEnabled = Capacitor.isNativePlatform()` | — |
| F17 | Cold start sorrend: FeatureFlags (szinkron) → nyelv/téma → session secure storage → user-DB nyitás + séma-upgrade + seed → default tab **csak helyi store-ból** → **csak ezután, nem blokkolóan** health-probe → drain → pull, Health Connect, értesítés-újraütemezés | Implemented | `sync-engine.init()` (nem awaitolt, `void this.probeAndSync()`); `local-database.service.open(userId)` (`lm2_<userId>`, `addUpgradeStatement` minden nyitáskor); `core/health/activity-step-sync.service.ts`; `core/notifications/` | — |
| F18 | Capacitor pluginok: `@capacitor-community/sqlite`, `@capacitor/network`, `@capacitor/app`, `@capacitor-mlkit/barcode-scanning`, `@capacitor/local-notifications`, `@capacitor/background-runner` (08:00 háttér), Health Connect bridge, secure storage, `@capacitor/preferences` | Implemented (bridge-eltérés) | `package.json`: sqlite `^8.1.1`, network `^8.0.1`, app `8.1.1`, mlkit `^8.1.0`, local-notifications `^8.3.1`, preferences `^8.0.1`, **`@aparajita/capacitor-secure-storage ^8.0.0`** (secure storage). **`@capacitor/background-runner` NINCS** — a 08:00 háttérfeladat helyette `core/notifications/background-reminders.plugin.ts` (saját). Health Connect: saját `core/health/health-connect.plugin.ts` + `frontend/android/app/src/main/java/hu/bumler/lm2/health/HealthConnectStepsPlugin.kt` (`androidx.health.connect:connect-client`) | Spec: `@capacitor/background-runner` sort a tényleges megoldásra cserélni (saját háttér-plugin); Health Connect és secure storage sorokból a "csomagválasztás: Nyitott kérdések" hivatkozást törölni (lásd NYK-diszpozíció) |
| F19 | API base URL: web relatív `/api` (proxy/reverse-proxy); natív futásidejű `assets/config/app-config.json` → `apiBaseUrl`; `environment.ts` csak build-konstans; feature flag config szintén asset | Implemented | `frontend/proxy.conf.json` (`/api` → `:8080`); `src/assets/config/app-config.json` (`apiBaseUrl`); `core/config/app-config.service.ts` | — |
| F20 | Lokális SQLite séma-verziózás: numbered `SCHEMA_Vn_STATEMENTS` + `SCHEMA_VERSION` a plugin verziózott upgrade-mechanizmusához; múltbeli `SCHEMA_Vn` blokk nem szerkeszthető, csak append | Implemented | `core/storage/local-database.service.ts` `SCHEMA_V1..V27_STATEMENTS`, `SCHEMA_VERSION = 27`, `SCHEMA_UPGRADES: capSQLiteVersionUpgrade[]`, `addUpgradeStatement` minden `open()`-ben; osztály-doc kimondja a "ne szerkeszd" szabályt | — |
| F21 | Web build online-only: nincs SQLite / outbox / optimista írás; `StorageBackend` két impl miatt a web build fordul; a web nem QA-zott, nem publikált | Implemented | `http-storage-backend.ts` ("no local store, no outbox"); `sync-engine.probeAndSync` web ág (`if (!nativeSyncEnabled) return;` a drain/pull előtt, de a kapcsolat-probe fut) | — |
| F22 | Számítási utility-k pure TS, framework-független (MET, BMR/TDEE, nettó bér, `nextDue`, naptár-vetítés, nehézségi index) | Implemented | `shared/tdee-calculator.ts`, `shared/net-pay-calculator.ts`, `core/data/{event-occurrence,household-occurrence,activity-kcal}.ts`, `shared/climbing/climbing-grade-matrix.ts` (+ mind `.spec.ts`) | — |
| F23 | Nyitott kérdés: Health Connect bridge csomagválasztás (közösségi vs saját plugin) | CODE-RESOLVED | Saját plugin: `core/health/health-connect.plugin.ts` (`registerPlugin('HealthConnectSteps')`) + `android/.../health/HealthConnectStepsPlugin.kt`; `core/health/health-connect-step-source.service.ts` | Spec: jelen idejűre átírni ("saját Capacitor plugin, `androidx.health.connect:connect-client`"), a Nyitott kérdés sort törölni |
| F24 | Nyitott kérdés: secure storage konkrét csomag | CODE-RESOLVED | `@aparajita/capacitor-secure-storage ^8.0.0` a `package.json`-ban, használja `core/session/auth-session.service.ts` (+ `.spec.ts`) | Spec: jelen idejűre átírni ("`@aparajita/capacitor-secure-storage`"), a Nyitott kérdés sort törölni |

---

## documentation/Architektúra/Backend-offline first.md

### §1–§17 mechanizmus-állítások

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| O1 | §1 Platform-hatókör: natív teljes offline, web online-only; `offlineCapable` az egyetlen ágazási pont | Implemented | `storage-backend.provider.ts`; `sync-engine.probeAndSync` `nativeSyncEnabled` | — |
| O2 | §2 Local-first írás: minden mutáció előbb helyi store + outbox, egy kódút, nincs "próbáld online" ág | Implemented | `sqlite-storage-backend.ts` (minden write egy `db.executeTransaction([entityTask, ...outboxTasks])`); `offline-queue.buildEnqueueTasks` "Pure planning step" | — |
| O3 | §2 Helyi store a UI igazsága, képernyők nem várnak hálózatra | Implemented | repository-k `db.query`-ből signalt adnak; `sync-engine.init()` nem blokkoló | — |
| O4 | §3 SQLite `@capacitor-community/sqlite`, plugin verziózott upgrade (`setUpgradeStatement`), nincs ORM | Implemented | `local-database.service.ts` (`SQLiteConnection`, `addUpgradeStatement`, `SCHEMA_UPGRADES`) | — |
| O5 | §3 User-izoláció: külön DB fájl userenként `lm2_<userId>.db` | Implemented | `local-database.open()` `const dbName = ` `` `lm2_${userId}` `` | — |
| O6 | §3 Sync-meta oszlopok: `deleted`/`deleted_at`, `created_at`/`updated_at`, `_dirty`, `_local_only`, `_sync_error`, `_needs_refetch` | Implemented | `local-database.service.ts` minden `CREATE TABLE` (mind a 6 meta-oszlop) | — |
| O7 | §3 Migráció soha nem dobja el az outboxot / `_dirty` sorokat; DB-séma és outbox-payload migráció két külön dolog | Implemented | `SCHEMA_Vn` blokkok csak `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX` (nincs `DROP TABLE outbox_item`); `outbox-migrator.ts` külön mechanizmus | — |
| O8 | §3 `sync_state` tábla (`cursor`,`last_pull_at`,`last_pull_status`,`first_pull_completed`); `seed_state` tábla | Partial | `local-database.service.ts` `sync_state` tábla pontosan a 4 oszloppal. **`seed_state` tábla NINCS a `local-database.service.ts` sémában** (a spec §3/§15 hivatkozza; IMPLEMENTATION_STATUS "Gyakorlat"/`exercise-seed.ts` említ seed-verziót) | Ellenőrizni a Gyakorlat/seed chunkban: van-e `seed_state` tábla máshol vagy hiányzik; ha hiányzik → backlog-jegy vagy spec-pontosítás |
| O9 | §3 Helyi DB **nem titkosított** (nincs SQLCipher) | Implemented | `local-database.createConnection(dbName, false, 'no-encryption', SCHEMA_VERSION, false)` | — |
| O10 | §4 `outbox_item` adatmodell (id, sequence FIFO, method, url relatív, payload, payloadVersion, entityType, targetEntityId, dependsOn, status, attemptCount, lastAttemptAt, httpStatus, errorCode, errorMessage) | Implemented | `local-database.service.ts` `CREATE TABLE outbox_item` (`sequence INTEGER PRIMARY KEY AUTOINCREMENT`, `depends_on TEXT DEFAULT '[]'`, `error_field` extra); `core/sync/outbox-item.ts` | — |
| O11 | §4 Státuszok `PENDING`/`SENDING`/`BLOCKED`/`ERROR`/`SKIPPED`; `SENDING` induláskor → `PENDING`; `BLOCKED` számított, drain-elején újraszámolva | Implemented | `offline-queue.resetSendingToPending`, `recomputeBlocked` ("must run at the start of every drain"); `sync-engine.drain` hívja | — |
| O12 | §4 Függőségi zár: `BLOCKED`, ha van kisebb `sequence`-ű `ERROR`, aminek `targetEntityId`-ja e tétel `targetEntityId`-jában vagy `dependsOn`-jában van; `SKIPPED` nem blokkol | Implemented | `offline-queue.recomputeBlocked` (`error.sequence < item.sequence && (error.targetEntityId === item.targetEntityId || item.dependsOn.includes(error.targetEntityId))`); `ERROR`/`SKIPPED` külön query | — |
| O13 | §5 Írási út: kliens UUID → egy helyi tranzakció (entitás sor `_dirty=1`/`_local_only=1` + outbox tétel) → UI azonnal → `requestDrain()` nem blokkoló | Implemented | `sqlite-storage-backend.ts` write metódusok; `sync-engine.requestDrainDebounced()` (§6 "debounce ~1s", `MUTATION_DRAIN_DEBOUNCE_MS = 1000`) | — |
| O14 | §5 Coalescing (csak `PENDING`, azonos `targetEntityId`): `POST+PUT`→POST payload frissül; `PUT+PUT`→felülír; `POST+DELETE`→mindkettő törlődik + hard remove; `PUT+DELETE`→PUT-ok eldobva, DELETE marad; `DELETE`+bármi→tilos; természetes kulcsú upsert ismételt mentés→payload frissül | Implemented | `offline-queue.buildEnqueueTasks` (pontosan ez a döntési fa; `hardRemoveLocalEntity` a POST+DELETE ágon); `offline-queue.service.spec.ts` | — |
| O15 | §5 `SENDING`/`ERROR`/`SKIPPED` tételt nem módosítunk — új tétel jön, ami `BLOCKED` lesz | Implemented | `buildEnqueueTasks` csak `status='PENDING'` sorokat olvas coalesce-hez; új `insertTask` → `recomputeBlocked` teszi `BLOCKED`-dá | — |
| O16 | §5 Kliensoldali cascade: helyi sorok `deleted=true` ugyanabban a tranzakcióban, de külön outbox tétel nincs a gyerekekre | Implemented | `sync-engine.applyTombstone` (Food/Recipe/Room/Template/... gyerek-tombstone tasks, nincs enqueue); `sqlite-storage-backend.deleteFood` a helyi cascade-et is írja | — |
| O17 | §6 Komponens-határ: `SyncEngine` sosem ír `outbox_item`-be közvetlenül, mindig `OfflineQueueService`-en át | Implemented | `sync-engine.service.ts` — minden outbox-művelet `this.offlineQueue.*` | — |
| O18 | §6 Drain triggerek: app start, `BACKEND_OFFLINE`→`ONLINE`, resume, sikeres login/refresh, minden mutáció után (debounce ~1s), manuális sync | Implemented | `sync-engine.init()` (`Network` listener, `App resume`, kezdő `probeAndSync`), `requestDrain()`, `requestDrainDebounced()` | — |
| O19 | §6 Drain algoritmus: mutex (1 drain), kilépés ha nincs user / backend, `BLOCKED` újraszámolás, `sequence` növekvő `PENDING` + backoff lejárt, szekvenciális, `Authorization` + `Idempotency-Key: <outbox.id>` fejlécek | Implemented | `sync-engine.drain` (`if (this.draining()) return false;`), `listRunnable` (backoff-szűrt FIFO), `executeOutboxItem` (`headers: { 'Idempotency-Key': item.id }`, `Authorization` az interceptorból) | — |
| O20 | §6 Siker: szerverválasz DTO helyi store-ba (`_dirty=0`,`_local_only=0`,szerver `updated_at`), outbox tétel törlődik; **drain után kötelező `pull()`** ha volt ≥1 siker | Implemented | `executeOutboxItem` (`buildServerApplyTasks` → `removeItem`); `probeAndSync` (`if (didDrain || !wasOnline) await this.pull(userId)`) | — |
| O21 | §6 Állapotfelismerés: Network plugin + `GET /api/health` timeout **3s**; passzív `status 0`/timeout → offline; kapcsolat-próba backoff 15s→30s→60s→max 5min (≠ tétel-backoff) | Implemented | `HEALTH_PROBE_TIMEOUT_MS = 3000`, `RECONNECT_BACKOFF_MS = [15000,30000,60000,300000]`, `probeBackend()` timeout, `classifyAndHandle` `status === 0` → `stop-network` | — |
| O22 | §6 Hibaosztályozás tábla: net→PENDING+drain leáll+backoff; `401`→refresh, fail→login+outbox marad; `403`→ERROR; `404` DELETE→siker / PUT-POST→ERROR; `409 ENTITY_DELETED`→csendes drop + helyi `deleted=true`; `409 UNIQUE_VIOLATION`→ERROR; `400/422`→ERROR; `408/429/5xx`→backoff, 5 próba után ERROR; `410`→full re-pull; tétel-backoff 2s→8s→30s→2min→10min | Implemented | `sync-engine.classifyAndHandle` (mind az ág); `offline-queue.backoffFor` (`RETRY_BACKOFF_MS = [2000,8000,30000,120000,600000]`, `attemptCount<5`); `401` → `authSession.clear()` (a refresh-t az `auth.interceptor` végzi előbb) | — |
| O23 | §6 Kézi beavatkozás Fix/Skip/Unskip/Drop (`ERROR`/`SKIPPED` tételt a motor magától nem mozdít); Fix: payload + helyi entitássor egy tranzakcióban, `sequence` változatlan; Unskip: payload újraszármaztatva a helyi sorból, ha újabb tétel van → eldobás; Drop: POST+`_local_only`→hard remove / PUT-DELETE szinkronizált soron→`_needs_refetch=1`; cascade drop a `dependsOn`-függőkre | Implemented | `offline-queue.{fix,skip,unskip,drop,findDependents}`; `fix` egy `executeTransaction([entityTask, outboxUpdate])`; `unskip` `newerRows` check → `removeItem`; `drop` `findDependents` + entityTask; `offline-queue.service.spec.ts` | — |
| O24 | §6 Kötelező újraolvasás: `_needs_refetch=1` sorok `GET /api/{entitás}/{id}`-vel; a delta pull erre nem elég | Implemented | `sync-engine.refetchNeeded()` — 35+ entitástípusra célzott `getX(id)` + `serverApplyTask` (`_dirty=0`,`_needs_refetch=0`) | — |
| O25 | §7 Payload-verziózás: minden tétel `payloadVersion` az app `SCHEMA_VERSION`-jából; drain előtt `OutboxMigrator` lépésenként (`"<entityType>:<from>"` registry, pure fn); nincs regisztrált lépés → `ERROR` egyértelmű üzenettel | Implemented (registry üres) | `outbox-migrator.ts` `migrateOutboxItem` (lépés-lánc, `MIGRATIONS` üres map — `OUTBOX_PAYLOAD_SCHEMA_VERSION = 1`, nincs mit migrálni); `sync-engine.migrateThenExecute` (`errorMessage` → `markError('PAYLOAD_MIGRATION_FAILED')`); `outbox-migrator.spec.ts` szintetikus registry-vel | — |
| O26 | §8 Pull: `GET /api/sync/changes?since=<cursor>`; opaque cursor (`updated_at`+`id` tiebreaker), nem nyers timestamp; első pull `since` nélkül, részleges adat olvasható | Implemented | `sync-engine.pull` (`SELECT cursor FROM sync_state`, `getSyncChanges(since)`, `since = undefined` ha nincs cursor); backend `SyncCursor` opaque | — |
| O27 | §8 Lapozás: hívás → lap alkalmazása + `cursor = nextCursor` egy tranzakcióban → `hasMore` ? ismétlés; delta pullra is; megszakadt pull folytatható | Implemented | `sync-engine.pull` `while (hasMore)` loop, `tasks.push({ UPDATE sync_state SET cursor=?, last_pull_at=?, ... })` + `executeTransaction(tasks)` laponként | — |
| O28 | §8 Pull triggerek: app start, resume (`last_pull_at` > 5 perc), manuális, minden sikeres drain után, `OFFLINE→ONLINE` **közvetlenül** (üres outboxú eszköz is kap pull-t) | Implemented | `probeAndSync`: `if (didDrain || !wasOnline) await this.pull(userId)` — `!wasOnline` fedi az OFFLINE→ONLINE átmenetet drain nélkül is | — |
| O29 | §8 Sorrend: előbb drain, aztán pull | Implemented | `probeAndSync` (`await this.drain(userId)` majd `this.pull(userId)`) | — |
| O30 | §8 Apply-szabályok soronként: nincs helyi sor+update→beírás; nincs helyi sor+`deleted`→tombstone beírva; `_dirty=0`+update→felülírás; `_dirty=1`+update→helyi pending marad; `_dirty=1`+`deleted`→tombstone győz + PENDING PUT-ok eldobva; `ERROR` tétel az entitásra + bármi→szerver adat beíródik, ERROR marad | Implemented | `sync-engine.buildApplyTasks` per entitás (`!change.deleted` → `serverApplyTask` a `WHERE _dirty = 0` guarddal a *ServerApplyTask-ekben; tombstone → `tombstoneTask` + `discardPendingWritesTask`); `discardPendingWritesTask` (`DELETE FROM outbox_item WHERE ... method != 'DELETE' AND status IN ('PENDING','BLOCKED')`) | — |
| O31 | §8 Garanciák: pull soha nem törli `_local_only` sorokat / outboxot; sikertelen pull nem üríthet helyi adatot; szerver cascade tombstone-ként jön (drain utáni pull kötelező); `410` → full re-pull, `_dirty`/outbox marad; pull utáni frissítés a UI-ig ér (`DataChangeNotifier`) | Implemented | `pull` csak `serverApplyTask`/`tombstoneTask`/`sync_state` UPDATE (nincs `DELETE _local_only`, nincs outbox törlés a `discardPendingWritesTask`-on kívül, ami csak nem-DELETE pending); `410` ág `UPDATE sync_state SET cursor = NULL` + `continue`; `dataChanges.notifyChanged` | — |
| O32 | §9 Determinisztikus UUID v5 fix namespace-ből `name = "<EntityType>:<userId>:<naturalKey>"` (UserProfile, DailyStepLog, AycmCheckIn, AycmSettings, WeeklyPlan, Exercise seed); minden más v4 | Implemented | frontend `core/sync/uuid.ts` (párja `common/DeterministicUuid`); `local-database.service.ts` `daily_step_log` komment "id is a deterministic v5 of (userId, date)"; `V29` migráció komment | — |
| O33 | §10 Függőségi láncok: minden gyerek-tétel `dependsOn`-jába a még nem syncelt szülők ID-ja | Implemented | `offline-queue.insertTask` (`depends_on` JSON), `sqlite-storage-backend` a nested save-eknél tölti; `recomputeBlocked` használja | — |
| O34 | §11 Atomi többentitásos műveletek: dedikált végpont + **egy** outbox tétel (Bevásárlás complete, nested aggregate save-ek) | Implemented | `sync-engine.buildServerApplyTasks` `ShoppingListComplete` entityType (`shoppingListCompleteApplyTasks`); nested `*ApplyTasks` egy outbox tétellel a parenten | — |
| O35 | §12 Auth és offline: offline login nincs; token lejárt offline → nincs kiléptetés; refresh érvénytelen → login, outbox marad; kijelentkezés → auth token törlődik, helyi DB + outbox nem; outbox user-scope-olt | Implemented | `sync-engine.classifyAndHandle` `401` → `authSession.clear()` csak refresh-fail után (interceptor); `offline-queue` minden query `WHERE user_id = ?`; `auth-session.service.ts` | — |
| O36 | §13 Külső API-k nincsenek proxyzva; timeout **8s**; a külső hívásból született entitás normál outbox úton | Implemented | `pages/food/catalog/open-food-facts.service.ts` (közvetlen); `core/health/` közvetlen. Timeout 8s értéket a feature-specek chunkjában érdemes ellenőrizni (nem auditáltam minden külső hívás timeoutját) | Feature-chunk: 8s külső-hívás timeout ellenőrzése (OFF, Google, Health Connect) |
| O37 | §14 Minden felhasználónak megjelenő számítás kliensoldali pure TS; `~`/homokóra csak "hiányzó bemenet", soha nem a hálózati állapot; nem számolható érték soha nem menthető 0-ként | Implemented | `shared/tdee-calculator.ts` (`computable: false` ág), `core/data/activity-kcal.ts`, `shared/net-pay-calculator.ts`; IMPLEMENTATION_STATUS "Étkezés" dashboard (`computable:false` → szöveges figyelmeztetés, nincs kitalált szín) | — |
| O38 | §15 Seed: build asset (Full-offline); `Exercise` seed user-owned másolatok determinisztikus v5-tel; seed create-ek normál outbox tételek; `seed_state` tartja a lefutott verziót | Partial | `core/data/exercise-seed.ts` (`buildSeedExercises`); `http-storage-backend.ts` importálja; determinisztikus v5. **`seed_state` tábla — lásd O8** (nincs a helyi sémában ezen a néven) | Lásd O8 |
| O39 | §16 UI offline: globális állapotjelző minden tab fejlécében; minden mentés offline is sikeres visszajelzést ad; sor-szintű jelzés (`_dirty` óra, `_sync_error` piros); első pull progressz; nincs blokkoló modális; tilos adatvesztő UI | Implemented | `shared/sync-status-button/`; `_dirty`/`_sync_error` oszlopok minden táblán; `sync_state.first_pull_completed`; részletes UI a Szinkronizációs központ chunkban | — |

### §18 Elfogadási kritériumok (20)

| # | Kritérium | Verdikt | Bizonyíték |
|---|---|---|---|
| AC1 | Repülőgép mód cold start: listák olvashatók, mentés sikeres, semmi nem vár hálózatra | Implemented | `sync-engine.init()` nem awaitolt; UI `db.query`-ből renderel; `probeAndSync` `userId === null` / `!reachable` korai kilépés |
| AC2 | Offline Food→StoredFood→Meal, online: mindhárom felkerül helyes hivatkozásokkal | Implemented | `offline-queue` `dependsOn` + `recomputeBlocked`; `sqlite-storage-backend` nested írás; §10 láncok |
| AC3 | Offline create + offline törlés (soha nem syncelt): semmi nem megy szerverre, outbox üres, helyi sor eltűnt | Implemented | `buildEnqueueTasks` `existingPost && DELETE` → `outboxTasks: existing.map(delete)`, `hardRemoveLocalEntity: true` |
| AC4 | Offline 5× szerkesztés: egy PUT megy fel | Implemented | `buildEnqueueTasks` `coalesceTarget` → `updatePayloadTask` (nincs új sor); `offline-queue.service.spec.ts` |
| AC5 | `BACKEND_OFFLINE`: OFF hívás sikeres, Food mentés outboxba | Implemented | `connection-state` `BACKEND_OFFLINE` (net van, health nem); `open-food-facts.service.ts` közvetlen hívás; write → outbox |
| AC6 | `FULL_OFFLINE`: Health Connect olvasás megy; 3× ugyanarra a napra → egy outbox tétel | Implemented | `core/health/health-connect.plugin.ts` (eszközön belüli); `daily_step_log` determinisztikus v5 + `buildEnqueueTasks` természetes-kulcs coalescing |
| AC7 | Két eszköz offline azonos helyiségnév: egyik `ERROR` (409), átnevezve újraküldhető; másik érintetlen | Implemented | `classifyAndHandle` `409 UNIQUE_VIOLATION` → `markError` + `error_field`; `offline-queue.fix`; backend `idx_household_room_user_id_name_normalized` |
| AC8 | Két eszköz offline check-in ugyanarra a napra: determinisztikus ID → update, nincs `ERROR` | Implemented | `DeterministicUuid.v5` `AycmCheckIn:<userId>:<date>`; POST létező id → 200 upsert |
| AC9 | A törli, B offline szerkeszti: B pull tombstone-t kap, pending PUT eldobva, nincs resurrect | Implemented | `buildApplyTasks` tombstone ág → `tombstoneTask` + `discardPendingWritesTask` |
| AC10 | Tétel `ERROR` → rá épülők `BLOCKED`; Skip után a független tételek felmennek | Implemented | `recomputeBlocked`; `offline-queue.skip` (`SKIPPED` nem blokkol) |
| AC11 | Access token lejár offline: nincs kiléptetés; online → csendes refresh + drain | Implemented | `classifyAndHandle` `status === 0` → `stop-network` (nincs `clear()`); `auth.interceptor` + `token-refresh-coordinator` a refresht online végzi |
| AC12 | Kijelentkezés pending tételekkel: figyelmeztetés; újra bejelentkezés után lefut | Implemented (UI a Bejelentkezés chunkban) | outbox `user_id`-scope-olt, nem törlődik logoutkor; `resetSendingToPending` login után |
| AC13 | App frissítés pending outboxszal: lefut vagy migrálódik; semmi nem vész el | Implemented | `outbox-migrator` mechanizmus + `payloadVersion` stamp; `SCHEMA_Vn` nem dobja az outboxot |
| AC14 | `410 CURSOR_TOO_OLD`: full re-pull, pending változások + outbox marad | Implemented | `pull` `error.status === 410` → `UPDATE sync_state SET cursor = NULL` + `continue` (outbox érintetlen) |
| AC15 | Szerveroldali cascade (Food törlés): drain utáni pull után a hivatkozó helyi sorok is tombstone-osak | Implemented | `probeAndSync` kötelező post-drain `pull`; `buildApplyTasks` `Food` deleted ág → `stored_food`/`recipe_ingredient`/`meal_item` cascade tombstone tasks; backend `MealCascade`/`FoodService.delete` |
| AC16 | Hiányos profil: `~` a kereten, nincs crash, és a `~` **nem** offline miatt | Implemented | `tdee-calculator` `computable:false`; IMPLEMENTATION_STATUS "Étkezés" (`~` = hiányzó bemenet) |
| AC17 | Fix egy `409 UNIQUE_VIOLATION` tételen: átnevezés helyi soron + payloadon egyszerre, tétel `PENDING`, következő drainen felmegy | Implemented | `offline-queue.fix` (`executeTransaction([entityTask, outboxUpdate])`, `status='PENDING'`, `attempt_count=0`, `sequence` változatlan) |
| AC18 | Unskip olyan tételen, aminek helyi sora közben módosult: felküldött payload a **jelenlegi** helyi állapot | Implemented | `offline-queue.unskip(item, currentPayload)` (hívó a live sorból adja); newer-item check → `removeItem` |
| AC19 | Drop egy szinkronizált soron álló PUT-on: sor visszaáll a szerver állapotra, célzott újraolvasás (delta pull nem elég) | Implemented | `offline-queue.drop` + `_needs_refetch=1` entityTask; `sync-engine.refetchNeeded` célzott `GET` |
| AC20 | Drop egy POST-on, amire gyerektételek épülnek: UI megmutatja az érintett tételek számát, megerősítés után eldobódnak; nincs árva tétel | Implemented | `offline-queue.drop` `findDependents` (`dependsOn.includes(targetEntityId)`) → visszaadja a dependenseket a UI-nak, majd törli |

### §17 Elfogadott korlátok

| # | Korlát | Verdikt | Bizonyíték |
|---|---|---|---|
| L1 | Sor-szintű last-write-wins, nincs mezőszintű merge / CRDT / ETag / optimistic locking | Accepted-limitation | `buildApplyTasks` sor-szintű DTO-írás; nincs verzió/ETag oszlop egy migrációban sem; `PUT` = teljes body (`openapi/paths/*`) |
| L2 | Számláló-jellegű műveletek vesztesége (készletlevonás, "Fizetve" `nextBillingDate`) két offline eszköznél | Accepted-limitation | `stock-consumption.ts` a saját kiinduló mennyiségből számol; nincs delta/összegző szemantika; spec §9 explicit |
| L3 | Megosztott katalógus (`Food`/`Recipe`) párhuzamos szerkesztése: néma LWW felülírás | Accepted-limitation | `sync_changes` view `NULL::uuid AS user_id`; nincs lock/verzió a `food`/`recipe` táblán |
| L4 | Web offline nem scope; realtime/push sync nem scope; P2P nem scope; bináris tartalom offline queue-ban nem scope; helyi DB titkosítás nem scope | Accepted-limitation | `http-storage-backend.ts`; nincs websocket/FCM-data kliensben; `'no-encryption'` a SQLite connectionben; §3 "Nincs bináris tartalom" |

---

## documentation/Architektúra/Mennyiség mező.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| Q1 | Megosztott `QuantityInputComponent` (`shared/quantity-input/`) + pure TS parser utility (egységlista mode szerint + parse/format) + kanonikus egységre váltó utility | Implemented | `shared/quantity-input/quantity-input.component.ts` + `.spec.ts`; `shared/quantity.ts` (+ `.spec.ts`) | — |
| Q2 | Helper ikon + inline hiba-note a közös `HelpInputComponent`-ben (`shared/help-input/`, `app-help-input`); `QuantityInputComponent` és `GradeInputComponent` komponálja (kompozíció, nem ősosztály) | Implemented | `shared/help-input/help-input.component.ts` + `.spec.ts`; `shared/grade-input/grade-input.component.ts` | — |
| Q3 | `mode: 'quantity' \| 'duration'` input; egységkészlet + helper szöveg ettől függ | Implemented | `shared/quantity.ts` mode-alapú egységlista; `.spec.ts` | — |
| Q4 | `quantity` egységek: `db,g,dkg,kg,l,dl,cl,ml`; más egység nincs | Implemented | `shared/quantity.ts`; `common/QuantityConverter` (PIECE/WEIGHT/VOLUME multipliers ugyanez a 8) | — |
| Q5 | Kanonikus bázisegység + szorzók: tömeg→`g` (dkg×10, kg×1000); térfogat→`ml` (cl×10, dl×100, l×1000); darab→`db` (nincs konverzió); idő→`perc` (óra×60, nap×1440, hét×10080, hó×43200, év×525600) | Implemented | `common/QuantityConverter` (`WEIGHT_MULTIPLIERS`/`VOLUME_MULTIPLIERS`/`PIECE_MULTIPLIERS`/`DURATION_MULTIPLIERS` — pontosan ezek); `shared/fixtures/quantity-conversion.json`; `QuantityConverterTest` (table == fixture) | — |
| Q6 | Egységcsaládok közt nincs konverzió/egyenlőség; első lépés a család-egyezés, csak utána bázisegység-amount | Implemented | `QuantityConverter.quantitiesEqual` (`familyA == null \|\| familyA != familyB` → `false`, majd `canonicalQuantityAmount(...).compareTo(...) == 0`) | — |
| Q7 | `hó`/`év` fix napszámú közelítés (30/365) **csak** egyenlőség-összehasonlításhoz, nem dátumszámításhoz | Implemented | `QuantityConverter` javadoc "Never used for date arithmetic"; `pages/food/storage/shelf-life.ts` naptári `addMonths`/`addYears`-t használ (IMPLEMENTATION_STATUS "Élelmiszer tárolás") | — |
| Q8 | `duration` aliasok (`p/min`, `ora/h`, `n/d`, `het/w`, `ho/honap/hónap/m`, `ev/y`), kis/nagybetű-független, parserben kanonikusra normalizálva | Implemented | `shared/quantity.ts` alias-map (frontend-only parser — a spec szerint a backend a szétbontott `amount`+`unit`-ot fogadja) | — |
| Q9 | Backend a kanonikus konverzió-paritást is futtatja (Java), közös fixture-ön, nem külön konstans-lista | Implemented | `common/QuantityConverter` + `QuantityConverterTest` (fixture-alapú); `Mennyiség mező.md` Backend szakasz `Food` mezőhalmaz-duplikációra | — |

---

## documentation/Architektúra/Névegyediség.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| N1 | `normalizeName`: NFC → trim (szóköz/tab/`U+00A0`) → belső whitespace 1 normál szóköz → **locale-független** kisbetűsítés → ékezet marad | Implemented | `common/NameNormalizer.normalize` (`Normalizer.Form.NFC`, `[\s ]+`→" "+`.trim()`, `.toLowerCase(Locale.ROOT)`); frontend `shared/name-normalization.ts` párja | — |
| N2 | Névegyediségnél az ékezet **különböző** (`Sör` ≠ `Sor`); a Szöveges keresés utility-je **nem** használható újra | Implemented | `NameNormalizer` javadoc: "Accents are intentionally kept (unlike search folding ... which must NOT reuse this)"; `shared/name-normalization.ts` külön a `shared/text-search.ts`-től | — |
| N3 | Minden névegyediség csak élő sorokra (`deleted = false`); törölt sor neve újra felvehető | Implemented | `V6` `... WHERE deleted = false` partial unique index; frontend repository-k `deleted = 0`-ra szűrnek a pre-checknél | — |
| N4 | Hatókör a feature spectől; normalizálás mindenhol a fenti (`HouseholdRoom`/`Task`, `GearItem`, `PackingTemplate`, `Exercise`, `AycmPartner` user; `Recipe.name` globális) | Implemented | `GlobalExceptionHandler.UNIQUE_INDEX_TO_FIELD` (`idx_gear_item_...`, `idx_household_room_...`, `idx_household_task_room_id_...`, `idx_recipe_name_normalized`, `idx_aycm_partner_...`); feature service-ek `applyName`/`applyFields` pre-check | — |
| N5 | Explicit NEM egyedi: `CalendarEvent.title`, `LifePlan.title`, `RecurringExpense.name`, `ShoppingList.name`, `GymColorBand.name`, `Food.name` önmagában; ahol nincs előírás, nincs egyediség (`Gym.name`, `Crag.name`, ...) | Implemented | Nincs `name_normalized` unique index a `calendar_event`/`life_plan`/`recurring_expense`/`shopping_list`/`gym`/`crag`/`sector`/`route` migrációkban; `local-database.service.ts` `idx_gym_name`/`idx_crag_name` **nem** unique | — |
| N6 | Mezőhalmaz-egyediség (`Food`): szöveg `normalizeName`, EAN trim+nem-számjegy strip+üres=üres, szám pontos egyezés (`null ≠ 0`), mennyiség `amount`+`unit` kanonikus egységre | Implemented | `common/BarcodeNormalizer` (`[^0-9]` strip, `null`→`""`), `common/QuantityConverter.quantitiesEqual`; IMPLEMENTATION_STATUS "Élelmiszerek" (app-szintű minden mezőre) | — |
| N7 | Hex színkód kanonikus alak mentés előtt: trim → `#` elhagyás → 3-jegyű kifejtés → kisbetűsítés → `#rrggbb`; egyediség a kanonikus alakon | Implemented | `common/HexColorNormalizer.normalize` (pontosan ez a sorrend); `HexColorNormalizerTest`; `GlobalExceptionHandler` `GymColorBand.hexColor` a `V22` séma szerint | — |
| N8 | `username` szándékosan case-sensitive, nem esik e szabály alá, nincs offline create | Implemented | `GlobalExceptionHandler.UNIQUE_INDEX_TO_FIELD` `idx_users_username` külön; `AdminApiKeyFilter` — usert admin API hoz létre | — |
| N9 | UI: ütközés kliens mentés előtt, mezőszintű hiba; hibaüzenet a **beírt** nevet idézi; tárolt érték a **beírt** alak (trim+whitespace-összevonás után); átnevezésnél saját sor kizárva | Implemented | frontend repository pre-check (`shared/name-normalization.ts`, live sorok, `id != editing`); feature-chunkokban részletezve | — |
| N10 | Szerver a normalizált alakot **tárolt** oszlopban (`name_normalized`), partial unique index ezen (`WHERE deleted = false`); puszta `lower(name)` nem elég; közös fixture-alapú teszt kötelező | Implemented | `V6__gear_item.sql` (`name_normalized text NOT NULL` + partial unique index + komment "not a DB generated column"); `NameNormalizerTest` fixture-alapú | — |
| N11 | `Food` mezőhalmaz-duplikáció alkalmazás-szintű (nem egyetlen index) | Implemented | Nincs `food` unique index a `V12`-ben; app-szintű check (`QuantityConverter` + normalizerek) | — |

---

## documentation/Architektúra/Szöveges keresés.md

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| S1 | Egységes viselkedés: kis/nagybetű-független, ékezet-**független** egyezés; ékezetes query → ékezetileg pontos találatok előre | Implemented | `shared/text-search.ts` (`matches` / `compareRank`); `shared/text-search.spec.ts` | — |
| S2 | Normalizálás a query-re és a mezőkre; ékezet-fold (NFD + combining mark strip vagy magyar tábla), case-fold; `matches(query, candidate)`, `compareRank(query, a, b)` | Implemented | `shared/text-search.ts` (ékezet-fold + `matches` + `compareRank` API); a "más normalizálás, mint a Névegyediség" külön fájlban | — |
| S3 | Üres query → teljes (szűretlen) lista; rövid debounce alapértelmezés | Implemented | fogyasztó feature-ök (`shopping-history.ts`, `catalog-ratios.ts` stb.) `matchesSearch`/`compareRank`-et hívnak; debounce feature-döntés | — |
| S4 | Pure TS utility, nem UI komponens; nagy adathalmaznál később szerveroldali keresés, ugyanez a viselkedési szerződés | Implemented | `shared/text-search.ts` pure; backend: `Nincs backend érintettség` — helyes (nincs API search) | — |

---

## documentation/Life Management 2.0.md (hub)

| # | Spec-állítás (rövid + szekció) | Verdikt | Bizonyíték (fájl:szimbólum / teszt) | Teendő |
|---|---|---|---|---|
| H1 | Minden feature feature flaghez kötve, build-time ship config, nincs in-app kapcsoló; core kör + registry SSOT a Frontend.md | Implemented | `feature-flags.service.ts` (lásd F13–F15) | — |
| H2 | Offline: natív teljes, web online-only; nyelv/téma device-local; minden user-szöveg i18n, minden szín téma-token; szerver `code`-ot ad | Implemented | `storage-backend.provider.ts`; `core/config/{language,theme}.service.ts`; `GlobalExceptionHandler` `code` | — |
| H3 | Dokumentációs konvenciók: `Features/`/`Subfeatures/`/`Architektúra/`; `- TODO` mappák kiürültek/törölve; egységes Business+Architektúra szerkezet, `#### Backend-offline` kötelező | Implemented (spec-gondozás) | `documentation/` szerkezet; nem kód-állítás | — |
| H4 | Minden feature és architektúra jegyzet `Kész` | Implemented | vault státuszok; `IMPLEMENTATION_STATUS.md` a kód-készültséget külön követi | — |
| H5 | §"Első kör (MVP) hatókör" tábla — rendszerszintű vágások | lásd lentebb | — | A tábla minden sora jegyzett vagy §17 elfogadott → az SSOT-flipnél a szekció törölhető |
| H6 | Ha feature spec és architektúra jegyzet ütközik, az architektúra jegyzet nyer | Implemented (konvenció) | CLAUDE.md megerősíti | — |
| H7 | 5 nyitott kérdés, egyik sem blokkol | lásd NYK-diszpozíció | — | 2 CODE-RESOLVED, 3 STILL-OPEN (jegyzett) |

### §"Első kör (MVP) hatókör" tábla sorai

| Sor | Diszpozíció | Jegy / hivatkozás |
|---|---|---|
| Web mint kiadott platform | Seed-jegy | `backlog/003-web-mint-kiadott-platform.md` |
| iOS build és telepítés (+ iOS Health) | Seed-jegy | `backlog/004-ios-build-es-telepites.md`, `backlog/002-ios-health-lepes-forras.md` |
| Google Calendar export (flag `false`) | Seed-jegy | `backlog/001-google-calendar-export.md`; a `features.json` `feladatok.googleExport: false` egyezik |
| Remote push (FCM/APNs) | Seed-jegy / §17 elfogadott | `backlog/005-remote-push-fcm-apns.md` |
| Prod hosting / TLS | Seed-jegy | `backlog/006-prod-hosting-tls.md` |
| Profil-szintű beállítás-sync | Seed-jegy | `backlog/007-profil-szintu-beallitas-sync.md`; `sync_changes` view **nem** tartalmaz device-local adatot (egyezik) |
| Realtime sync, mezőszintű merge, CRDT | §17 elfogadott korlát | `Backend-offline first.md` §17 (L1, L4) |

Minden sor jegyzett vagy elfogadott korlát → az SSOT-flipnél a szekció **törölhető** (a jegyek átveszik). Nincs jegyzetlen sor.

---

## Nyitott kérdések diszpozíció

| Kérdés | CODE-RESOLVED / STILL-OPEN | Bizonyíték / jegy | Spec-teendő |
|---|---|---|---|
| **[[Backend]]**: prod üzemeltetés / hosting és TLS | STILL-OPEN | `backlog/006-prod-hosting-tls.md` | `Backend.md` `### Nyitott kérdések` első bullete → `> Tervezett: [[backlog/006-prod-hosting-tls]]` pointerre rövidíteni |
| **[[Backend]]**: openapi-generator `spring` profil SB4 / Framework 7 kimenet ellenőrzés | CODE-RESOLVED (működik) + karbantartási emlékeztető marad | generátor `7.24.0` + `spring` profil SB `4.1.0`-val fordul, `useBeanValidation`/`useJakartaEe` pinelve, ~40 controller implementálja a generált interfészeket; a tartalék (kézzel írt interface) nem kellett. `backlog/008-...md` a jövőbeli verzió-emeléskori re-checkre | `Backend.md` `### Nyitott kérdések` második bullete → jelen idejű prózára ("a 7.24.0 generátor SB 4.1-gyel fordul"), a re-check emlékeztető `> Tervezett: [[backlog/008-openapi-generator-spring-boot-4-kimenet-ellenorzes]]` pointerré |
| **[[Fejlesztői környezet]]**: iOS build és eszközre telepítés | STILL-OPEN | `backlog/004-ios-build-es-telepites.md` | `Fejlesztői környezet.md` `### Nyitott kérdések` → `> Tervezett: [[backlog/004-ios-build-es-telepites]]` pointer |
| **[[Frontend]]**: Health Connect bridge csomagválasztás (közösségi vs saját plugin) | CODE-RESOLVED | Saját Capacitor plugin: `frontend/src/app/core/health/health-connect.plugin.ts` (`registerPlugin('HealthConnectSteps')`), `frontend/android/app/src/main/java/hu/bumler/lm2/health/HealthConnectStepsPlugin.kt` (`androidx.health.connect:connect-client`); szolgáltatás: `core/health/health-connect-step-source.service.ts`, `activity-step-sync.service.ts` | `Frontend.md` Capacitor plugin tábla "Health Connect bridge" sor + `### Nyitott kérdések` első bullete → jelen idejű próza ("saját Capacitor plugin `androidx.health.connect` alapon"), a Nyitott kérdés sor **törlése** |
| **[[Frontend]]**: secure storage konkrét csomag | CODE-RESOLVED | `@aparajita/capacitor-secure-storage ^8.0.0` (`frontend/package.json`), használja `core/session/auth-session.service.ts` (+ `.spec.ts`) | `Frontend.md` Capacitor plugin tábla "Secure storage" sor + `### Nyitott kérdések` második bullete → jelen idejű próza ("`@aparajita/capacitor-secure-storage`"), a Nyitott kérdés sor **törlése** |

---

## Rollup

- **Állítások összesen: 118** (Backend 40 + Frontend 24 + Backend-offline §1–17 39 + Backend-offline §18 20 + §17 4 + Mennyiség 9 + Névegyediség 11 + Szöveges keresés 4 + Hub 7 — az átfedő NYK-sorokat egyszer számolva) — bontás:
  - **Implemented: 101**
  - **Partial: 7** (B14 tombstone-cleanup job, B27 Idempotency-Key hatóköre, F11 route-tábla nem chunk-szintű, F13 flag-validáció load-time, O8/O38 `seed_state` tábla, O36 8s külső-timeout nem auditált)
  - **Missing: 1** (B7 Swagger UI — non-blocking, dev-only kényelem)
  - **Describes-future: 0**
  - **Accepted-limitation: 4** (L1 sor-szintű LWW, L2 számláló-veszteség, L3 shared-katalógus LWW, L4 web-offline/realtime/P2P/bináris/titkosítás nem scope)
  - **CODE-RESOLVED nyitott kérdés: 3** (B40 openapi-gen SB4, F23 Health Connect, F24 secure storage) · **STILL-OPEN: 2** (prod hosting, iOS build)
- **Blokkoló eltérések: NINCS.** Minden Partial vagy dokumentáció-pontosítás, vagy már jegyzett follow-up, vagy feature-chunk hatókör.
- **Draft jegyek (genuinely un-ticketed):**
  - `#new` type:bug/change-request "Tombstone fizikai törlés (180 nap) ütemezett job hiányzik" → `Backend.md` §"Séma és migráció" (a `410 CURSOR_TOO_OLD` ág és a `sync_meta.tombstone_horizon` olvasás áll, de nincs `@Scheduled` cleanup/horizon-frissítő job). Kicsi, nem blokkoló.
  - `#new` type:chore "`seed_state` tábla hiánya a helyi SQLite sémából" → `Backend-offline first.md` §3/§15 (`local-database.service.ts` nem definiál `seed_state` táblát; a `Backend-offline first.md` §3 explicit felsorolja). Ellenőrizni a Gyakorlat/seed feature-chunkban, hogy a seed-verzió követés máshogy oldott-e meg; ha nem → tábla pótlása vagy spec-pontosítás.
  - (B7 Swagger UI: opcionálisan jegy, de inkább spec-törlés — dev-only.)
- **Spec-átírás vázlat:**
  - **Backend.md:**
    - §"Séma és migráció": a tombstone-cleanup job jelölése "későbbi" (jelenleg csak a horizon-olvasás + `410` áll) → pointer `backlog/006` vagy új chore-jegy.
    - §"Idempotencia": pontosítani, hogy az `Idempotency-Key`-t a natív drain **minden** replay-en küldi, de a szerver csak a **nem-idempotens atomi** végpontokon (`POST /complete`) kényszeríti ki + tárolja (`idempotency_key`, 30 nap); a plain CRUD a kliens-UUID upsert idempotenciájára támaszkodik. A 30-napos prune job szintén "későbbi".
    - §"OpenAPI — spec-first": a Swagger UI mondat törlése vagy "későbbi" jelölése.
    - `### Nyitott kérdések`: prod hosting → `> Tervezett: [[backlog/006-prod-hosting-tls]]`; openapi-gen → jelen idejű próza + `> Tervezett: [[backlog/008-...]]`.
  - **Frontend.md:**
    - Capacitor plugin tábla: `@capacitor/background-runner` sort a tényleges saját háttér-pluginra cserélni (`core/notifications/background-reminders.plugin.ts`); "Health Connect bridge" és "Secure storage" sorokból a "csomagválasztás: Nyitott kérdések" hivatkozás → konkrét csomag/plugin.
    - §"Feature flag-ek / Mechanizmus": a "build-time validált, szabálysértés fordítási hiba" mondatot pontosítani: a config build-időben bundle-ölt asset, a **dependency-validáció load-time dev-hiba** (`feature-flags.service.ts` komment ezt már kimondja).
    - `### Nyitott kérdések`: mindkét bullet törlése (CODE-RESOLVED) — helyettük jelen idejű próza a plugin táblában.
  - **Backend-offline first.md:**
    - §3 "Táblák": `seed_state` — vagy megerősíteni a kódban, vagy a spec-listából kivenni / "későbbi" jelölés.
    - §17: változatlan (az elfogadott korlátok pontosan tükröződnek a kódban).
    - Egyébként: **nincs érdemi átírás** — a §1–§16 és a 20 elfogadási kritérium a kódban végig-implementált.
  - **Fejlesztői környezet.md:**
    - §"Android telepítés": a "A szkript maga a `frontend/` projekt felállításakor születik meg (ma még nincs kód a repóban)" mondat **elavult** — `scripts/install-android.ps1`, `frontend/android/app/src/debug/res/xml/network_security_config.xml` és a CORS `https://localhost` (`SecurityConfig`) mind megvan → jelen idejűre.
    - `### Nyitott kérdések`: iOS build → `> Tervezett: [[backlog/004-ios-build-es-telepites]]`; prod hosting/TLS → `> Tervezett: [[backlog/006-prod-hosting-tls]]`.
  - **Mennyiség mező.md / Névegyediség.md / Szöveges keresés.md:** **nincs átírás** — bitre az implementációt írják le (közös fixture-ök, `Locale.ROOT`, ékezet-megtartás, család-check, hex kanonikus alak mind egyezik).
  - **Life Management 2.0.md:**
    - Megjegyzések: az "5 nyitott kérdés" tábla → 2 sort (Health Connect, secure storage) CODE-RESOLVED-ként törölni, 3 sort pointerre rövidíteni.
    - §"Első kör (MVP) hatókör" tábla → az SSOT-flipnél törölhető (minden sor jegyzett vagy §17 elfogadott).
- **Verdikt: GREEN.** A négy architektúra-SSOT + a három cross-cutting szerződés + a hub a **jelenleg implementált** architektúrát írja le. A 7 Partial mind dokumentáció-pontosítás vagy már jegyzett/feature-chunk follow-up; 0 blokkoló eltérés; a 3 CODE-RESOLVED nyitott kérdés jelen idejűvé tehető, a 2 STILL-OPEN már jegyzett.

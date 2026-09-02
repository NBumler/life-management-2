---
verifikalva:
verifikalt_commit:
---

# Backend

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]], [[Fejlesztői környezet]], [[Bejelentkezés]], [[Névegyediség]], [[Szinkronizációs központ]], [[Nyelv választás]] |

### Jelenlegi működés

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet: a tartalom az `## Architektúra` alatt van. Ez a fájl a **szerveroldali stack és az API-szerződés forrásának SSOT-ja**: technológia, projektstruktúra, OpenAPI kezelés, séma / migráció, a sync végpontok megvalósítása és a tesztelési minimum.

A kód-konvenciók (feature-alapú csomagszervezés, konstruktor-injektálás, thin controller, `@Transactional` a service-en, DTO a határon, globális hibakezelő, Testcontainers) a repóban lévő `claude-hobby-starter-kit` `spring-boot-conventions` skilljéből jönnek; ez a spec azokat **nem írja újra**, csak ahol a projekt szerződése többet követel (hibaválasz alakja, generátor választás, OpenAPI szervezés) — ezek a helyek jelölve vannak.

Vezérelv: KISS + YAGNI. Ahol mégis extra szerkezet van (trigger, view, idempotencia-tábla), az mindig egy konkrét, már specifikált követelményből jön, nem előretervezésből.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

_Nincs frontend érintettség._ (a kliens generálás ugyanabból az OpenAPI-ból történik — részletek: [[Frontend]])

#### Backend-offline

A kliensoldali offline elvárások SSOT-ja: [[Backend-offline first]]. A szerver kliens UUID-t fogad; a módosító kérések visszajátszása a **normál** OpenAPI végpontokra megy (nincs külön write sync API). Az egyetlen dedikált sync végpont az olvasási delta (`GET /api/sync/changes`) és az elérhetőség-próba (`GET /api/health`) — lásd alább. Külső API-k nincsenek backend-proxyzva.

### Backend

#### Stack (döntés)

| Elem | Választás |
|---|---|
| Nyelv / JDK | **Java 25** (aktuális LTS), Gradle toolchainben pinelve |
| Framework | **Spring Boot 4.x** (Spring Framework 7, Jakarta EE 11, Jackson 3) |
| Build | **Gradle**, Kotlin DSL + wrapper (`./gradlew`) |
| Adatbázis | **PostgreSQL** (aktuális stabil major) |
| Persistence | **Spring Data JPA** (Hibernate), explicit mapping |
| Migráció | **Flyway**, plain verziózott SQL |
| Auth | Spring Security + JWT — [[Bejelentkezés]] |
| Teszt | JUnit 5 + AssertJ + Mockito, integrációhoz **Testcontainers** (Postgres) |

Verziópolitika ugyanaz, mint a [[Frontend]]nél: a **build fájl az SSOT**, a spec csak megkötést ír. Tájékoztató pillanatkép (2026-08, nem szerződés): Spring Boot 4.1, Java 25, PostgreSQL 18. A 3.5-ös Spring Boot sor OSS támogatása 2026 júniusában lejárt, ezért a 4-es sorral indulunk.

##### Miért PostgreSQL — ezt a specek kényszerítik ki

Nem preferencia-kérdés; a már `Kész` specek követelményei zárják le:

- **Partial unique index élő sorokra** (`WHERE deleted = false`) a normalizált oszlopon — [[Névegyediség]]. MySQL / MariaDB nem tud partial indexet, tehát ott a törölt sor neve nem lenne újra felvehető.
- **`timestamptz` + IANA időzóna** tárolás — [[Étkezés]].
- **UUID kulcs** kliensről, szerveroldali `IDENTITY` nélkül — [[Backend-offline first]].
- **Stabil, teljes rendezés** `(updated_at, id)` szerint keyset paginációhoz — a delta pull cursor helyessége ezen áll.
- H2 emiatt **tesztre sem** alkalmas (nincs partial unique index, más `timestamptz` szemantika) → Testcontainers a valódi Postgresszel.

#### Projektstruktúra

A monorepo elrendezés (`backend/` + `frontend/`) és a futtatás: [[Fejlesztői környezet]].

```
backend/
├─ build.gradle.kts
├─ src/main/java/hu/bumler/lm2/…     # feature-alapú csomagok
├─ src/main/resources/
│  ├─ application.yml
│  ├─ openapi.yaml                   # OpenAPI SSOT (kézzel írt gyökérfájl)
│  ├─ openapi/                       # $ref-elt paths/ és components/ darabok
│  └─ db/migration/V<n>__<leírás>.sql
└─ src/test/java/hu/bumler/lm2/…
```

- Gradle `group`: **`hu.bumler.lm2`** — ez egyben a Java base package.
- **Feature-alapú csomagszervezés** (starter kit), nem réteg-alapú: `hu.bumler.lm2.<feature>` (`food`, `workout`, `climbing`, `tasks`, `finance`, `aycm`, `gear`, `steps`, `shopping`, `auth`, `sync`, `profile`) + `hu.bumler.lm2.common` (config, hibakezelés, normalizálás, idempotencia). A `profile` csomag tartja a [[Profile]] `UserProfile` + `WeightHistoryEntry` entitásokat és API-t.
- Rétegzés a feature-ön belül: **Controller → Service → Repository**; a controller vékony (a generált interface implementációja + delegálás), az üzleti logika a service-ben, `@Transactional` a service-en.
- DTO a határon: a **generált** OpenAPI modellek mennek ki és be, JPA entitás soha. Mapping kézi mapperrel a feature csomagban (MapStruct csak akkor, ha érdemben megéri).

#### OpenAPI — spec-first (döntés)

- A `backend/src/main/resources/openapi.yaml` **kézzel írt SSOT**; a szerződést **nem** kódból generáljuk (nincs springdoc code-first), különben két igazság lenne, és a [[Frontend]] kliense a kód mellékhatásából származna.
- Szervezés: gyökérfájl + `openapi/paths/*.yaml` és `openapi/components/schemas/*.yaml` `$ref`-fel. A starter kit egyetlen fájlt említ — a **szándékos eltérés** oka a kb. 40 entitás; a gyökérfájl útvonala változatlan, tehát a `/gen-api-client` konvenció érvényes marad.
- A `GET /api/sync/changes` és a `GET /api/health` nem CRUD végpont: nem jönnek ki az entitás-sablonból, **kézzel** kell felvenni őket a válasz-sémákkal együtt. Ha kimaradnak, a generált kliensből is hiányoznak, és a `SyncEngine` nem fordul le.
- **Validáció a sémában él** (`required`, `maxLength`, `pattern`, `minimum`), nem kézzel a DTO-n: így a generált Java DTO jakarta annotációt kap, és a generált kliens ugyanazt a szabályt ismeri. A `@Valid` a controller paraméteren, a hibát a globális handler képezi le.
- Swagger UI a **becsomagolt statikus specből** szolgálódik ki (fejlesztői kipróbálás), nem kódból generálva.
- A szerződéstartás kényszere a fordítás: a generált API interface-eket a controllerek implementálják, tehát spec-változás után a backend **nem fordul**, amíg nincs átvezetve.

##### Generátor profilok

| Profil | Generátor | Kimenet | Verziókövetve |
|---|---|---|---|
| Java API interface + DTO | openapi-generator `spring`, `interfaceOnly=true`, `useTags=true`, jakarta validation | `backend/build/generated/openapi/` | **Nem** — build-time Gradle task a `compileJava` előtt |
| Angular kliens | openapi-generator `typescript-angular`, `providedInRoot=true` | `frontend/src/app/api/` | **Igen** — commitolva |

- **Egy generátor implementáció, két profil.** Így ugyanaz a kód értelmezi a specet mindkét oldalon: discriminator, `oneOf`, `nullable`, nested aggregate. Ez a polimorf `ClimbingSession` DTO ([[Mászónapló]]) és a nested fa-mentések miatt számít. Ezért **nem** `ng-openapi-gen`, amit a starter kit javasol — szándékos eltérés, két generátor két értelmezést jelentene.
- Az **aszimmetria** oka: a backend buildben van JVM, tehát a generált forrás a `build/`-be tartozik; a frontendnek viszont `npm ci && ng build`-del, JVM nélkül is fordulnia kell, és az IDE típusellenőrzésnek is kell a fájl — ezért ott commitoljuk.
- Parancsok: `npm run gen:api` a frontenden (a starter kit `/gen-api-client` parancsa ezt hívja), Gradle task a backenden. **Drift-védelem:** a CI újragenerál, és eltérésnél hibázik — így nem lehet a generált kliens elavult.
- A generált fájlok soha nem szerkesztődnek kézzel — [[Frontend]].

#### Séma és migráció

- **Flyway**, `src/main/resources/db/migration/V<n>__<leírás>.sql`. Alkalmazott migráció **soha nem módosul** (javítás = új migráció). `spring.jpa.hibernate.ddl-auto=validate`; auto-DDL tilos.
- Miért nem ORM-generált séma: a szerződéshez partial unique index, normalizált oszlop, `updated_at` trigger és a `sync_changes` view kell — ezeket egyetlen DDL-generátor sem írja le helyesen.
- **Közös oszlopok** minden szinkronizált táblán ([[Backend-offline first]]): `id uuid` PK (**kliens adja**), `created_at`, `updated_at` (`timestamptz`), `deleted boolean not null default false`, `deleted_at`, user-owned táblán `user_id uuid not null`.
- **`updated_at` DB triggerből** (`BEFORE INSERT OR UPDATE` → `now()`): a cascade soft delete-ek bulk `UPDATE`-jeinél is kötelezően frissül. Ez a [[Backend-offline first]] „kritikus követelmény"-e — alkalmazásrétegben egy elfelejtett bulk update csendben kitüntetné a sort a delta pullból, és a többi eszköz szellemsorokat látna. JPA oldalon a mező `@Generated(INSERT, UPDATE)`, hogy Hibernate visszaolvassa a szerver által adott értéket.
- **Indexek:** `(user_id, updated_at)` a user-owned táblákon (a delta pull szűrése), FK-kra index, és a [[Névegyediség]] hatóköre szerinti partial unique indexek (`WHERE deleted = false`) a normalizált oszlopon.
- **Tombstone:** fizikai törlés csak a retenciós határ (**180 nap** a `deleted_at`-tól) után, ütemezett job; a job frissíti a `sync_meta.tombstone_horizon` értéket.

#### Névnormalizálás — kliens–szerver paritás

- A `name_normalized` oszlop értékét **az alkalmazás írja**, nem DB generated column, ugyanazokkal a lépésekkel, mint a kliens `normalizeName`-je ([[Névegyediség]]): NFC → trim (`U+00A0`-val együtt) → belső whitespace összevonás egyetlen szóközre → **locale-független** kisbetűsítés (`toLowerCase(Locale.ROOT)`); az ékezet **marad**.
- Miért nem generated column: a Postgres `lower()` collation-függő, és nem azonos a kliens Unicode-kisbetűsítésével. A legkisebb eltérés is azt jelenti, hogy a user offline mentése hibátlannak látszik, majd syncnél `409`-cel elhasal — pontosan az, amit a [[Névegyediség]] el akar kerülni.
- A paritást **közös fixture** biztosítja: `shared/fixtures/name-normalization.json`, amit a Java és a TypeScript teszt is beolvas. Új edge case → új fixture-sor, nem külön teszt az egyik oldalon.
- Ugyanez érvényes a `normalizeBarcode` és `normalizeHexColor` szabályokra, **saját fixture-fájllal mindegyiknek** (ugyanaz a paritás-elv, mint a névnél): `shared/fixtures/barcode-normalization.json` (kötelező esetek: trim, kötőjel / szóköz tartalmú EAN, vezető nullák megőrzése, üres = üres) és `shared/fixtures/hex-color-normalization.json` (kötelező esetek: `#` prefixszel / nélkül, 3 jegyű rövid forma kifejtése, kis/nagybetű keverék, csupa nagybetű).
- A mennyiség/időtartam mezők **kanonikus egységre váltása** ([[Mennyiség mező]]) is ugyanígy közös fixture-ön él: `shared/fixtures/quantity-conversion.json` (a [[Mennyiség mező]] bázisegység-táblájának minden szorzópárja, pl. `1l = 1000ml`, `1kg = 1000g`).
- A `Food` mezőhalmaz-duplikáció **alkalmazás-szintű** ellenőrzés, nem index.

#### Sync végpontok megvalósítása

Szerződés és szemantika: [[Backend-offline first]] (SSOT) — itt csak az implementációs döntések.

- **`GET /api/health`:** publikus, DB-kör nélküli, konstans válasz. A kliens ebből dönt `BACKEND_OFFLINE`-ról, tehát nem szabad drágának lennie.
- **`GET /api/sync/changes`:** keyset pagináció `(updated_at, id)` szerint egy `sync_changes` **SQL view**-n, amely minden szinkronizált táblát `UNION ALL`-oz: `entity_type`, `id`, `user_id` (shared katalógusnál `NULL`), `updated_at`, `deleted`.
  - Szűrés: `user_id = :userId OR user_id IS NULL`. Lapozás: `(updated_at, id) > (:ts, :id) ORDER BY updated_at, id LIMIT :limit + 1` — a `+1` adja a `hasMore`-t.
  - A `data` payload **nem** a view-ból jön: típusonként batch-load, majd **ugyanaz a mapper**, mint a CRUD `GET`-nél. Így a kliens helyi store-jába kerülő DTO bitre az, amit a `GET by id` adna — különben a pull és a normál olvasás különböző alakot írna ugyanabba a sorba.
  - `nextCursor`: opaque base64(`updated_at` + `id`), nem nyers timestamp.
  - **Kötelező teszt:** minden `deleted` oszlopos tábla szerepel a view-ban. Új entitás migrációja a view-t is újraírja; ez az egyetlen hely, ahol egy elfelejtett tábla **csendben** kiesne a syncből, és a hiba csak a user eszközén derülne ki.
  - `410 CURSOR_TOO_OLD`: ha a `since` régebbi a `sync_meta.tombstone_horizon`-nál.
- **Idempotencia:** `Idempotency-Key` minden módosító kérésen. A CRUD természetesen idempotens (upsert kliens UUID-ra, soft delete idempotens), de az **atomi** végpontok nem — a `POST /api/shopping-lists/{id}/complete` archivál, `StoredFood`-okat hoz létre és új listát nyit ([[Bevásárlás teljesítve]]), tehát a visszajátszása duplikálna. Ezért `idempotency_key` tábla (`key` PK, `user_id`, `endpoint`, `http_status`, `response_body`, `created_at`) filterben ellenőrizve; replaynél a **tárolt válasz** megy vissza. Retenció 30 nap.
- **Upsert:** explicit `findById` → insert vagy update a service-ben. Nem támaszkodunk a JPA `save()` heurisztikájára: kliens által adott PK-nál a `save()` insert / update döntése nem magától értetődő. `POST` létező `id`-val → `200` + a frissített sor, nem `409`.
- **Nested aggregate `PUT`** ([[Edzésnapló]], [[Mászónapló]], [[Recept]], [[Sablonok]]): a teljes fa cseréje egy tranzakcióban, gyerekeken soft delete a kiesőkre — a részleges szinkronizált állapot így kizárt.

#### Hibakezelés

- **Egy** globális `@RestControllerAdvice`, nincs szétszórt `try/catch` (starter kit).
- A válasz alakja a starter kit `ApiError`-jának **bővítése** a sync szerződés szerint: `{ code, message, field?, conflictingId? }` ([[Backend-offline first]]).
- **A szerver hibaüzenete nincs lokalizálva:** a felhasználói szöveget a kliens a `code`-ból fordítja ([[Nyelv választás]]), a `message` csak fallback és diagnosztika a [[Szinkronizációs központ]] hibasorában. Ezért minden hibaosztálynak **stabil `code`-ja** kell legyen — új hibakód bevezetése egyben i18n kulcs bevezetése is.
- Domain kivételek a service-ből (`EntityNotFoundException`, `EntityDeletedException`, `UniqueViolationException`), a handler képezi HTTP-re. `500`-nál nincs stack trace vagy belső üzenet a kliensnek.
- Postgres `23505` (unique violation) elkapva → `409` + `UNIQUE_VIOLATION` + a `field`; az index-név → mező leképezés a `common` csomagban egy helyen él.
- `PUT` törölt entitáson → `409` + `ENTITY_DELETED`; idegen user sora → `404` (nem `403`, enumeration ellen) — [[Bejelentkezés]].

#### Kötelező elvek

- [[Backend-offline first]]: kliens UUID (v4, természetes kulcsnál v5), idempotens írás, soft delete, cascade `updated_at` bump.
- Az entitás ID stratégia **nem** lehet szerveroldali `IDENTITY` auto-increment; minden szinkronizált entitás kliens-generált UUID-t kap ([[Backend-offline first]]).
- Az OpenAPI sémákban az entitás ID-k UUID típusúak.
- **Külső integrációk nincsenek proxyzva** a backenden: a [[Frontend]] közvetlenül hívja őket (Open Food Facts, Health Connect, Google), így `BACKEND_OFFLINE` állapotban is működnek.
- **Auth / authorizáció:** JWT access + refresh, `@PreAuthorize`, user-owned vs shared ownership — SSOT: [[Bejelentkezés]]. Admin API a `/api/admin/**` alatt `X-Admin-Api-Key` filterrel, nem JWT role-lal.
- **Nincs titok a kódban vagy az `application.yml`-ben:** env változók, lokálisan git-ignorált `application-local.yml` — [[Fejlesztői környezet]].

#### Sync szerződés (SSOT: [[Backend-offline first]])

| Metódus | Útvonal | Auth | Leírás |
|---|---|---|---|
| `GET` | `/api/sync/changes` | Bearer | Delta pull: `since` (opaque cursor), `limit` (default `500`, max `2000`), opcionális `types`. A hívó user user-owned sorai + a shared katalógus, tombstone-okkal. Elavult cursor → `410` `CURSOR_TOO_OLD`. |
| `GET` | `/api/health` | publikus | Elérhetőség-próba (olcsó, DB-kör nélkül). |

HTTP szemantika: `POST` létező `id`-val = idempotens upsert (`200`); `PUT` = teljes body, sor-szintű last-write-wins; `PUT` törölt entitáson → `409` `ENTITY_DELETED`; `DELETE` = soft delete, idempotens (`200`); saját törölt sor `GET` by id → `200` + `deleted = true`; idegen sor → `404`. Egyediség: partial unique index élő sorokra, sértés → `409` `UNIQUE_VIOLATION` + `field`. Cascade soft delete-nél a cascade-elt sorok `updated_at`-ja is frissül. Részletek és elfogadási kritériumok: [[Backend-offline first]].

#### Tesztelési minimum

- **Unit:** service-ek JUnit 5 + Mockito + AssertJ, Spring kontextus nélkül (starter kit).
- **Slice:** `@WebMvcTest` controllerre, `@DataJpaTest` lekérdezésekre.
- **Integráció:** `@SpringBootTest` + **Testcontainers Postgres** — kötelező, és nem opcionális kényelem: a partial unique index, az `updated_at` trigger, a `sync_changes` view és a `timestamptz` viselkedés H2-n nem reprodukálható. A Testcontainers image tag **ugyanaz**, mint a `docker-compose.yml`-ben ([[Fejlesztői környezet]]).
- **Kötelező integrációs esetek** a [[Backend-offline first]] §18 szerverre eső pontjaiból: idempotens `POST` ismételve, `409 ENTITY_DELETED`, `UNIQUE_VIOLATION` `field`-del, cascade utáni `updated_at` bump megjelenik a deltában, cursor-lapozás kihagyás és duplikátum nélkül, `410 CURSOR_TOO_OLD` → full re-pull, `DailyStepLog` upsert `(user_id, date)`-re, `POST /complete` replay egyetlen hatással.
- **Normalizálás:** a közös fixture-listákon futó paritás-teszt mind a három normalizálóra (`normalizeName`, `normalizeBarcode`, `normalizeHexColor`) és a mennyiség-konverzióra (fent).

#### Kaja OpenAPI scope (döntés)

Nincs aggregált „Kaja API" a szülőben. A szerződés **erőforrás / tag alapon** szerveződik (`foods`, `stored-foods`, `recipes`, `meals`, `shopping-lists`, …), és a gyerek specek maradnak a szerződés birtokosai; a [[Kaja]] hub csak a közös döntéseket tartja (ownership, cascade). Ugyanez a szabály minden hubra ([[Edzés]], [[Tennivalók]], [[Pénzügyek]], [[GearCheck]], [[Mászónapló]]): **a hub navigációs fogalom, nem API-határ** — az API-t a tag és az erőforrás határolja. A [[Kaja statisztika]] emiatt nem kap végpontot: kliensoldali számítás a helyi katalógusból.

### Nyitott kérdések

- **Prod üzemeltetés / hosting** (saját VPS + docker-compose vs managed platform + managed Postgres, TLS, backup): az első kör a fejlesztői környezetre szól — [[Fejlesztői környezet]]. A natív app `apiBaseUrl`-je konfiguráció, tehát a döntés nem blokkolja a fejlesztést.
- Az openapi-generator `spring` profiljának **Spring Boot 4 / Framework 7 kimenetét** verzió-pineléskor ellenőrizni kell. Ha az adott generátor-verzió még nem kompatibilis, a tartalék: csak model / DTO generálás, és az API interface kézzel íródik a spec alapján (a szerződés forrása változatlanul az OpenAPI).

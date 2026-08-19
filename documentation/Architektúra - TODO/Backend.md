# Backend

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]], [[Bejelentkezés]] |

### Célállapot

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet: a tartalom az `## Architektúra` alatt van.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

_Nincs frontend érintettség._ (a kliens generálás ugyanabból az OpenAPI-ból történik — részletek: [[Frontend]])

#### Backend-offline

A kliensoldali offline elvárások SSOT-ja: [[Backend-offline first]]. A szerver kliens UUID-t fogad; a módosító kérések visszajátszása a **normál** OpenAPI végpontokra megy (nincs külön write sync API). Az egyetlen dedikált sync végpont az olvasási delta (`GET /api/sync/changes`) és az elérhetőség-próba (`GET /api/health`) — lásd alább. Külső API-k nincsenek backend-proxyzva.

### Backend

#### Stack

- **Nyelv / framework:** Java — Spring Boot
- **Adatbázis:** (TODO — technológia kiválasztása)
- **API szerződés:** OpenAPI (Swagger) — a REST API forrása; ebből generálódik a Spring Boot interface (és a [[Frontend]] kliens kódja is)

#### OpenAPI / kódgenerálás

- Az API **single source of truth**-a az OpenAPI specifikáció.
- A Spring Boot oldalon az interface-ek (controller / API contract) az OpenAPI-ból generálódnak; az implementáció kézzel íródik rájuk.
- Ugyanabból a specifikációból készül az Ionic Angular HTTP kliens / modellek is — lásd [[Frontend]].
- Swagger UI a fejlesztői dokumentációhoz / kipróbáláshoz (végleges toolingat választani: pl. `springdoc-openapi` + openapi-generator).

#### Kötelező elvek

- [[Backend-offline first]]: a kliens UUID-t generál (UUID v4), offline módosítások outbox queue-n keresztül szinkronizálódnak.
- Az entitás ID stratégia **nem** lehet szerveroldali `IDENTITY` auto-increment, ha az offline-first láncolhatóságot meg akarjuk tartani. (Lásd konfliktus: [[Giga feature napló specifikáció (Ideiglenes specifikáció)]] jelenleg `GenerationType.IDENTITY`-t mutat — ezt egységesíteni kell.)
- Az OpenAPI sémákban az entitás ID-k UUID típusúak legyenek, összhangban az offline-first elvvel.
- **Külső integrációk nincsenek proxyzva** a backend-en keresztül: a [[Frontend]] közvetlenül hívja a külső API-kat (pl. Open Food Facts). Így Backend-offline állapotban is elérhetők, amíg van internet — lásd [[Backend-offline first]]. A saját backendre mentés továbbra is outbox / [[Szinkronizációs központ]] útján történik.
- **Auth / authorizáció:** JWT access + refresh; `@PreAuthorize`; user-owned vs shared ownership — SSOT: [[Bejelentkezés]]. OpenAPI `securitySchemes`: HTTP Bearer.

#### Sync szerződés (SSOT: [[Backend-offline first]])

Minden szinkronizált entitáson kötelező: `id` (UUID, kliens), `created_at`, `updated_at` (szerver állítja), `deleted` / `deleted_at`; user-owned entitáson `user_id`.

| Metódus | Útvonal | Auth | Leírás |
|---|---|---|---|
| `GET` | `/api/sync/changes` | Bearer | Delta pull: `since` (opaque cursor), `limit`, opcionális `types`. A hívó user user-owned sorai + a shared katalógus, tombstone-okkal. Elavult cursor → `410` `CURSOR_TOO_OLD`. |
| `GET` | `/api/health` | publikus | Backend elérhetőség-próba (olcsó, DB-kör nélkül) — ebből dönt a kliens `BACKEND_OFFLINE`-ról. |

HTTP szemantika: `POST` létező `id`-val = idempotens upsert (`200`); `PUT` = teljes body, sor-szintű last-write-wins; `PUT` törölt entitáson → `409` `ENTITY_DELETED`; `DELETE` = soft delete, idempotens (`200`); saját törölt sor `GET` by id → `200` + `deleted = true`; idegen sor → `404`. Egyediség: partial unique index élő sorokra, sértés → `409` `UNIQUE_VIOLATION` + `field`. Egységes hibaformátum: `{ code, message, field?, conflictingId? }`. Cascade soft delete-nél a cascade-elt sorok `updated_at`-ja is frissül (különben kimaradnak a deltából). Részletek és elfogadási kritériumok: [[Backend-offline first]].

### Nyitott kérdések

- Migráció / sémakezelés eszköze
- OpenAPI fájl(ok) elhelyezése a monorepóban / külön API csomagban
- openapi-generator profilok (Java interface vs TypeScript Angular client)
- Adatbázis technológia

Idempotencia / konfliktuskezelés: lezárva — [[Backend-offline first]].

Auth / JWT / admin curl / ownership mátrix: [[Bejelentkezés]] (lezárva).

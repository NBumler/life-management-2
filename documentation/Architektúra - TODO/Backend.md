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

### Nyitott kérdések

- Auth mechanizmus (összekötve: [[Bejelentkezés]]) — OpenAPI `securitySchemes`
- Multi-tenant / user izoláció részletei
- Migráció / sémakezelés eszköze
- OpenAPI fájl(ok) elhelyezése a monorepóban / külön API csomagban
- openapi-generator profilok (Java interface vs TypeScript Angular client)
- Adatbázis technológia

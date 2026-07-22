# Backend-offline first

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend]], [[Szinkronizációs központ]], [[Vonalkódos élelmiszer beolvasás]] |

### Célállapot

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet. Fogalmak:

- **Backend-offline:** az eszköz nem éri el a backend szervert, de van internet-elérése.
- **Full-offline:** sem backend, sem internet nincs.

A különbség pl. a [[Vonalkódos élelmiszer beolvasás]]nál fontos: külső API a kliensről hívható Backend-offline esetén is. A saját backend syncet a [[Szinkronizációs központ]] segíti.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

#### Alapelvek

* **Kliensoldali UUID:** Minden adatbázis entitás ID-ját a kliens generálja a létrehozás pillanatában (UUID v4), így az offline műveletek láncolhatóak (Létrehozás → Módosítás → Használat).
* **Pragmatikus duplikáció:** A kritikus alapértékeket (pl. kalóriabevitel, lépés-szorzók) pure TypeScript utility osztályként leduplikáljuk a frontenden is az azonnali optimista UI frissítéshez.
* **Vizuális bizonytalanság:** A csak online kiszámolható adatok mellett offline állapotban egy homokóra ikon (~) jelzi, hogy az adat csak becsült.

#### SQLite Outbox Queue

Minden olyan módosító HTTP kérés (POST, PUT, DELETE), ami offline állapotban (`status === 0` vagy 5xx hiba) fut le, az `OfflineQueueService` segítségével az SQLite-ba mentődik:

| Mező | Típus | Leírás |
|---|---|---|
| `id` | UUID | Kliensoldali egyedi azonosító |
| `timestamp` | Long | Létrehozás ideje (Unix timestamp) |
| `method` | String | POST, PUT, DELETE |
| `url` | String | API végpont |
| `payload` | JSON | Küldendő adatok |
| `targetEntityId` | UUID | Érintett entitás egyedi kliens-UUID azonosítója |
| `status` | Enum | PENDING, ERROR |
| `errorMessage` | String | Szerveroldali hibaüzenet hiba esetén |

#### Szinkronizációs és függőségi logika (kliens)

1. **FIFO feldolgozás:** Online állapotba lépéskor a sor szekvenciálisan hajtódik végre.
2. **Függőségi zár:** Ha egy kérés elhasal a szerveren, a tétel `ERROR` státuszt kap, és a rendszer felfüggeszti az összes olyan további `PENDING` kérés végrehajtását a sorban, amelynek a `targetEntityId`-ja megegyezik a hibás elem ID-jával.
3. **Független ágak:** Minden olyan kérést, ami nem kötődik a hibás entitáshoz, a motorcsónak elv alapján tovább kell szinkronizálni a szerverre.

UI a sor kezeléséhez: [[Szinkronizációs központ]].

### Backend

- Elfogadja a kliens által generált UUID-kat (nem `IDENTITY` auto-increment) — lásd [[Backend]].
- A queue által visszajátszott POST/PUT/DELETE kérések a normál OpenAPI végpontokra mennek; idempotencia / ütközéskezelés részletei TBD.

### Nyitott kérdések

- Szerveroldali idempotencia / konfliktuskezelés UUID alapján

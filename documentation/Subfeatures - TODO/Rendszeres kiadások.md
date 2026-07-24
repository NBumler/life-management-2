# Rendszeres kiadások

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Pénzügyek]] |
| **Kapcsolódó** | [[AYCM tracker]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Minden rendszeres, fix időközönként ismétlődő kiadás (streaming, edzőtermi bérletek, biztosítások) központi adminisztrációja; a [[Pénzügyek]] és az [[AYCM tracker]] közös Single Source of Truth (SSOT) alapja.

### Funkcionális leírás

Adatstruktúra (kötelező mezők):

* `id`: UUID (v4) — kliensoldalon generált
* `name`: String (pl. "AYCM XXL bérlet", "Netflix")
* `amountHuf`: Integer (fixint)
* `frequency`: Enum (`MONTHLY`, `QUARTERLY`, `YEARLY`)
* `category`: Enum (`ENTERTAINMENT`, `SPORT`, `UTILITIES`, `INSURANCE`)
* `nextBillingDate`: Date

AYCM kapocs: az itt rögzített előfizetéseket használja az AYCM setup. Éves bérlet esetén az `amountHuf` + `frequency` alapján számolódik a havi leosztott költség (nincs adatduplikáció). Lásd [[AYCM tracker]].

### UI/UX elvárások

* Listatételek csúsztatással (`ion-item-sliding`) törölhetőek vagy inaktiválhatóak.
* Offline rögzítés → `OfflineQueueService` ([[Szinkronizációs központ]]).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

CRUD lista; offline queue; SSOT olvasás az [[AYCM tracker]] felé.

#### Backend-offline

CRUD helyi store + OfflineQueueService; SSOT olvasás AYCM felé. Lásd [[Backend-offline first]], [[Szinkronizációs központ]].

### Backend

Előfizetés / rendszeres kiadás entitás (OpenAPI, UUID).

### Nyitott kérdések

Nincs nyitott kérdés.

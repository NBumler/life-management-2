# Rendszeres kiadások

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Pénzügyek]] |
| **Kapcsolódó** | [[Pénzügyek]], [[AYCM tracker]], [[Értesítések]], [[Bejelentkezés]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Minden rendszeres, fix időközönként ismétlődő kiadás (streaming, edzőtermi bérletek, biztosítások) központi adminisztrációja. Generikus SSOT: a [[Pénzügyek]] dashboard a havi ekvivalens **összegét** olvassa. Az [[AYCM tracker]] opcionálisan **egy** sort belinkel (`linkedRecurringExpenseId` az AYCM oldalon) — ezen a spechen nincs AYCM mező.

### Funkcionális leírás

Adatstruktúra (kötelező mezők):

* `id`: UUID (v4) — kliensoldalon generált
* `name`: String (pl. "AYCM XXL bérlet", "Netflix")
* `amountHuf`: Integer (fixint)
* `frequency`: Enum (`MONTHLY`, `QUARTERLY`, `YEARLY`)
* `category`: Enum (`ENTERTAINMENT`, `SPORT`, `UTILITIES`, `INSURANCE`)
* `nextBillingDate`: Date

#### Havi ekvivalens (fogyasztói szerződés)

SSOT **itt**; a [[Pénzügyek]] dashboard és az [[AYCM tracker]] „megéri-e” ezt a utility-t hívja (nem másol képletet).

`monthlyEquivalentHuf(row)` — egész Ft, `Math.round` (0.5 fel):

| `frequency` | Képlet |
|---|---|
| `MONTHLY` | `amountHuf` |
| `QUARTERLY` | `round(amountHuf / 3)` |
| `YEARLY` | `round(amountHuf / 12)` |

Dashboard-összeg: a **beszámított** sorok `monthlyEquivalentHuf` értékeinek összege (soronként kerekítve, aztán összeg). Üres halmaz → 0.

Melyik sor számít: a CRUD / inaktív vs törlés kidolgozásakor zárjuk (MVP-irány: nem törölt, és ha lesz inaktív állapot, az kiesik).

Nincs AYCM-specifikus mező (`isAycm` tilos). Példanév lehet „AYCM XXL bérlet” — ez csak `name`.

### UI/UX elvárások

* Listatételek csúsztatással (`ion-item-sliding`) törölhetőek vagy inaktiválhatóak.
* Offline rögzítés → `OfflineQueueService` ([[Szinkronizációs központ]]).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

CRUD lista; offline queue. Havi ekvivalens: pure TS utility. Az [[AYCM tracker]] ide olvashat (FK az AYCM-en).

#### Backend-offline

CRUD helyi store + OfflineQueueService. Havi ekvivalens always kliens TS. Lásd [[Backend-offline first]], [[Szinkronizációs központ]].

### Backend

Előfizetés / rendszeres kiadás entitás (OpenAPI, UUID).

### Nyitott kérdések

Nincs nyitott kérdés.

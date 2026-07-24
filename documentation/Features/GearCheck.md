# GearCheck

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Eszközök]], [[Sablonok]], [[Pakolás]], [[Backend-offline first]] |

### Célállapot

Felszerelés nyilvántartás, pakolási sablonok és aktív pakolások kezelése. Belépés: Menü (lásd [[Frontend]]).

### Funkcionális leírás

Subfeature lista:

- [[Eszközök]]
- [[Sablonok]]
- [[Pakolás]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Menü alatti GearCheck belépő; subfeature képernyők.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (eszköz / sablon / pakolás API scope később itt vagy a gyerekekben)

### Nyitott kérdések

Nincs nyitott kérdés.

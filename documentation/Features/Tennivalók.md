# Tennivalók

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Naptár]], [[Események]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Feladatok / teendők kezelése. Alsó tab: **Feladatok** (lásd [[Frontend]]).

### Funkcionális leírás

Subfeature lista:

- [[Háztartási feladatok]]
- [[Élet tervek]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Feladatok tab belépő; subfeature képernyők; megjelenés a [[Naptár]]ban.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös teendő API később itt vagy a gyerekekben)

### Nyitott kérdések

Nincs nyitott kérdés.

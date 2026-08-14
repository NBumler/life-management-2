# Tennivalók

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Háztartási feladatok]], [[Élet tervek]], [[Naptár]], [[Események]], [[Értesítések]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Feladatok / teendők kezelése. Alsó tab: **Feladatok** (lásd [[Frontend]]).

### Funkcionális leírás

Subfeature / belépők:

- [[Háztartási feladatok]] (`Kész`)
- [[Élet tervek]] (`TODO` — tartalom a gyerek specben)
- [[Naptár]] (aggregátor; nem tennivaló-CRUD)

A háztartási CRUD, naptár-előfordulás és `HOUSEHOLD_TASK_DUE` digest a [[Háztartási feladatok]] spechen. Ez a szülő a Feladatok tab **hubja**.

### UI/UX elvárások

- Alsó tab: **Feladatok** ([[Frontend]]).
- Hub **három csempe:** Háztartási feladatok | Élet tervek | Naptár.
- Élet tervek: a gyerek spec `Kész` előtt a csempe a [[Life Management 2.0]] feature flag mögött lehet; nincs háztartási kapocs (MVP).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Feladatok tab → hub (három csempe) → gyerek képernyők. Naptár aggregáció: [[Naptár]]. Háztartási API a gyerekben.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (háztartási OpenAPI: [[Háztartási feladatok]]; élet tervek a gyerekben)

### Nyitott kérdések

Nincs nyitott kérdés.

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
- [[Naptár]] (`Kész` — aggregátor; nem tennivaló-CRUD)
- [[Események]] (`Kész` — saját flag; lista + CRUD a gyerek/feature spechen)

A háztartási CRUD, naptár-előfordulás és `HOUSEHOLD_TASK_DUE` digest a [[Háztartási feladatok]] spechen. Esemény CRUD / `EVENT` vetítés / `EVENT_OCCURRENCE`: [[Események]]. Ez a szülő a Feladatok tab **hubja**.

### UI/UX elvárások

- Alsó tab: **Feladatok** ([[Frontend]]).
- Hub **négy csempe:** Háztartási feladatok | Élet tervek | Naptár | Események.
- Élet tervek: a gyerek spec `Kész` előtt a csempe a [[Life Management 2.0]] feature flag mögött lehet; nincs háztartási kapocs (MVP).
- Naptár / Események: saját flag; ki → a csempe rejtve. A [[Tennivalók]] flagje a tabot / háztartási csempét fedi.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Feladatok tab → hub (négy csempe) → gyerek képernyők. Naptár aggregáció: [[Naptár]]. Háztartási API: [[Háztartási feladatok]]. Esemény API: [[Események]].

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (háztartási OpenAPI: [[Háztartási feladatok]]; esemény: [[Események]]; élet tervek a gyerekben)

### Nyitott kérdések

Nincs nyitott kérdés.

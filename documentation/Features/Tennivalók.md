---
verifikalva: 2026-09-03
verifikalt_commit: 18da204
---

# Tennivalók

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Háztartási feladatok]], [[Élet tervek]], [[Naptár]], [[Események]], [[Értesítések]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Feladatok / teendők kezelése. Alsó tab: **Feladatok** (lásd [[Frontend]]).

### Funkcionális leírás

Subfeature / belépők:

- [[Háztartási feladatok]] (`Kész`)
- [[Élet tervek]] (`Kész` — saját flag; lista + státusz a gyerek spechen; nincs naptár-producer)
- [[Naptár]] (`Kész` — saját flag; aggregátor; nem tennivaló-CRUD)
- [[Események]] (`Kész` — saját flag; lista + CRUD a gyerek/feature spechen)

A háztartási CRUD, naptár-előfordulás és `HOUSEHOLD_TASK_DUE` digest a [[Háztartási feladatok]] spechen. Esemény CRUD / `EVENT` vetítés / `EVENT_OCCURRENCE`: [[Események]]. Élet terv CRUD / állapotgép: [[Élet tervek]]. Ez a szülő a Feladatok tab **hubja**.

### UI/UX elvárások

- Alsó tab: **Feladatok** ([[Frontend]]).
- Hub **négy csempe:** Háztartási feladatok | Élet tervek | Naptár | Események.
- Élet tervek / Naptár / Események: **saját** flag; ki → a csempe rejtve. Nincs háztartási kapocs; az Élet tervek **nem** naptár-producer ([[Élet tervek]], [[Naptár]]).
- A [[Tennivalók]] flagje a tabot / háztartási csempét fedi. Tab ki → a többi csempe sem látszik.

### Megjegyzések

A `feladatok.eletTervek` / `feladatok.esemenyek` / `feladatok.naptar` flag a hub-csempét rejti **és** a `/tabs/tasks/{life-plans,events,calendar}` al-route-fát a tetején külön `featureFlagGuard` blokkolja (deep link → `/tabs/menu`). A `household` al-route-nak nincs saját flagje — a `tab.feladatok` fedi, ami már a `tasks` tab-gyökéren guardol.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Feladatok tab → hub (négy csempe) → gyerek képernyők. Naptár aggregáció: [[Naptár]]. Háztartási API: [[Háztartási feladatok]]. Esemény API: [[Események]]. Élet terv API: [[Élet tervek]].

A `tasks` tab-gyökér `featureFlagGuard('tab.feladatok')` mögött van; a saját flaggel bíró gyerekfák (`life-plans` / `events` / `calendar`) a route-fájuk tetején külön `featureFlagGuard('feladatok.eletTervek' | 'feladatok.esemenyek' | 'feladatok.naptar')` guardot kapnak (a `finance` / `aycm` minta), így letiltott feature-re a deep link is `/tabs/menu`-re esik vissza. A `household` gyerekfa saját flag nélkül a `tab.feladatok`-on osztozik.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (háztartási OpenAPI: [[Háztartási feladatok]]; esemény: [[Események]]; élet terv: [[Élet tervek]])

### Nyitott kérdések

Nincs nyitott kérdés.

# Edzés

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Mászónapló]], [[Úszás napló]], [[Lépésszám követés]], [[Backend-offline first]] |

### Célállapot

Erőnléti / termi edzés: gyakorlatok, heti terv, edzésnapló. Alsó tab: **Edzés** (lásd [[Frontend]]).

### Funkcionális leírás

Subfeature lista:

- [[Gyakorlat]]
- [[Heti terv]]
- [[Edzésnapló]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Edzés tab belépő; subfeature képernyők.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös edzés domain / OpenAPI később itt vagy a gyerekekben)

### Nyitott kérdések

Nincs nyitott kérdés.

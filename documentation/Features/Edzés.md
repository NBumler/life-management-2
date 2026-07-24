# Edzés

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Backend-offline first]] |

### Célállapot

Edzés tab (lásd [[Frontend]]): erőnléti / termi edzés (gyakorlatok, heti terv, edzésnapló) + aktivitás-naplók (úszás, bicikli, …). A naplók MET-kalóriája a [[Tápérték kalkulátor]] `activityExtraKcal` összegébe megy.

### Funkcionális leírás

Subfeature / kapcsolódó napló lista:

- [[Gyakorlat]]
- [[Heti terv]]
- [[Edzésnapló]]
- [[Úszás napló]]
- [[Biciklizés napló]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Edzés tab belépő; subfeature / napló képernyők.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös edzés domain / OpenAPI később itt vagy a gyerekekben)

### Nyitott kérdések

Nincs nyitott kérdés.

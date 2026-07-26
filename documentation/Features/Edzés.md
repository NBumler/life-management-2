# Edzés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Gyakorlat]], [[Heti terv]], [[Edzésnapló]], [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Profile]], [[Backend-offline first]] |

### Célállapot

Edzés tab (lásd [[Frontend]]): erőnléti / termi edzés (gyakorlatok, heti terv, edzésnapló) + aktivitás-naplók (úszás, bicikli, …). A naplók MET-kalóriája a [[Tápérték kalkulátor]] `activityExtraKcal` összegébe megy.

### Funkcionális leírás

Subfeature / kapcsolódó napló lista:

- [[Gyakorlat]] — törzsadat (`Kész`); `ExerciseCategory` + `ExerciseKind`
- [[Edzésnapló]] — elvégzett sessionök + élő követés (`Kész`); Heti terv nélkül is önálló
- [[Heti terv]] — `WorkoutPlan` sablonok + heti kiosztás (`Kész`); `planId` = sablon ID
- [[Úszás napló]]
- [[Biciklizés napló]]

Erőedzés MET ([[Edzésnapló]]): `GENERAL_WEIGHTS` 5.0; `HIIT_CIRCUIT` 8.0 — kanonikus: [[Tápérték kalkulátor]].

Fejlesztési sorrend: Gyakorlat → Edzésnapló → Heti terv.

### UI/UX elvárások

_Nincs UI/UX érintettség._ (gyerek specek)

### Megjegyzések

Naplózható entitások: egységes soft delete — [[Backend-offline first]].

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

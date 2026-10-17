---
verifikalva: 2026-10-17
verifikalt_commit: c6a3b27
---

# Edzés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Gyakorlat]], [[Heti terv]], [[Edzésnapló]], [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]], [[Röplabda napló]], [[Lépésszám követés]], [[Profile]], [[Backend-offline first]] |

### Jelenlegi működés

Edzés tab (lásd [[Frontend]]): erőnléti / termi edzés (gyakorlatok, heti terv, edzésnapló) + aktivitás-naplók (úszás, bicikli, röplabda, …). A naplók MET-kalóriája a [[Tápérték kalkulátor]] `activityExtraKcal` összegébe megy.

### Funkcionális leírás

Subfeature / kapcsolódó napló lista:

- [[Gyakorlat]] — törzsadat (`Kész`); erősítő (`Exercise`: `ExerciseCategory` + `ExerciseKind`) és nyújtó (`StretchExercise`) gyakorlatok egy katalógusban
- [[Edzésnapló]] — elvégzett sessionök + élő követés (`Kész`); Heti terv nélkül is önálló
- [[Heti terv]] — `WorkoutPlan` sablonok + heti kiosztás (`Kész`); `planId` = sablon ID
- [[Úszás napló]]
- [[Biciklizés napló]]
- [[Röplabda napló]]

Erőedzés MET ([[Edzésnapló]]): `GENERAL_WEIGHTS` 5.0; `HIIT_CIRCUIT` 8.0 — kanonikus: [[Tápérték kalkulátor]].

Fejlesztési sorrend: Gyakorlat → Edzésnapló → Heti terv.

### UI/UX elvárások

- Alsó tab: **Edzés** (`/tabs/workout`) — app-shell SSOT: [[Frontend]].
- A tab gyökerén **felső szegmens**: Edzésnapló | Heti terv | Mászás | Úszás | Bicikli | Röplabda. Alapértelmezett szegmens: [[Edzésnapló]]. A [[Gyakorlat]] törzsadat a fejlécből nyílik (fogaskerék), ahogy a [[Mászónapló]] is a fejlécben tartja az admint.
- Flag: a `tab.edzes` fedi az Edzésnaplót és a Gyakorlatot; az `edzes.nyujtas` a nyújtó gyakorlatokat ([[Gyakorlat]]); a [[Heti terv]], [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]], [[Röplabda napló]] saját flaget kap ([[Frontend]] registry). Ki → az adott szegmens rejtve.
- Részletek a gyerek specekben.

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

Közös `hu.bumler.lm2.workout` csomag hostolja mind a hat gyerek entitáscsaládot: `Exercise` ([[Gyakorlat]]), `WorkoutSession` + `ExerciseEntry` + `SetEntry` ([[Edzésnapló]]), `WorkoutPlan` + `PlanExercise` + `PlanSet` és `WeeklyPlan` + `Slot` ([[Heti terv]]), `SwimLog` ([[Úszás napló]]), `BikeRideLog` ([[Biciklizés napló]]), `VolleyballLog` ([[Röplabda napló]]) — mindegyik Controller/Service/Mapper/Repository/SyncDataLoader-rel, Flyway `V17`–`V21` + `V55`, kézzel írt OpenAPI. Nincs szerveroldali kcal-számítás. A részletes szerződés a gyerek specekben.

### Nyitott kérdések

Nincs nyitott kérdés.

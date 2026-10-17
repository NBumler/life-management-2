---
verifikalva: 2026-10-17
verifikalt_commit: b0c6d57
---

# Nyújtás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Heti terv]], [[Edzésnapló]], [[Tápérték kalkulátor]], [[Kezdőlap]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Nyújtó session (`backlog/169`): egy nyújtó sablon (vagy szabadon összeválogatott nyújtások) **vezetett,
időzítős** végigcsinálása, és a naplóba mentése. A nyújtó gyakorlatok törzsadata a [[Gyakorlat]]
(`StretchExercise`), a nyújtó sablonok a [[Heti terv]] (`StretchPlan`) alatt élnek.

A nyújtás **nem terhelő nap**: a terhelés-, blokklimit- és pihenőnap-szabályokban csak a mászás és az
erősítő edzés számít, így egy csak nyújtós nap pihenőnap marad. Kalóriát viszont számol (nettó MET 1.3).

### Funkcionális leírás

#### Entitás — `StretchSession`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja induláskor |
| `date` | Naptári dátum (kliens TZ); az aznapi `activityExtraKcal` kosara |
| `startTime` / `endTime` | Opcionális `HH:mm` |
| `durationMinutes` | Kötelező egész, **1–240** (a plafon miatt egy elgépelés nem fújhatja fel a napi kalóriát) |
| `stretchPlanId` | Opcionális → [[Heti terv]] `StretchPlan` (`null` = szabad / ad-hoc); idegen sablonra 404 |
| `workoutSessionId` | Opcionális → [[Edzésnapló]] `WorkoutSession` — az erősítő edzés, amely után a nyújtás jött (a `backlog/170` csatolt nyújtás tölti); idegenre 404 |
| `notes` | Opcionális |
| `items` | `StretchSessionItem[]` (nested) |
| `deleted` / `createdAt` / `updatedAt` | Soft delete, audit |

#### Entitás — `StretchSessionItem`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `stretchExerciseId` | Opcionális puha link → [[Gyakorlat]] `StretchExercise` |
| `stretchName` / `stretchCategory` | Snapshot (a gyakorlat átnevezése / törlése nem írja át) |
| `orderIndex`, `holdSeconds` (`> 0`), `perSide`, `repetitions` (`≥ 1`) | A végigcsinált tétel paraméterei (sablonból indítva a sablon-tétel másolata) |
| `completed` | `true` = a tétel minden tartása végigment; kihagyott / félbehagyott tétel `false` |

#### Élő, vezetett nézet

- A tételekből lapos fázis-lista készül (`pages/workout/stretch/stretch-timeline.ts`): minden tartás előtt
  egy `STRETCH_TRANSITION_SECONDS = 5` mp-es **„Készülj”** fázis, aztán a **„Tartás”**. Oldalankénti
  tételnél bal, majd jobb oldal; `repetitions`-szer ismételve.
- A visszaszámlálás **falióra-alapú**: a futó fázisnak vége-időpontja van, a 250 ms-os tick ebből számol, így
  háttérbe kerülés után is pontos (egy hosszabb kimaradás több fázison is átléptet, egyetlen jelzéssel).
- Minden fázisváltáskor haptic + rövid hang (`shared/alert-tone.ts` — ugyanaz, mint az [[Edzésnapló]]
  pihenő-időzítőjéé). A nézet alatt a képernyő ébren marad (`shared/screen-wake-lock.ts`, a böngésző
  Screen Wake Lock API-ja; ahol nincs, csendben kimarad).
- Vezérlők: **Szünet / Folytatás**, **Vissza** (az aktuális tétel elejére, ha már ott van, az előzőére),
  **Kihagyás** (a tétel `completed = false`, ugrás a következőre), **+ Nyújtás hozzáadása** (nyújtó picker,
  a tétel a gyakorlat alapértékeivel), **Befejezés**.
- **Befejezés** → összegző: időtartam percben (alapból az indulás óta eltelt idő felfelé kerekítve, 1–240,
  szerkeszthető) és megjegyzés → mentés, majd vissza az Edzésnapló listára. **Elvetés** megerősítéssel
  (semmi nem kerül a naplóba).
- **Piszkozat:** az élő állapot (tételek, aktuális fázis, hátralévő idő, kihagyott tételek) eszközön tárolódik
  (`StretchDraftService`, `@capacitor/preferences`, fázisváltáskor és szüneteltetéskor írva, nem
  tickenként). App-kill / visszalépés után **szüneteltetve** áll vissza. Egyszerre legfeljebb egy nyújtó
  piszkozat van; az erősítő edzés piszkozatától független.

#### Kalória

\[\text{kcal} = 1.3 \times m \times \frac{\text{durationMinutes}}{60}\]

Nettó MET (`STRETCH_NET_MET`, `stretch-metrics.ts`): a Compendium enyhe nyújtásának bruttó 2.3-ja mínusz a
nyugalmi 1 MET (amit a `maintenanceKcal = BMR × 1.2` már tartalmaz) — ugyanaz a konvenció, mint a
[[Röplabda napló]]nál. `m` a [[Profile]] aktuális testsúlya; az időtartam 240 percnél vágódik. Az aznapi
nyújtások összege (`stretchKcalForDay`) beleszámít az `activityExtraKcal`-ba.

### UI/UX elvárások

- **Indítás:** az [[Edzésnapló]] lista „Új nyújtás” gombja (szabad, üres session); a „Terv indítása…” lap
  nyújtó sablonjai („Nyújtás · <név>”); a [[Heti terv]] mai sorának „Nyújtás indítása” gombja, ha a nap
  nyújtó felülírás és aznap még nincs abból a sablonból nyújtás; a terv-gyorsindító „Nyújtás indítása”
  gombja ugyanekkor. Félbehagyott nyújtásnál a listán „Nyújtás folytatása” látszik az „Új nyújtás” helyett.
- **Élő nézet:** felül „N / M”, a nyújtás neve, alatta a sablon-tétel megjegyzése (ennek hiányában a gyakorlat
  leírása), a fázis („Készülj” / „Tartás” · bal / jobb oldal · ismétlés), nagy visszaszámláló (tartás közben
  kiemelt színnel), „Következő: …”. A vezérlők a képernyő alján (thumb-zone).
- **Napló:** az [[Edzésnapló]] lista időrendben (újabb nap elöl) a nyújtó sessionöket is mutatja: „Nyújtás ·
  <sablon>” (sablon nélkül „Szabad”), dátum, nyújtások száma, időtartam, kcal. Tap → utólagos szerkesztő
  (`log/stretch/:id`): dátum, kezdés, időtartam, megjegyzés, tételenként „kész” kapcsoló, törlés
  megerősítéssel. A tétel-lista itt nem bővíthető / rendezhető.
- **Heti nézet:** a nap sorában „Nyújtás” jelvény, ha aznap van élő nyújtó session; múltbeli napon a
  „Pihenő” jelvény mellette megmarad.
- **Kezdőlap:** a „Mai edzések” widget „Nyújtás” sora ([[Kezdőlap]]).
- Feature flag: `edzes.nyujtas` — kikapcsolva nincsenek nyújtó belépők és sorok, a route-ok guardoltak.

### Megjegyzések

#### Tudatos korlát

A nyújtás csak naplózva és kalóriában számít; a terhelés-szabályokban szándékosan nem (a nyújtós nap
pihenőnap). A falióra-alapú időzítő háttérben nem ad hangjelzést — előtérbe kerüléskor egyetlen jelzéssel
pótol (helyi értesítés nincs).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: `pages/workout/stretch/active-stretch.page.*` (élő), `stretch-session-edit.page.*` (utólagos);
  route-ok `tabs/workout/log/stretch/active` (`?stretchPlanId=`, `?workoutSessionId=`) és
  `tabs/workout/log/stretch/:id`, `featureFlagGuard('edzes.nyujtas')`.
- Tiszta logika: `stretch-timeline.ts` (fázisok, előre / vissza, kész tételek), `stretch-timing.ts`
  (időtartam), `stretch-metrics.ts` (kcal); `core/data/activity-kcal.ts` `stretchKcalForDay` — a
  `TodayWorkoutsService`, `TodayNutritionService`, Étkezés dashboard és értesítés-ütemező is ezt adja hozzá.
- Adat: `StretchSessionRepository` (`items()`, `byWorkoutSession()`), `StretchDraftService` (élő piszkozat).

#### Backend-offline

- A session teljesen a helyi store-ból fut és oda ment, Backend-offline és Full-offline is. Az élő
  piszkozat eszköz-lokális (nem outbox-sor) — csak a „Befejezés” ír.
- Mentés: helyi `stretch_session` + `stretch_session_item` (`SCHEMA_V54`) egy tranzakcióban és egy
  `StretchSession` outbox elemben (id-diff, nested aggregate). Ha a sablon, az erősítő session vagy egy
  nyújtó gyakorlat még szinkronizálatlan, az outbox elem arra vár (`dependsOn`). Törlés: soft delete;
  soha nem szinkronizált session → helyi hard remove + outbox purge. Outbox payload v24 (identity — új entitás).
- A kalória, a heti jelvény és a napló-lista csak helyi adatból számol. Sync: [[Szinkronizációs központ]];
  lásd [[Backend-offline first]].

### Backend

- Táblák (`V59`): `stretch_session` (`user_id`, `session_date`, `start_time` / `end_time` `varchar(5)`,
  `duration_minutes` CHECK 1–240, `stretch_plan_id` FK, `workout_session_id` FK, `notes`, soft delete) és
  `stretch_session_item` (`session_id` FK, `stretch_exercise_id` nullable FK, `stretch_name` /
  `stretch_category` snapshot + CHECK, `order_index`, `hold_seconds > 0`, `per_side`, `repetitions ≥ 1`,
  `completed`); mindkettő a `sync_changes` view-ban.
- OpenAPI: `/api/stretch-sessions[/{id}]` nested CRUD. `StretchSessionService.saveTree`
  (`NestedChildResolver`); a csatolt sablon / erősítő session a hívóé kell legyen (különben 404); `POST`
  egy már törölt id-re nem éleszti fel (mint a `WorkoutSession`); `DELETE` → soft delete + tétel-cascade.
- Kalória-oszlop nincs — kliens oldali számítás.

### Nyitott kérdések

Nincs nyitott kérdés.

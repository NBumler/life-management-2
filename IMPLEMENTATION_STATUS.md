# Implementáció státusz

A `documentation/` Obsidian vault a **jelenlegi, implementált állapot** Single Source of
Truth-ja (a kód ellen auditálva — `backlog/audit/ROLLUP.md`; minden specen `verifikalva` /
`verifikalt_commit` frontmatter). Jövőbeli munka — feature, change request, bug — a repo
gyökér `backlog/` jegyrendszerében él.

Ez a fájl már **csak változásnapló**: a lezárt fejlesztési körök (`## Lezárt kör: …`) és a
restructure után lezárt `backlog/` jegyek (`## Lezárt jegyek …`) történeti sorai. A korábbi
"mi kész / mi nincs" state-táblák megszűntek — azt a szerepet a vault (jelenlegi állapot) és a
`backlog/` (nyitott munka) vette át.

Nem spec — nem kell `#### Backend-offline` szekció, nem a `documentation/` vault része.

## Lezárt jegyek (restructure után)

- **2026-09-03 — #063** `db` → `csomag` (`cs`) mértékegység-átnevezés + katalógus darab-definíció
  törtekkel. A `db` quantity-egység mindenütt `cs` (a katalógus csomagokat tárol); a `darab` (`db`)
  **kontextuális** egységként tér vissza, a `Food.pieceAmount` + `pieceUnit` darab-definíción át
  feloldva (`pages/food/food-quantity.ts`), definíció nélkül `1 db = 1 cs`. A Mennyiség mező
  elfogad `N/M` törtet (4 tizedesre kerekítve), a kanonikus egyenlőség 10⁴-gyel skálázott egész.
  3-rétegű adatmigráció: Flyway `V30` · lokális SQLite `SCHEMA_V28` · `OutboxMigrator` v2. A
  bevásárlólistán a `db` nem választható; a teljesítés `cs` egész → N tárolási sor, tört → 1 sor,
  legacy `db` → felfelé kerekít. Érintett specek: [[Mennyiség mező]], [[Névegyediség]],
  [[Élelmiszerek]], [[Élelmiszer manuális bevitele]], [[Élelmiszer tárolás]], [[Recept]],
  [[Étkezés]], [[Élelmiszer forrású étkezés]], [[Bevásárlólista írás]], [[Bevásárlás teljesítve]],
  [[Kaja statisztika]], [[Élelmiszer importálása clipboard-ról]].

## Lezárt kör: dokumentáció ↔ implementáció restructure + 3 RED-javítás (2026-09-02)

A `documentation/` vault átbillentve **jelenlegi-állapot SSOT**-ra + `backlog/` Jira-szerű
feladatrendszer bevezetve. Fázisok:

- **Audit** — állítás-szintű audit mind a 76 `Kész` spec ellen, 14 domén-chunkban
  (`backlog/audit/chunk-NN-*.md` + `ROLLUP.md`). ~1270 állítás, ~91% Implemented; 9 GREEN /
  4 YELLOW / 2 RED chunk + 1 elfogadott kivétel (Google Calendar export → `Váz` + jegy).
- **Jegyek** — minden Missing / Partial / Describes-future találat + a rendszerszintű
  MVP-vágások: `backlog/001`–`062` (8 seed + 54 audit-találat).
- **Spec-átírás** — mind a 76 spec jelen idejű prózára, `verifikalva` / `verifikalt_commit`
  frontmatterrel; „Nem scope (MVP)" blokkok → `backlog/` pointerek; a `Giga feature napló`
  archív fájl törölve.
- **Deklaráció** — `CLAUDE.md` / `README.md` / `Life Management 2.0.md`: a vault a jelenlegi
  implementált viselkedés SSOT-ja, a `backlog/` a nyitott munkáé; ez a fájl elvékonyítva
  változásnaplóvá (a state-táblák megszűntek).

Három tényleges kód-hiba javítva (`fix(frontend)` commit; frontend lint + `ng build`
+ `test:ci` zöld, 1353 teszt):

- **Dark&Light mode** — a `global.scss` csak a `dark.system.css`-t importálta, ezért
  a `ThemeService` `.ion-palette-dark` osztály-toggle-je hatástalan volt: fix „Világos"
  sötét készüléken nem világosított, fix „Sötét" világos készüléken nem sötétített.
  Váltás `dark.class.css`-re (osztály-stratégia), amit a `ThemeService.isDark()` hajt.
- **Naptár** — a napi listáról visszatérve a `calendar-day.page.ts goBack()` a
  megtekintett napból számolta a rács hónapját, ezért szomszédos hónap napjának tapja
  után a rács átugrott. Az eredeti hónap most `?from=YYYY-MM` query paramban utazik
  `openDay` → nap → `goBack` láncon (fallback: a nap hónapja deep linknél).
- **Nyelv választás** — `systemLanguage()` bármely nem-`en` locale-ra `en`-t adott a
  spec által előírt `hu` fallback helyett; javítva + új `language.service.spec.ts`.

## Lezárt kör: post-MVP apró frontend extrák (2026-09-01)

A „Következő kör: post-MVP extrák" tábla két legkisebb, tisztán frontend sora,
egy menetben. Frontend (Karma: 1324 zöld) + `ng build` + lint zöld. Nincs
backend / séma / OpenAPI érintettség, nincs új outbox / sync ág.

- **Naptár hónapváltó swipe gesztus** — `CalendarMonthPage` mostantól `AfterViewInit`/
  `OnDestroy`: `GestureController.create({ el: .month-grid, direction: 'x' }, true)`
  (Angular-zónában futó callback, hogy a `viewYear`/`viewMonth` signal-írás CD-t
  indítson), `onEnd`-ben `|deltaX| ≥ 60px` → balra `nextMonth()`, jobbra
  `prevMonth()`. A `direction: 'x'` miatt az `ion-content` függőleges görgetése
  megmarad (Ionic a `touch-action`-t is `pan-y`-ra állítja). A [[Naptár]] spec (69.
  sor) eddig is „chevron + vízszintes swipe"-ot írt — a kód most éri utol.
- **„Frissítés most" gomb** — `step-tracker.page` HC-szekció `granted` ágába egy
  outline gomb (`STEPS.HC_REFRESH_NOW`, hu+en), `refreshNow()` → `stepSync.syncNow()`
  (ugyanaz a mai-nap + 7 napos backfill, mint app-nyitáskor) majd `repository.load()`
  + a mai `todayInput` újraolvasása, `syncing` signal a dupla-katt ellen. A
  [[Lépésszám átszinkronizálása a Samsung Health-ből]] spec ezt „opcionális, későbbi
  scope"-ként jelölte — most bekerült; a spec „nincs kötelező sync gomb" kitétele
  továbbra is áll (a gomb nem kötelező út, az automatikus app-nyitás marad az
  elsődleges).

## Lezárt kör: Tennivalók (2026-08-25)

A teljes Tennivalók feature elkészült a jóváhagyott terv szerinti sorrendben —
Élet tervek → Háztartási feladatok → Események → Naptár → hub + routing
véglegesítés, mindegyik saját commitban, minden lépés után backend
(Testcontainers) + frontend (Karma + `ng build` template-ellenőrzéssel) +
lint zöld. `hu.bumler.lm2.tasks` backend csomag (4 entitás, saját OpenAPI
végpontokkal, kivéve a Naptárt, aminek nincs saját adata), `pages/tasks/`
frontend fa, teljes offline-sync bekötés mind a 4 entitásra (outbox entity
type, local-rows, sync-engine ágak, SQLite séma v5→v7).

**Tudatosan kihagyva ebből a körből** (a terv "Nem cél" szakasza szerint):
- Értesítések (`HOUSEHOLD_TASK_DUE`, `EVENT_OCCURRENCE`) — külön menetben, amikor
  több más forrás-feature is készen áll, mert az Értesítések egy közös, több
  feature-t kiszolgáló réteg. **Azóta lezárva:** „Lezárt kör: Értesítések"
  (2026-09-01).
- Google Calendar export — a spec is MVP-n kívülinek jelöli, `feladatok.googleExport`
  flag megvan hozzá, alapból kikapcsolva.
- Napi rács swipe gesztus (Naptár hónapváltás) — csak chevron gombok készültek;
  a swipe natív gesztuskezelést igényelne (pl. Ionic Gesture API), ami külön
  belépő nélkül scope-kúszás lett volna. **Azóta lezárva:** „Lezárt kör: post-MVP
  apró frontend extrák" (2026-09-01).

## Lezárt kör: Kaja + Bevásárlás (2026-08-27)

A teljes Kaja feature (Élelmiszerek, Élelmiszer tárolás, Recept, Tápérték
kalkulátor, Étkezés 6a+6b, Kaja statisztika) és a vele domainben kapcsolódó,
de önálló Bevásárlás feature (Bevásárlólista írás, Bevásárlás teljesítve,
Bevásárlás előzmény) mindkettő teljesen elkészült — 9 subfeature egy
jóváhagyott plan-sorozatban, subfeature-önkénti bontásban, mindegyik saját
commitban, minden lépés után backend (Testcontainers, ahol van backend) +
frontend (Karma + `ng build`) + lint zöld.

## Lezárt kör: **Edzés** (2026-08-28–2026-08-31)

A Tennivalók-hoz és a Kaja/Bevásárlás körhöz hasonló méretű "gyors győzelem"
feature-ök elfogytak — az Edzés volt az egyetlen érdemi hátralévő nagy feature-ág.
A0–A6 + a Mászónapló-alkör M0–M8 mind kész és élő, subfeature-önkénti bontásban:

- **A0 — tab-váz** (`e924657`): `/tabs/workout` route + Edzésnapló \| Heti terv \|
  Mászás \| Úszás \| Bicikli felső szegmens (`WorkoutSegmentHeaderComponent` +
  `workout-sections.ts` registry). `tab.edzes` kikapcsolva.
- **A1 — Gyakorlat törzsadat** (`eeb7a44`): `hu.bumler.lm2.workout` /
  `exercise_catalog` (V17) + `pages/workout/exercises/` + `exercise.repository.ts`
  + seed (12 beépített, determinisztikus v5 id) + teljes offline-sync bekötés.
- **A2a — Edzésnapló (backend + data + utólagos szerkesztő)** (`1b4034d`):
  `WorkoutSession` + `WorkoutExerciseEntry` + `WorkoutSetEntry` (V18, háromszintű
  nested aggregate `saveTree`), OpenAPI `/api/workout-sessions`, `pages/workout/log/`
  dashboard + utólagos szerkesztő, `workout-metrics.ts` (MET kcal / Epley / volumen /
  PR / ghost) + spec, `shared/exercise-picker/`, teljes offline-sync bekötés (SQLite
  séma v16).
- **A2b — Edzésnapló élő Active Workout View**: `pages/workout/log/active-workout.page.ts`
  (futó stopper, per-szett rest timer haptic + rövid beep-pel a lejáratkor, PR-badge-ek
  a `detectPrs`-ből, HIIT kör-segédek), `core/data/workout-draft.service.ts` (egyetlen
  élő draft `@capacitor/preferences`-ben — **nem** outbox sor; app-kill után helyreáll;
  csak „Befejezés" enqueue-olja `WorkoutSessionRepository.save`-val), `workout-fields.ts`
  megosztott `visibleFields` / `formatStopwatch` / `nextRestValue` (a szerkesztővel
  közösen), dashboard „folytatás" banner + `active` route. Nincs backend / séma
  változás. Nincs pause / kör-per-kör külön nézet az első körben.
- **A3a — Heti terv (backend)** (`bfae798`): `WorkoutPlan` + `WorkoutPlanExercise` +
  `WorkoutPlanSet` (háromszintű nested aggregate `saveTree`) + `WeeklyPlan` +
  `WeeklyPlanSlot` (kétszintű), V19 migráció (+ a V18-ban halasztott
  `workout_session.plan_id → workout_plan.id` FK), OpenAPI `/api/workout-plans` +
  `/api/weekly-plans`, 5 SyncDataLoader, `sync_changes` view kiegészítés, backend +
  integrációs tesztek. Regenerált Angular kliens is a commitban.
- **A3b — Heti terv (frontend)** (ebben a commitban): `core/data/workout-plan.repository.ts`
  + `core/data/weekly-plan.repository.ts` (read-cache; `WeeklyPlan.id` determinisztikus
  v5), `pages/workout/plan/` (sablon lista + nested szerkesztő) + `pages/workout/weekly-plan/`
  (7 napos dashboard + adherence + „Másolás következő hétre" + `?planId=` gyorsindítás),
  `weekly-plan-adherence.ts` pure modul + spec, teljes offline-sync bekötés (SQLite séma
  v17, `WorkoutPlan` + `WeeklyPlan` outbox entityType, `SyncEngine` drain/pull/tombstone/
  `_needs_refetch` ágak). `edzes.hetiTerv` flag még kikapcsolva.
- **A4 — aktiválás + activityExtraKcal** (`a1ef360` előtt): `tab.edzes` + `edzes.hetiTerv`
  → `true` a `features.json`-ban (az Edzés tab + a Heti terv szegmens most látható);
  `core/data/activity-kcal.ts` (`workoutKcalForDay` — Σ `sessionKcal()` az aznapi élő
  `WorkoutSession`-ökre a Profile aktuális testsúlyával) + spec, bekötve a
  `pages/food/meal/meal-dashboard.page.ts`-be: a `computeTdee` 3. argumentuma most a
  tényleges edzéskalória (eddig fix 0), így a kalória-bar kerete és a másodlagos
  „+N kcal aktivitás" sor él. Lépéskalória továbbra is 0 (a [[Lépésszám követés]]
  feature nincs kész). Nincs backend / séma változás.
- **A5 — Úszás napló** (ebben a commitban): `SwimLog` (V20, lapos user-owned CRUD a
  `LifePlan` mintájára), OpenAPI `/api/swim-logs`, `hu.bumler.lm2.workout` 6 fájl +
  Service/Integration teszt, `pages/workout/swimming/` (lista + create/edit űrlap),
  `swim-metrics.ts` pure modul (`SWIM_MET` / `swimKcal` / `swimDistanceMeters`) + spec,
  `core/data/swim-log.repository.ts`, teljes offline-sync bekötés (SQLite séma v18,
  `SwimLog` outbox entityType, `SyncEngine` drain/pull/tombstone/`_needs_refetch`).
  `edzes.uszas` → `true`; `activity-kcal.ts` `swimKcalForDay` a `workoutKcalForDay`
  mellé adva a Kaja dashboard aktivitás-kalóriájában. Regenerált Angular kliens is
  a commitban.

- **A6 — Biciklizés napló** (ebben a commitban): `BikeRideLog` (V21, lapos user-owned
  CRUD az Úszás napló mintájára, de medence-párosítás nélkül — `distanceKm` +
  `elevationGainMeters` opcionális, független `≥ 0` mezők), OpenAPI `/api/bike-ride-logs`,
  `hu.bumler.lm2.workout` 6 fájl + Service/Integration teszt, `pages/workout/cycling/`
  (lista + create/edit űrlap átlagsebesség + soft MET-javaslattal), `bike-metrics.ts`
  pure modul (`BIKE_MET` / `bikeKcal` / `avgSpeedKmH` / `suggestedIntensity`) + spec,
  `core/data/bike-ride-log.repository.ts`, teljes offline-sync bekötés (SQLite séma v19,
  `BikeRideLog` outbox entityType, `SyncEngine` drain/pull/tombstone/`_needs_refetch`).
  `edzes.bicikli` → `true`; `activity-kcal.ts` `bikeKcalForDay` a `workoutKcalForDay` +
  `swimKcalForDay` mellé adva. Regenerált Angular kliens is a commitban.

### Mászónapló-alkör (2026-08-29–2026-08-31): kész (M0–M8)

17 al-spec, Indoor/Outdoor × Boulder/Kötél, 4 dashboard-belépő, közös
`ClimbingSession` + `AscentAttempt` (+ `PitchLog`) nested aggregate, indoor
(`Gym`/`GymColorBand`/`IndoorRoute`) és outdoor (`Crag`/`Sector`/`Route`/
`BoulderProblem`) törzsadat-fa, nehézségi konverziós mátrix, aktív/passzív MET
kalóriamodell. Külön commit-sorozatban (M0–M8), az Edzés A0–A6 ritmusát követve.

- **M0 — nehézségi skála + konverziós mátrix + mászás-kalória (pure TS alap)**
  (ebben a commitban): `pages/workout/climbing/climbing-grade-matrix.ts` (a
  [[Nehézségi szint skálája (konverziós mátrix)]] SSOT tábla — a fix anchor sorok
  francia/UIAA/YDS/V-skála cellái szó szerint, a Font-oszlop önellentmondó alsó
  cellái szigorúan növekvő, deduplikált létrára rendezve; `gradeToIndex` /
  `colorBandMidIndex`), `grade-scale.ts` (a [[Nehézségi szint skálája]] parser:
  pre-parsing kis/nagybetű + trim, EMPTY/VALID/AMBIGUOUS/UNKNOWN állapotgép, skála-
  regex-ek, csupasz `4`/`5` diszciplína-default vs `6`+ INVALID), `climbing-metrics.ts`
  (a [[Mászónapló]] kanonikus kcal: kísérletenkénti aktív zóna + MET 2.0 rest zóna,
  `pumpMultiplier` lineáris interpoláció, TRAD +6 kg csak az aktív ágon, másodmászó
  dupla 0.8, `durationFallbackMinutes`, `climbingVolume`) — mindhárom + spec, 39 új
  teszt. Nincs wiring: se route, se backend, se flag — a modulok az M1/M4-ben
  kötődnek be. Ha később kell szerveroldali index/kcal-paritás, a mátrix `shared/
  fixtures/`-be emelendő (ma csak kliens-fogyasztó, mint `swim-metrics` / `bike-metrics`).
- **M1 — hub váz + `climbing` szegmens route** (ebben a commitban):
  `pages/workout/climbing/climbing-contexts.ts` (a 4 dashboard-belépő SSOT-ja —
  `INDOOR`/`OUTDOOR` × `BOULDER`/`ROPE` kulcs → relatív route + label key + ikon; a
  `WORKOUT_SECTIONS` climbing-megfelelője, az M4–M8 innen oldja fel a kontextust),
  `climbing-hub.page.ts`/`.html` (a „Mászás" szegmens landing képernyője: 4 csempe
  `ion-list`-ben + fejléc stat/admin gomb; `WorkoutSegmentHeaderComponent` a headerben,
  `current="climbing"`), `app.routes.ts` `climbing` blokk (`featureFlagGuard('edzes.maszonaplo')`,
  csak a `''` hub route — a per-kontextus / stats / admin route-ok a későbbi slice-okban),
  `WORKOUT.CLIMBING` i18n namespace (hu + en), 3 új ikon a `core/config/icons.ts`-ben
  (`business-outline`, `earth-outline`, `stats-chart-outline`), `climbing-contexts.spec.ts`
  (3 invariáns-teszt). `edzes.maszonaplo` marad `false` — a hub a flag bekapcsolásáig
  elérhetetlen; a csempék/fejléc-gombok routerLinkjei a még nem létező slice-route-okra
  mutatnak (a bevett inkrementális minta). Nincs backend, nincs offline-wiring.
- **M2a-i — indoor törzsadat backend** (ebben a commitban): új `hu.bumler.lm2.climbing`
  feature-csomag, három flat, user-owned CRUD resource a bike-ride-log mintára —
  `Gym` (`/api/climbing/gyms`; `name` + `name_normalized` per-user élő egyediség
  `UNIQUE_VIOLATION` + `conflictingId`-vel, `disciplines text[]` ⊆ {BOULDER,ROPE},
  rope-only `default_wall_height_meters` + `available_safety_styles text[]` ⊆ {TOPROPE,LEAD}),
  `GymColorBand` (`/api/climbing/gym-color-bands`; `hex_color` kanonikus alakon egyedi a
  terem élő sávjai közt — új `common/HexColorNormalizer` + `shared/fixtures/
  hex-color-normalization.json` paritásteszt; `variant`, grade alsó/felső + kliens-adta
  `absolute_difficulty_index_lower/upper`), `IndoorRoute` (`/api/climbing/indoor-routes`;
  opcionális termi út-katalógus, névegyediség nélkül). Flyway `V22__climbing_indoor_master.sql`
  (3 tábla + trigger + parciális unique indexek + a `sync_changes` view teljes újraírása a
  `Gym`/`GymColorBand`/`IndoorRoute` sorokkal), hand-written OpenAPI (6 path + 6 schema),
  3 `*SyncDataLoader`. Tesztek: `HexColorNormalizerTest` (fixture-paritás), 3 service unit
  teszt, `ClimbingIndoorMasterIntegrationTest` (idempotens POST, 409 UNIQUE_VIOLATION
  field+conflictingId gym-névre és sáv-hexre, 409 ENTITY_DELETED, cross-user 404, delta
  pull). Se frontend, se offline-wiring, `edzes.maszonaplo` marad `false`.
- **M2a-o — outdoor törzsadat backend** (ebben a commitban): a `hu.bumler.lm2.climbing`
  csomag négy további flat, user-owned CRUD resource-szal — a közös helyszínfa
  `Crag` → `Sector` → (`Route` | `BoulderProblem`), névegyediség nélkül (ugyanaz a
  crag/route név több helyen is előfordulhat). `Crag` (`/api/climbing/crags`; opcionális
  GPS `latitude`/`longitude` + CHECK-tartomány, free-text `default_rock_type`),
  `Sector` (`/api/climbing/sectors`; `crag_id` FK, free-text `default_aspect`),
  `Route` (`/api/climbing/routes`; `sector_id` FK, kötelező `guidebook_grade` nyers
  string — a szerver nem számol grade-indexet —, opcionális `length_in_meters`/
  `total_pitches`/`rock_type`/`aspect` napló-előtöltéshez), `BoulderProblem`
  (`/api/climbing/boulder-problems`; `sector_id` FK, `guidebook_grade`; a master sor
  opcionális, a napló ad-hoc is létrehozhat). Flyway `V23__climbing_outdoor_master.sql`
  (4 tábla + trigger + delta-pull/FK indexek + a `sync_changes` view teljes újraírása a
  `Crag`/`Sector`/`Route`/`BoulderProblem` sorokkal), hand-written OpenAPI (8 path +
  8 schema), 4 `*SyncDataLoader`. Tesztek: 4 service unit teszt,
  `ClimbingOutdoorMasterIntegrationTest` (idempotens POST mind a 4-re, 409 ENTITY_DELETED,
  own-deleted 200 GET, cross-user 404, delta pull mind a 4 entityType-ra). Se frontend,
  se offline-wiring, `edzes.maszonaplo` marad `false`.
- **M2b — session nested aggregate backend** (ebben a commitban): a `hu.bumler.lm2.climbing`
  csomag háromszintű nested aggregate-tel — `ClimbingSession` → `AscentAttempt` → `PitchLog`,
  a `WorkoutSessionService` `saveTree` mintájára (egy `@Transactional` metódus, a válasz
  minden sort visszaad, élőt és tombstone-t is; a bejövő `attempts` / `pitches` a teljes
  kívánt élő fa, a kimaradó gyerekeket a szerver állítja `deleted = true`-ra). Egyetlen lapos
  `climbing_session` tábla, nem polimorf hierarchia: `location_type` (`INDOOR`|`OUTDOOR`) +
  `discipline` (`BOULDER`|`ROPE`) diszkriminátor oszlopok, a kontextus-specifikus mezők
  (`gym_id` vs `crag_id`/`sector_id` snapshot-tal, `weather_conditions` csak outdoor,
  `rock_type`/`aspect`, `pump_rating`/`headspace_rating` 1–5) mind nullable, a kombináció
  helyességét a kliens dönti el (szerver oldalon laza, mint a `workout_set_entry`). `AscentAttempt`:
  `is_success`, nyers `user_raw_input` + kliens-számolt `absolute_difficulty_index` (a szerver
  nem számol), `ascent_style`/`safety_style` enum (utóbbi csak kötél), `failure_point`,
  `attempt_count` (≥1, csak statisztika — nem a duration fallback), `color_band_id`/
  `indoor_route_id`/`route_id`/`boulder_problem_id` opcionális soft-link FK + `*_name`/`color_*`/
  `grade_range` snapshot, `length_in_meters` (kötél), `order_index`. `PitchLog` (csak outdoor
  multi-pitch): `pitch_number`, `is_lead` (`false` = másodmászó), `raw_grade` +
  `absolute_difficulty_index`, `length_in_meters`. A session **nem tárol** `calculatedCalories` /
  volumen mezőt (pure kliens számítás — [[Tápérték kalkulátor]]). `GET/POST /api/climbing/sessions`,
  `GET/PUT/DELETE /api/climbing/sessions/{id}` (idempotens upsert, 409 `ENTITY_DELETED` PUT-ra
  törlés után, cascade soft delete, own-deleted 200 GET). Flyway `V24__climbing_session.sql`
  (3 tábla + trigger + delta-pull indexek + a `sync_changes` view teljes újraírása a
  `ClimbingSession`/`AscentAttempt`/`PitchLog` sorokkal — a két gyerektábla `user_id` nélkül,
  a session-ön keresztül joinolva), hand-written OpenAPI (2 path + 4 schema), 3 `*SyncDataLoader`.
  Tesztek: `ClimbingSessionServiceTest` (10 Mockito unit), `ClimbingSessionIntegrationTest`
  (idempotens POST, diszkriminátor + outdoor mezők verbatim round-trip, PUT fa-csere attempt +
  pitch szinten, 409 `ENTITY_DELETED`, cascade delete + own-deleted 200 GET, cross-user 404,
  delta pull mind a 3 entityType-ra). Se frontend, se offline-wiring, `edzes.maszonaplo` marad
  `false`.

- **M3a — indoor törzsadat admin frontend** (ebben a commitban): a `Gym` + `GymColorBand` +
  `IndoorRoute` backend (M2a-i) teljes frontend + offline-sync bekötése. Új `shared/
  hex-color-normalization.ts` (`normalizeHexColor`) a `common/HexColorNormalizer` párja, a közös
  `shared/fixtures/hex-color-normalization.json` fixture-rel tesztelve (`hex-color-normalization.spec.ts`).
  3 flat repository (`core/data/gym.repository.ts` per-user névegyediség pre-check +
  `GymNameConflictError`; `gym-color-band.repository.ts` termre-scope-olt kanonikus-hex egyediség +
  `GymColorBandHexConflictError` + `forGym()`; `indoor-route.repository.ts` egyediség nélkül +
  `forGym()`), mind a `DataChangeNotifier` post-pull invalidálással. Teljes offline-wiring: SQLite
  séma `v20` (`gym` / `gym_color_band` / `indoor_route` táblák; `disciplines` /
  `available_safety_styles` JSON string a TEXT oszlopban, mint `packing_session.source_template_ids`),
  `local-rows.ts` Row/rowToDto/localWrite/serverApply/tombstone mind a 3-ra, `StorageBackend` +
  `SqliteStorageBackend` (a `GymColorBand`/`IndoorRoute` `dependsOn` a még nem szinkronizált `gym`-re —
  `findLocalOnlyIds('gym', …)`) + `HttpStorageBackend`, `OutboxEntityType` (`Gym`/`GymColorBand`/
  `IndoorRoute`), `OutboxEntityRegistry` (`Gym` névegyediség-mezővel, a másik kettő `null` a scope
  miatt, mint `HouseholdTask`), `SyncEngine` `_needs_refetch` drain + `buildServerApplyTasks` +
  `applyTombstone` (nincs cascade — a sávok/utak saját tombstone-t visznek) + pull `buildApplyTasks`
  ágak. Képernyők `pages/workout/climbing/admin/` alatt: `climbing-admin.page` (Beltéri / Kültéri
  landing; a Kültéri belépő M3b), `gym-list.page`, `gym-edit.page` (ágazat-checkboxok, csak-kötél
  falmagasság + safety-style szekció, beágyazott szín-sáv- és beltéri-út-allisták), `gym-color-band-edit.page`
  (hex pattern + kanonikus-alak egyediség, alsó/felső fokozat a közös `parseGrade`-del → mátrix-index),
  `indoor-route-edit.page` (ágazatonkénti `parseGrade` → index). `app.routes.ts` `climbing/admin` fa,
  `WORKOUT.CLIMBING.{ADMIN_*,DISCIPLINE,SAFETY,VARIANT,GYM,BAND,INDOOR_ROUTE,GRADE_UNPARSED}` i18n (hu + en).
  Regenerált Angular kliens is a commitban (a teljes climbing tag-halmaz — outdoor + session modellek/
  service-ek is bekerülnek, M3b/M4-ig használatlanul). `edzes.maszonaplo` marad `false` — az admin fa a
  flag bekapcsolásáig elérhetetlen. Kliens-tesztek (review-10commits.md E-02, 2026-08-31 pótolva):
  `gym` / `gym-color-band` / `indoor-route` `*.repository.spec.ts` (név- ill. terem-scope-olt hex-ütközés,
  `forGym`, drain-ágak, `DataChangeNotifier` invalidálás) + `gym-edit` / `gym-color-band-edit` /
  `indoor-route-edit` `*.page.spec.ts` (form → `save()` továbbítás, ütközés-jelzés, grade-parse gate).
- **M3b — outdoor törzsadat admin frontend** (ebben a commitban): a `Crag` + `Sector` + `Route` +
  `BoulderProblem` backend (M2a-o) teljes frontend + offline-sync bekötése, az M3a mintáját tükrözve.
  4 flat repository (`core/data/{crag,sector,route,boulder-problem}.repository.ts`) — egyik sem
  névegyediség-ellenőrzött (a helyszínfában ugyanaz a név többször is előfordulhat), `DataChangeNotifier`
  post-pull invalidálással; `SectorRepository.forCrag()` + `RouteRepository.forSector()` +
  `BoulderProblemRepository.forSector()` szűrő-helperekkel. Teljes offline-wiring: SQLite séma `v21`
  (`crag` / `sector` / `route` / `boulder_problem` táblák), `local-rows.ts` Row/rowToDto/localWrite/
  serverApply/tombstone mind a 4-re, `StorageBackend` + `SqliteStorageBackend` (a `Sector` `dependsOn` a
  még nem szinkronizált `crag`-re, a `Route`/`BoulderProblem` a `sector`-ra — `findLocalOnlyIds`
  kiterjesztve `'crag' | 'sector'`-ral) + `HttpStorageBackend`, `OutboxEntityType`
  (`Crag`/`Sector`/`Route`/`BoulderProblem`), `OutboxEntityRegistry` (mind `nameUniqueness: null`),
  `SyncEngine` `_needs_refetch` drain + `buildServerApplyTasks` + `applyTombstone` (nincs cascade) +
  pull `buildApplyTasks` ágak mind a 4-re. Képernyők `pages/workout/climbing/admin/` alatt:
  `crag-list.page`, `crag-edit.page` (opcionális GPS lat/lng + `defaultRockType` + beágyazott
  szektor-allista), `sector-edit.page` (`defaultAspect` + beágyazott út- és boulder-allista),
  `route-edit.page` (`guidebookGrade` szabad szöveg — a szerver szó szerint tárolja, nincs parse —
  + `lengthInMeters`/`totalPitches`/`rockType`/`aspect` napló-előtöltés), `boulder-problem-edit.page`
  (`guidebookGrade`). `climbing-admin.page` Kültéri belépője most élő `routerLink`. `app.routes.ts`
  `climbing/admin/crags` mélyen ágyazott fa, `WORKOUT.CLIMBING.{CRAG,SECTOR,ROUTE,PROBLEM}` i18n (hu + en).
  `edzes.maszonaplo` marad `false`. Kliens-tesztek (review-10commits.md E-02, 2026-08-31 pótolva):
  `crag` / `sector` / `route` / `boulder-problem` `*.repository.spec.ts` (nincs névegyediség, `forCrag`/
  `forSector`, drain-ágak, `DataChangeNotifier` invalidálás) + a 4 `*-edit.page.spec.ts` (form → `save()`
  továbbítás, `guidebookGrade` verbatim, GPS-tartomány gate).

- **M4 — Indoor boulder napló + `ClimbingSession` offline-sync bekötés** (ebben a commitban): a
  `ClimbingSession` → `AscentAttempt` → `PitchLog` háromszintű nested aggregate (M2b backend) teljes
  frontend + offline-sync bekötése, a `WorkoutSession` → `WorkoutExerciseEntry` → `WorkoutSetEntry`
  mintáját tükrözve, plusz a beltéri boulder kontextus-napló (a *reference* flow). SQLite séma `v22`
  (`climbing_session` / `ascent_attempt` / `pitch_log`; `climbing_partners` JSON string TEXT-ben),
  `local-rows.ts` Row/rowToDto/localWrite/serverApply/tombstone (+ gyerekekhez localRemove) mind a
  háromra, `StorageBackend` + `SqliteStorageBackend` (`saveClimbingSession` 3-szintű id-diff
  save-tree, `dependsOn` a még nem szinkronizált `gym`/`crag`/`sector`/`gym_color_band`/`indoor_route`/
  `route`/`boulder_problem` soft-link FK-kra — `findLocalOnlyIds` union kiterjesztve) +
  `HttpStorageBackend`, `OutboxEntityType` (`ClimbingSession`), `OutboxEntityRegistry`
  (`nameUniqueness: null`, nested aggregate → Fix kizárva), `SyncEngine` `_needs_refetch` drain +
  `climbingSessionApplyTasks` (session + attempts + pitches) + `applyTombstone` (cascade a gyerekekre)
  + pull `buildApplyTasks` ágak `ClimbingSession` (cascade) / `AscentAttempt` / `PitchLog`.
  `core/data/climbing-session.repository.ts` (signal-facade, `forContext()`, post-pull invalidálás
  `ClimbingSession`/`AscentAttempt`/`PitchLog` change-type-okra). Képernyők
  `pages/workout/climbing/naplo/` alatt: `climbing-session-list.page` (kontextus a route `data`-ból,
  kártyák siker/kísérlet számmal + élő kcal/volumen), `indoor-boulder-session-edit.page` (dátum +
  boulder-terem picker legutóbbi-terem előtöltéssel + duration/pump/headspace/társak/jegyzet,
  kísérlet-lista szín-sáv chip gyorsválasztással **és** szabad Font/V grade parserrel, siker toggle,
  ascent style, `attemptCount`, élő kcal/volumen lábléc). `app.routes.ts` `climbing/indoor-boulder`
  fa (list / new / :id). `climbing-hub` a nem-bekötött 3 csempét letiltva mutatja
  (`ClimbingContextDef.wired`). `WORKOUT.CLIMBING.{SESSION,ASCENT_STYLE,SOON}` i18n (hu + en).
  `edzes.maszonaplo` marad `false`. Kliens-tesztek: `climbing-session.repository.spec.ts` +
  `indoor-boulder-session-edit.page.spec.ts` + `climbing-contexts.spec.ts` `wired` állítás.

- **M5 — Indoor köteles napló** (ebben a commitban): a 2. kontextus-napló (`INDOOR` + `ROPE`), a
  megosztott `climbing-session-list.page` + saját `indoor-rope-session-edit.page`. Nincs
  offline-wiring / séma / backend változás — a `v22` `ascent_attempt` már hordja a
  `safety_style` / `failure_point` / `indoor_route_id` / `route_name` / `length_in_meters`
  oszlopokat, a `StorageBackend` / `SyncEngine` ágak generikusak. Eltérés a boulder reference-től:
  nincs szín-sáv; kézi francia/YDS grade parser **vagy** opcionális `IndoorRoute` választás /
  ad-hoc `routeName`; `TOPROPE | LEAD` biztosítás-chip (TRAD rejtve, default `LEAD`, a terem
  `availableSafetyStyles` beállítására szűkítve); opcionális `lengthInMeters` a terem
  `defaultWallHeightMeters` defaulttal; sikertelen kísérletnél opcionális `failurePoint`; nincs
  PitchLog; duration fallback kísérlet × 15 perc (a `climbing-metrics` intézi). `climbing-contexts`
  `indoor-rope` → `wired: true` + `app.routes.ts` `climbing/indoor-rope` fa (list / new / :id).
  `WORKOUT.CLIMBING.SESSION` i18n bővítés (hu + en): a boulder-specifikus `EMPTY` / `NEW_TITLE`
  generikussá téve, új `NO_ROPE_GYM` / `FIELD_ROUTE` / `ROUTE_PLACEHOLDER` / `FIELD_ROUTE_NAME` /
  `FIELD_GRADE_ROPE` / `GRADE_PLACEHOLDER_ROPE` / `FIELD_LENGTH` / `FIELD_SAFETY` /
  `FIELD_FAILURE_POINT`. `edzes.maszonaplo` marad `false`. Kliens-tesztek:
  `indoor-rope-session-edit.page.spec.ts` (8) + frissített `climbing-contexts.spec.ts` `wired` állítás.

- **M6 — Outdoor boulder napló**: a 3. kontextus-napló (`OUTDOOR` + `BOULDER`), a
  megosztott `climbing-session-list.page` + saját `outdoor-boulder-session-edit.page`. Nincs
  offline-wiring / séma / backend változás — a `v22` `climbing_session` már hordja a
  `crag_id` / `crag_name` / `sector_id` / `sector_name` / `rock_type` / `aspect` /
  `weather_conditions` oszlopokat, a `ascent_attempt` a `boulder_problem_id` / `route_name`
  oszlopokat; a `StorageBackend` / `SyncEngine` ágak generikusak (a `dependsOn` a még nem
  szinkronizált `crag` / `sector` / `boulder_problem` soft-link FK-kra már M4 óta be van kötve).
  Eltérés a boulder reference-től: `Crag` + `Sector` helyszín-picker snapshot nevekkel (gym helyett);
  opcionális master `BoulderProblem` választás **vagy** ad-hoc név opcionális „mentés a katalógusba"
  kapcsolóval (a `BoulderProblemRepository.save` a kiválasztott szektor alá, csak ha van szektor);
  session-szintű `rockType` (crag default, felülírható — nincs attempt-szintű mező); a szektorból
  öröklődő `aspect`; `weatherConditions` chip (`COLD_DRY` / `HOT_HUMID` / `WINDY` / `WET`); nincs
  szín-sáv, nincs PitchLog; grade parser Font/V; duration fallback kísérlet × 5 perc. A megosztott
  `climbing-session-list.page` kártya-alcíme `gymName || cragName || NO_VENUE`-ra bővítve (mind a 4
  kontextusra jó). `climbing-contexts` `outdoor-boulder` → `wired: true` + `app.routes.ts`
  `climbing/outdoor-boulder` fa (list / new / :id). `WORKOUT.CLIMBING` i18n bővítés (hu + en): új
  `WEATHER` blokk + `SESSION` alatt `NO_VENUE` / `NO_CRAG` / `FIELD_CRAG` / `CRAG_PLACEHOLDER` /
  `CRAG_REQUIRED` / `FIELD_SECTOR` / `FIELD_ROCK_TYPE` / `FIELD_ASPECT` / `FIELD_WEATHER` /
  `FIELD_PROBLEM` / `PROBLEM_PLACEHOLDER` / `FIELD_PROBLEM_NAME` / `SAVE_TO_CATALOG`.
  `edzes.maszonaplo` marad `false`. Kliens-tesztek: `outdoor-boulder-session-edit.page.spec.ts` (9) +
  frissített `climbing-contexts.spec.ts` `wired` állítás.

- **M7 — Outdoor köteles napló**: a 4. és utolsó kontextus-napló (`OUTDOOR` +
  `ROPE`), a megosztott `climbing-session-list.page` + saját `outdoor-rope-session-edit.page`. Nincs
  offline-wiring / séma / backend változás — a `v22` `climbing_session` / `ascent_attempt` /
  `pitch_log` már mindent hordoz, a `StorageBackend` / `SyncEngine` ágak (a `dependsOn` a még nem
  szinkronizált `crag` / `sector` / `route` soft-link FK-kra) generikusak. A form az outdoor boulder
  napló helyszín-részét (`Crag` + `Sector` picker snapshot nevekkel, session-szintű
  `rockType` / `aspect`, `weatherConditions` chip, opcionális master `Route` **vagy** ad-hoc név
  „mentés a katalógusba" kapcsolóval — `RouteRepository.save` a kiválasztott szektor alá) kombinálja
  az indoor köteles napló köteles részével (francia/YDS grade parser, `TOPROPE` \| `LEAD` \| `TRAD`
  safety chip, `lengthInMeters`, `failurePoint` bukott kísérletnél). Új: opcionális kísérletenkénti
  `PitchLog` szerkesztő (`pitchNumber` auto, `isLead` toggle — `isLead=false` → aktív MET ×0.8 a
  kliens kcal-ban, `climbing-metrics` már kezeli; `rawGrade` → per-pitch index parse; `lengthInMeters`;
  ha üres a lista, elég a session + teljes úthossz). Öröklési sorrend `rockType` / `aspect`-re: kiválasztott
  `Route` saját értéke → különben `Sector` / `Crag` default → session szinten mindig felülírható. TRAD
  a `climbing-metrics` aktív ágában +6 kg. `climbing-contexts` `outdoor-rope` → `wired: true` (mind a
  4 csempe él) + `app.routes.ts` `climbing/outdoor-rope` fa (list / new / :id). `WORKOUT.CLIMBING`
  i18n bővítés (hu + en): `SAFETY.TRAD` + `SESSION` alatt `FIELD_OUTDOOR_ROUTE` /
  `OUTDOOR_ROUTE_PLACEHOLDER` / `PITCHES` / `ADD_PITCH` / `PITCH_N` / `PITCH_LEAD` / `PITCH_GRADE` /
  `PITCH_LENGTH` / `REMOVE_PITCH`. `edzes.maszonaplo` marad `false`. Kliens-tesztek:
  `outdoor-rope-session-edit.page.spec.ts` (13) + frissített `climbing-contexts.spec.ts` `wired` állítás.

- **M8 — Mászó statisztikák + a Mászónapló-alkör lezárása** (ebben a commitban): a
  [[Mászónapló]] "Statisztikák (2.0 scope)" képernyő + a `edzes.maszonaplo` flag
  bekapcsolása + a mászás-kalória bekötése a Kaja dashboardba. `pages/workout/climbing/
  climbing-stats.ts` (pure TS, se DOM, se Angular — mint `weekly-plan-adherence.ts` /
  `catalog-ratios.ts`): `computeClimbingStats(sessions, periodDays, today)` kontextusonként
  (mind a 4 dashboard-belépőre, `CLIMBING_CONTEXTS` sorrendben) — **összesített** max
  fokozat (a legnehezebb *sikeres* kísérlet `absoluteDifficultyIndex`-e, a `userRawInput`
  címkéjével), **összesített** volumen (`climbingVolume()` a session-ök felett, ugyanaz a
  per-kísérlet `mászott méter × I` / `4 m × I` modell, mint a napló élő előnézete),
  **összesített** sikerarány (minden naplózott kísérlet Onsight / Flash / Redpoint /
  Sikertelen bontásban — a stílus nélküli siker redpointnak számít) — és az **egyetlen
  időszak-szűrt** mutató: a 30 / 90 / 365 napos grade-piramis (sikeres bemászások mátrix-
  index szerinti bucketekbe, legnehezebb felül). `stats/climbing-stats.page.ts`/`.html`/
  `.scss` (period `ion-segment` + kontextusonkénti `ion-list` szekció, `ion-progress-bar`
  piramis-sávok; a hub fejléc chart gombja már ide mutatott), `app.routes.ts` `climbing/
  stats` route (nincs külön flag — a `climbing` fa `edzes.maszonaplo` guardja alatt).
  `core/data/activity-kcal.ts` új `climbingKcalForDay` (a `bikeKcalForDay` mintájára —
  `climbingKcal()` a session `discipline`-jével, aktív/passzív MET, nem `duration × MET`),
  bekötve a `meal-dashboard.page.ts` `workoutExtraKcal` computedjébe a `workoutKcalForDay` +
  `swimKcalForDay` + `bikeKcalForDay` mellé (+ a repo `load()` és a spec provider-stub).
  `WORKOUT.CLIMBING.STATS_PAGE` i18n blokk (hu + en, 11 kulcs). **`edzes.maszonaplo` →
  `true`** a `features.json`-ban — ezzel a teljes Mászás szegmens (felső szegmens-gomb +
  hub + 4 kontextus-napló + admin-fa + statisztikák) élővé válik; a `tab.edzes` függőség
  már teljesült, a `validateFeatureFlags` nem borul. Nincs backend / Flyway / SQLite séma /
  offline-sync változás. Kliens-tesztek: `climbing-stats.spec.ts` (8, pure modul) +
  `climbing-stats.page.spec.ts` (3, view-model) + `activity-kcal.spec.ts` `climbingKcalForDay`
  blokk (2).

- **M8 után — review-fixek (7 finding, ebben a commitban):** a lezárt alkör
  kód-review-jának észrevételei, korrektségi hiba / tárolt-adat- vagy sync-törés
  nélkül. **(1)** A közös `climbing-session-list.page` kcal/volumen most a
  `pitches`-t is átadja — multi-pitch outdoor-köteles session a lista-kártyán is a
  pitch-hosszak összegével számol, egyezésben a szerkesztő élő előnézetével, a
  statokkal és a Kaja dashboard `climbingKcalForDay` összegével. **(6)** Új
  `pages/workout/climbing/climbing-attempt-input.ts` (`climbingAttemptInput`):
  egyetlen `AscentAttempt → ClimbingAttemptInput` adapter, amit a lista, a
  `climbing-stats.ts` és az `activity-kcal.ts` is használ (a korábbi három
  külön másolat helyett; a `climbing-metrics.ts` API-model-mentes marad). **(3)**
  A „nem értelmezhető fokozat" ad-hoc figyelmeztetés (`WORKOUT.CLIMBING.GRADE_UNPARSED`,
  `gradeUnparsed()` / `pitchGradeUnparsed()`) helyét átvette a teljes shared
  grade-beviteli komponens — lásd a **Szín-sáv / fokozat input kör** szakaszt lent
  ([[Nehézségi szint skálája]] `GradeInputComponent`: badge + kétértelműség-chipek +
  súgó modal + inline hiba, a közös `HelpInputComponent` fölött). **(4)** „Legalább
  idő vagy kísérlet" kereszt-mező validáció mind a 4 formban (`minFieldsMet`
  computed, gate-eli a `save()`-et és a Mentés gombot, `WORKOUT.CLIMBING.SESSION.MIN_FIELDS`
  jelzés) — a spec (`Indoor boulder napló.md`) „minimális kötelező: dátum + terem +
  legalább idő vagy kísérletek" elvárása. **(5)** Halott „SOON" ág törölve:
  `ClimbingContextDef.wired` mező, a `climbing-hub` `@else` disabled-csempéje +
  `IonNote` import, a `WORKOUT.CLIMBING.SOON` kulcs (hu + en), a
  `climbing-contexts.spec.ts` `wired` állítása (a tab-registry + feature flag
  routing szinten kezeli a „nincs kontextus" esetet, a `wired` M4–M7 alatti
  állványzat volt). **(2 + 7)** `Mászónapló.md` pontosítva: az `attemptCount`
  tájékoztató mező — sem a Volumen-, sem a sikerarány-képlet **nem szoroz vele**
  (mindkettő attempt-soronként számol), csak a statisztikai nézetek jeleníthetik
  meg; a „Statisztikák" sor szövege a tényleges Onsight / Flash / Redpoint /
  Sikertelen bontásra igazítva (a `Edzés.md` spec-commit hash nem mozdul, csak a
  `Mászónapló.md` al-spec). Új teszt: `climbing-attempt-input.spec.ts` (4). Nincs
  backend / Flyway / SQLite séma / offline-sync változás; `lint` tiszta, `test:ci`
  1110/1110.

Mászónapló-alkör: **kész (M0–M8 + review-fixek)**. Ezzel az [[Edzés]] feature is
lezárult (Edzésnapló + Heti terv + Úszás + Bicikli + Mászónapló mind kész és élő).

### Szín-sáv / fokozat input kör (2026-08-31): kész

A [[Nehézségi szint skálája]] „egységes nehézség-beviteli komponens" célállapota
megvalósítva, a korábbi ad-hoc `GRADE_UNPARSED` note helyett:

- **Új közös `HelpInputComponent`** (`shared/help-input/`, `app-help-input`) — buta
  prezentációs héj: `ion-input` + záró badge + súgó-ikon gomb (`AlertController`,
  i18n kulcs) + inline hiba-`ion-note`, `[value]` / `(valueChange)` + `[chips]`
  projekció. Kompozíció, nem ősosztály.
- **`QuantityInputComponent` refaktor** — a saját `ion-input` + súgó markup helyett
  `app-help-input`-ot komponál; viselkedés bitre azonos, a spec zöld.
- **Új `GradeInputComponent`** (`shared/grade-input/`, `app-grade-input`) — CVA +
  `[value]`/`(valueChange)` kettős API, `@Input() discipline`. Badge (`FRA`/`YDS`/
  `UIAA`/`FONT`/`V`, ill. `?`), kétértelműség-chipek (`candidates` → koppintásra
  feloldás), súgó modal (`SHARED.GRADE_INPUT.HELP_*`), inline hiba
  (`SHARED.GRADE_INPUT.ERROR_UNKNOWN` / `_AMBIGUOUS`), 250 ms debounce csak a
  vizuális deriváción (a form-érték minden leütésre propagál).
- **Parser áthelyezés** — `grade-scale.ts` + `climbing-grade-matrix.ts` (+ specek)
  `pages/workout/climbing/` → `shared/climbing/` (a `shared/` nem függhet
  `pages/`-től); importfix `climbing-contexts` / `climbing-metrics` / 6 page.
- **Bevezetés** — `admin/gym-color-band-edit` (alsó/felső fokozat),
  `admin/indoor-route-edit` (ágazatfüggő `disciplineValue()`), mind a 4
  `naplo/*-session-edit` (kísérlet + outdoor-köteles per-pitch). A `parseGrade`
  a `save()` gate-ekben / index-feloldásban marad; a `gradeUnparsed()` /
  `pitchGradeUnparsed()` helperek törölve, `WORKOUT.CLIMBING.GRADE_UNPARSED` i18n
  kulcs törölve (hu + en), `SHARED.GRADE_INPUT.*` hozzáadva.
- Nincs backend / Flyway / SQLite séma / OpenAPI / offline-sync változás. Új
  tesztek: `help-input.component.spec.ts`, `grade-input.component.spec.ts`;
  `lint` tiszta, `test:ci` 1125/1125.

## Lezárt kör: **Pénzügyek** (2026-08-31)

A teljes Pénzügyek feature elkészült a jóváhagyott terv szerinti sorrendben,
három slice-ban, mindegyik saját commitban, minden lépés után backend
(Testcontainers, ahol van backend) + frontend (`npm run build` + `test:ci`) +
`lint` zöld:

- **P1 — Rendszeres kiadások** (`a97f08f`): új `hu.bumler.lm2.finance` csomag
  (első `finance` package), `RecurringExpense` lapos user-owned CRUD az [[Úszás
  napló]] / [[Biciklizés napló]] mintájára, Flyway `V25`, kézzel írt OpenAPI
  (2 path + 2 schema), regenerált Angular kliens. `recurring-expense-math.ts`
  pure TS SSOT (`monthlyEquivalentHuf` / `addPeriod` / `countsInMonthlyEquivalent`
  / `classifyExpenseSection` / `dayLag`), lista + szerkesztő oldal, teljes
  offline-sync bekötés (`RecurringExpense` outbox entityType, SQLite séma v23),
  `finance/recurring-expenses` route `featureFlagGuard('menu.penzugyek')`-kel.
- **P2 — Nettó fizetés kalkulátor** (`d2341b5`): tisztán kliens, nincs backend /
  OpenAPI / offline-wiring. `shared/net-pay-calculator.ts` (`TB_RATE` 0.185 /
  `SZJA_RATE` 0.15 / 25-alatti SZJA-plafon `715_765` + `computeNetPay`),
  `ageInYears` kiemelve a `tdee-calculator.ts`-ből közös `shared/local-date.ts`
  helperré, `net-pay.page` read-only bontás, `finance/net-pay` route.
- **P3 — hub + Menü-pont** (ebben a commitban): `finance-dashboard.page` (3 kártya:
  Nettó / Havi kiadások / Maradék, mind szám vagy `~`), `finance` index route,
  `menu.page` Pénzügyek-pont (`menu.penzugyek` flag). A hub tisztán fogyasztó —
  a képleteket a gyerek utility-kből importálja, nem másolja. `menu.penzugyek`
  már eddig is `true` volt a `features.json`-ban.

**Tudatosan kihagyva ebből a körből** (a specek "Nem scope" szerint): közelgő
fizetés-értesítés ([[Értesítések]] későbbi típus, forrás: [[Rendszeres kiadások]]),
`WEEKLY` / tetszőleges interval, auto-roll app-nyitáskor, `endDate`, duplikálás,
undelete, naptár-producer, AYCM mező / FK ezen a táblán (a `linkedRecurringExpenseId`
kötés az [[AYCM tracker]] spechen él, nem itt), NAV-pontos adó, családi / egyéb
kedvezmény, what-if bruttó, szerveroldali nettó vagy havi ekvivalens.

## Lezárt kör: **AYCM tracker** (2026-08-31)

A teljes AYCM tracker feature (hub + AYCM elfogadóhely hozzáadása + AYCM Check-In
+ AYCM Statisztikák) elkészült a jóváhagyott terv szerinti sorrendben, négy
slice-ban, mindegyik saját commitban, minden lépés után backend (Testcontainers,
ahol van backend) + frontend (`npm run build` + `test:ci`) + `lint` zöld:

- **AY1 — elfogadóhely + árszabály** (`2fd4d09`): `hu.bumler.lm2.aycm` csomag,
  `AycmPartner` + `AycmPriceRule` (Flyway `V26`), kézzel írt OpenAPI (4 path +
  4 schema), `aycm-price-rule.ts` pure TS (`minutesOfDay` / `displayLabel` /
  `rulesOverlap` / `matchPriceRule`), partner-lista + szerkesztő (inline
  ársáv-lista, kliens+szerver overlap-check), teljes offline-sync bekötés
  (SQLite séma v24), `aycm/partners` route-fa. Regenerált Angular kliens is
  a commitban.
- **AY2 — Check-In** (`781b40c`): `AycmCheckIn` lapos user-owned CRUD (Flyway
  `V27`), napi egyediség `(user_id, check_in_date) WHERE deleted = false`
  partial unique → `409 UNIQUE_VIOLATION`, snapshot oszlopok. Egy űrlap (nincs
  lista): partner-picker + dátum (múlt/jövő szabad) + **Most** gomb, reaktív
  `matchPriceRule` előnézet (zöld/sárga+0 Ft), `?date=` deep-link. Teljes
  offline-sync bekötés (`nameUniqueness: null`, SQLite séma v25). Regenerált
  Angular kliens is a commitban.
- **AY3 — `AycmSettings` singleton + Statisztikák** (`749f81b`): `AycmSettings`
  1:1-user singleton (Flyway `V28`) a `UserProfile` mintájára — `GET` lazy
  `{ id: v5(userId), linkedRecurringExpenseId: null }` (200, nem 404), `PUT`
  upsert a determinisztikus id-ra; új `common/DeterministicUuid.v5` a frontend
  `uuid.ts` byte-pontos tükre. `aycm-pass-cost.ts` (`passCostComputable` /
  `passCostHuf` / `worthItHuf` — `monthlyEquivalentHuf` import, nem másolat),
  `aycm-stats.ts` (3-preset ablak + `filterCheckIns` / `summarize` /
  `groupByPartner` / `visitList`), `aycm-stats.page` read-only képernyő.
  `AycmSettings` singleton offline-ág (`_needs_refetch` re-pull, 2-arg
  tombstone, SQLite séma v26). Regenerált Angular kliens is a commitban.
- **AY4 — hub + Menü-pont** (ebben a commitban): `aycm-dashboard.page` (4 kártya:
  E havi látogatások / E havi érték / Megéri-e / Bérlet, mind szám, `0 Ft`, vagy
  `~`; FAB → Check-In; Bérlet-picker action-sheet), `aycm` index route,
  `menu.page` AYCM-pont (`menu.aycm` flag). `recurring-expense-edit.page`
  bővítése: `?returnTo` query param → mentés után oda navigál a friss
  `RecurringExpense.id`-t `createdExpenseId`-ként átadva; a hub `?createdExpenseId=`
  esetén auto-`linkExpense` + param-strip. A hub tisztán fogyasztó — nincs új
  entitás / OpenAPI / offline-wiring.
- **Code-review follow** (ebben a commitban): a 4 AYCM commit `/code-review`-ja
  után 9 észrevétel javítva. Frontend: (1) törölt-partneres Check-In szerkesztése
  már nem építi újra a snapshotot élő-only adatból — `snapshotFrozen` állapot, a
  sor fagyott (csak `notes`), a picker élő partnerre válthat; (2) `ensureRulesLoaded`
  feltétel nélkül tölt (stale ársáv-cache → rossz 0 Ft snapshot); (3) `now()` nem
  írja felül a mai sor idejét, ha már azon állunk; (4) AYCM hub / statisztika /
  Check-In `ionViewWillEnter` minden belépéskor újratölti a repókat (sync-pull
  után frissül); (5) `SyncEngine.applyTombstone` `AycmPartner`-DELETE drain után
  lokálisan is tombstone-olja a cascade árszabály-sorokat (`_dirty` clear, mint
  `HouseholdRoom`→task); (6) `recurring-expense-edit` `?returnTo` csak create
  módban él. Backend: (7) `AycmPriceRuleService` `get`/`update`/`delete`/`create`
  ellenőrzi, hogy a szabály a path `{id}` partnerhez tartozik → 404 (OpenAPI
  szerződés); (8) `idx_aycm_settings_user_id` (`V28`) bekötve a
  `GlobalExceptionHandler` unique-index → mező map-jébe (409 `UNIQUE_VIOLATION`,
  nem 500) + race-teszt; (9) `AycmPriceRule.yaml` `endTime` regex zárójelezve
  (`^(…|24:00)$`). Backend + frontend + lint zöld. Nyitva hagyva: a web
  `HttpStorageBackend` mindig POST-tal upsertel (nem PUT edit-re) — ez az egész
  online-only web build ~25 entitáson egységes, dokumentált viselkedése
  (`POST` létező id-ra idempotens upsert, sosem 409), nem AYCM-regresszió.

**Tudatosan kihagyva ebből a körből** (a specek "Nem scope" szerint): hivatalos
AYCM-import / partner-API / térkép / cím-mező; éjfélen átnyúló ársáv; több
belinkelt kiadás; több Check-In / naptári nap; naptár-producer; értesítés;
4. gyerek; diagram a statisztikában; custom dátumtartomány / YTD / all-time;
partner `active`; szabály-duplikálás; seed; undelete; inline partner-create a
Check-Inről.

## Lezárt kör: **Lépésszám követés** (2026-09-01)

A [[Lépésszám követés]] feature mindkét gyereke elkészült, egy jóváhagyott
plan-nal, két slice-ban (L1 manuális → L2 Health Connect), minden lépés után
backend (Testcontainers) + frontend (Karma + `ng build`) + lint zöld.

- **L1 — manuális `DailyStepLog`** (`a98d897`): `hu.bumler.lm2.steps` backend
  csomag (lapos user-owned CRUD, determinisztikus v5 id `(userId, date)`, POST
  törölt napra revive, `V29` + parciális unique index + `sync_changes` view),
  OpenAPI + regenerált Angular kliens, teljes frontend offline-sync bekötés
  (SQLite séma v27, `DailyStepLog` outbox entityType, `SyncEngine`
  drain/pull/tombstone/`_needs_refetch` ágak), `daily-step-log.repository.ts`
  (`saveManual` mindig felülír, `maxWinsUpsert` csak nagyobb), `activity-kcal.ts`
  `stepKcalForDay` SSOT a Kaja dashboard `workoutExtraKcal`-jába kötve,
  `pages/menu/steps/` (tracker + per-nap editor), `steps` route-fa +
  `menu.lepesszam` Menü-pont + i18n.
- **L2 — Health Connect sync** (kliens-oldal, `7f9b886`): `core/health/` —
  `activity-step-sync.service` (app-nyitás + `App` `resume` → mai nap + 7 napos
  hiánypótló backfill csak a `DailyStepLog`-gal nem rendelkező napokra,
  `datesNeedingBackfill` pure modul), `health-connect.plugin.ts`
  (`registerPlugin('HealthConnectSteps')` TS-szerződés),
  `health-connect-step-source.service` (hibanyelő wrapper, web → no-op),
  `main.ts` bootstrap-hook, `step-tracker.page` engedély/„utolsó sync" státusz-sáv,
  AndroidManifest (`health.READ_STEPS` + rationale activity-alias + `<queries>`).
- **L2 — natív Android Health Connect modul**: `android/.../health/HealthConnectStepsPlugin.kt`
  app-lokális Capacitor plugin `androidx.health.connect:connect-client:1.1.0`-val
  (`getSdkStatus` availability, `permissionController.getGrantedPermissions()` /
  `createRequestPermissionResultContract()` a READ_STEPS grantre,
  `aggregate(StepsRecord.COUNT_TOTAL, TimeRangeFilter.between(...))` a napi totálra),
  `MainActivity.onCreate` `registerPlugin(...)`. Kotlin bekötve az app-modulba
  (`kotlinVersion` + `androidxHealthConnectVersion` a `variables.gradle`-ben,
  `org.jetbrains.kotlin.android` plugin), `uses-sdk tools:overrideLibrary` +
  `SHOW_PERMISSIONS_RATIONALE` intent-filter a manifestben. `./gradlew
  :app:assembleDebug` zöld, a plugin + a HC SDK osztályok benne a debug APK dex-ében.

**Tudatosan kihagyva ebből a körből:**
- **On-device funkcionális próba valós Samsung Health adattal** — a natív modul
  fordul és csomagolódik, de egy telefonon, valódi Health Connect provideren,
  engedélyezett READ_STEPS-szel még nem futott végig a mai-nap + backfill kör.
  A `scripts/install-android.ps1` telepíti a debug APK-t; a próba az első
  eszközön-futtatáskor zárható le.
- **Valódi 08:00 `WorkManager` háttér-worker** — nincs `@capacitor/background-runner`
  (külön JS-kontextus, nulla DI/unit-tesztelhetőség); az app-open backfill a
  tartalék, ami garantálja, hogy egy nap se vesszen el véglegesen.
- **`STEPS_LOW` értesítés** (20:00, mai < 2000) — az [[Értesítések]] körrel jön.
- **„Frissítés most" gomb** — a spec későbbi scope-nak jelölte; **azóta lezárva:**
  „Lezárt kör: post-MVP apró frontend extrák" (2026-09-01).
- **iOS Health** — a spec is későbbi scope-nak jelöli.

## Lezárt kör: **Értesítések** (2026-09-01)

A [[Értesítések]] feature egy jóváhagyott terv szerint, egy menetben elkészült;
minden lépés után frontend (Karma + `ng build`) + lint + `./gradlew
:app:assembleDebug` zöld. Tisztán kliensoldali, natív-only (web = no-op).

- **`@capacitor/local-notifications@8`** hozzáadva, `npx cap sync android`,
  AndroidManifest `POST_NOTIFICATIONS` + `SCHEDULE_EXACT_ALARM`.
- **`core/notifications/`** új csomag:
  - `notification-types.ts` — a 6 típus + `NOTIFICATION_SOURCE_FLAG` (melyik
    feature flag fedi), `DesiredNotification` alak.
  - `notification-rules.ts` — **pure** döntési réteg, típusonként egy függvény
    (spec §1–§6): lead-window 3 vs 2 nap, `< 2000` lépés, `+750 kcal × 5 nap`
    sorozat, 1-vs-N háztartási digest, esemény `startTime` / egész napos 09:00 +
    múltbeli előfordulás kihagyása. Táblázatos unit-tesztek (`notification-rules.spec.ts`).
  - `notification-scheduler.service.ts` = **`NotificationScheduler`** root service
    (Frontend.md L78): újraértékel minden triggerre (cold start, `App` resume,
    forrás repo-signal + `DataChangeNotifier` mutáció, típus-kapcsoló, nyelvváltás,
    mind egy debounce-olt `effect`-en), reconcile a `getPending()` ellen — múltbeli
    esedékes → azonnali fire + dedup-napló, jövőbeli → `schedule.at`, elavult →
    `cancel`. Registry (`@capacitor/preferences` `lm2_notifScheduled`) tartja a
    jövőbeli id → `{type,key,fireAt,lang}` leképezést; nyelvváltáskor a `lang`
    eltérés kényszerít cancel+újraütemezést.
  - `notification-dedupe.store.ts` — „már elküldve" napló (`lm2_notifDedupe`),
    típus+kulcs+nap; a `FOOD_SPOILED_ONCE` kulcsában nincs nap (élettartam/1).
    Nyelvváltáskor **nem** ürül; 35 napnál régebbi bejegyzések takarítva.
  - `notification-ids.ts` — determinisztikus 31-bites int id `hash(type|key)`-ből
    (a plugin számot vár), így az újraütemezés idempotens csere.
  - `notification-settings.service.ts` — device-local típus-kapcsolók
    (`lm2_notifications`), `ThemeService`/`LanguageService` minta, mind alapból be;
    **nem** feature flag, **nem** syncel.
  - `local-notifications.gateway.ts` — vékony injektálható wrapper a plugin köré
    (a Capacitor `registerPlugin` Proxy-ja `spyOn`-olhatatlan, mint a
    `HealthConnectStepSource`-nál); a scheduler ezen keresztül hív, a spec ezt
    mockolja.
- **`pages/menu/notifications/`** — típus-kapcsoló lista (csak a bekapcsolt
  forrás-flaggel rendelkező típusok), „mikor szól" magyarázó, engedély-megtagadva
  sáv + „Engedélyezés", web → „csak mobil" üzenet. `notifications` route
  `featureFlagGuard('menu.ertesitesek')`-kel, `menu.page` Menü-pont, i18n (hu + en).
- **Bekötés:** `main.ts` cold-start 6. lépés `void notificationScheduler.init()`
  (nem awaitolt, mint a `stepSync`), `login.page` re-invoke in-session login után,
  `App` `resume` listener, tap → `router.navigateByUrl(extra.route)`.

**Tudatosan kihagyva ebből a körből:**
- **Valódi 08:00 / 20:00 háttér-worker** — nincs `@capacitor/background-runner`.
  Következmény: ha az app egy adott nap meg sem nyílik, a fix-idős értesítés
  (`STEPS_LOW`, `CALORIE_STREAK`, `HOUSEHOLD_TASK_DUE`, `FOOD_*`) aznap kimaradhat;
  a következő app-open azonnal fire-öli, ha még releváns és nincs dedupálva. Ez a
  „app-open a tartalék" tradeoff, ugyanaz, mint a Health Connect lépés-syncnél.
  **Ez a következő javasolt feladat, lásd lent.**
- **Lead-time szerkesztő**, **értesítés-előzmény lista** — **azóta lezárva:**
  „Lezárt kör: Értesítés-előzmény + Lead-time szerkesztő" (2026-09-01).
- **Remote push (FCM/APNs)** — a spec is későbbi scope-nak jelöli.
- **On-device funkcionális próba** — a debug APK fordul és csomagolja a plugint;
  valós telefonon (engedélykérés, 09:00/20:00 fire, tap → route) még nem futott.

## Lezárt kör: **Háttér-értesítés worker** (2026-09-01)

Az [[Értesítések]] és a [[Lépésszám követés]] L2 kör is ugyanazt hagyta nyitva: a
háttér-végrehajtás, ezért minden ütemezett újraértékelés app-nyitáshoz / `resume`-hoz
kötött. Ez a kör pótolja — **natív Android (Kotlin) `AlarmManager` + `WorkManager`**,
nem `@capacitor/background-runner` (nincs új npm függőség, és ez az egyetlen út,
ami háttérben eléri a Health Connectet). Egy jóváhagyott terv szerint, négy
szeletben; minden lépés után frontend (Karma + `ng build`) + lint + `./gradlew
:app:assembleDebug` zöld.

- **B0 — időzítés-váz.** `hu.bumler.lm2.notifications` Kotlin csomag: `ReminderScheduler`
  (két inexact `setAndAllowWhileIdle` riasztás, 09:00 + 20:00 helyi, **nincs**
  `SCHEDULE_EXACT_ALARM`), `ReminderAlarmReceiver` (→ `WorkManager` `OneTimeWorkRequest`
  + a slot újra-fegyverzése), `BootReceiver` (`BOOT_COMPLETED`), `ReminderWorker`
  (`CoroutineWorker`), `BackgroundRemindersPlugin` (app-lokális Capacitor plugin,
  `MainActivity`-ben regisztrálva). `androidx.work:work-runtime-ktx 2.9.1`.
  `background-reminders.plugin.ts` + `NotificationScheduler.init()` → `ensureScheduled()`.
- **B1 — értesítés-terv híd.** `notification-background-plan.ts` (pure) a `notification-rules`
  szabály-függvényeit hívja újra a következő 3 nap 09:00-jaira (`FOOD_EXPIRING_DAILY`,
  `FOOD_SPOILED_ONCE` — lifetime kulcs egy legkorábbi bejegyzésre összevonva,
  `HOUSEHOLD_TASK_DUE`), `CALORIE_STREAK` csak mára, + `STEPS_LOW` sablon.
  `EVENT_OCCURRENCE` **kimarad** (élő scheduler OS-szinten 30 napra előre ütemez, és a
  késői tüzelés sértené a specet). A `NotificationScheduler` minden reconcile-kor
  pre-renderelt tervet ír a `@capacitor/preferences` `lm2_notifBgPlan` kulcsába, és
  visszaolvassa + a `NotificationDedupeStore`-ba fésüli a worker `lm2_notifBgDedupe`
  naplóját. A worker a due (max 20h késésű) + nem dedupált + nem OS-ütemezett
  bejegyzéseket posztolja (`NotificationManagerCompat`, `lm2-default`); a tap-út a
  `lm2_notifPendingRoute` prefen át (`MainActivity` intent → `drainPendingRoute`).
- **B2 — `STEPS_LOW` 20:00 élő HC-olvasással.** `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND`
  + `HealthConnectStepsPlugin` `checkBackgroundPermission` / `requestBackgroundPermission`
  (csak a foreground `READ_STEPS` után); `ActivityStepSyncService.backgroundPermission`
  signal; a Lépésszám képernyőn „háttér-hozzáférés" al-sor + prompt. A worker esti ága
  `HealthConnectClient.aggregate`-tel olvassa a mai lépést, és a terv threshold-ja
  alatt tüzel a sablonból (`__STEPS__` csere). Megtagadva / HC hiány → csendes kihagyás,
  marad az app-open út.
- **B3 — 09:00 tegnapi lépés-stash.** A worker morning ága a tegnapi HC összeget a
  `steps.pendingHealthConnect.<dátum>` prefbe stasheli (nem ír store-t);
  `drainPendingNativeStepReadings` (pure) + `ActivityStepSyncService.syncNow()` a live
  HC-olvasás **előtt** olvassa be és `maxWinsUpsert`-eli, majd törli a kulcsokat.

**Tudatosan kihagyva / ismert korlát:**
- **`@capacitor/background-runner`** — nem került be; a natív `AlarmManager` + `WorkManager`
  a választott út (Health Connect elérés + nincs új nagy függőség).
- **OEM akkumulátor-optimalizálás** (Samsung/Xiaomi) az inexact riasztást órákkal
  késleltetheti / kilőheti — nincs teljes megoldás engedély-prompt nélkül; az app-open
  reconcile + a 7 napos step-backfill marad a végső védőháló.
- **Dedupe-verseny** a worker (append) és a JS (merge+ürít) között: ritka átfedéskor egy
  banner egyszer újratüzelhet; a `lm2_notifScheduled` best-effort ellenőrzés + a napi
  kulcs-rotáció kompenzál.
- **`CALORIE_STREAK` / `HOUSEHOLD_TASK_DUE` / `FOOD_*` több napig zárt appnál**: a jövőbeli
  napok terve elavulhat (teljesített feladat / törölt tétel) — a következő app-open
  újraírja, és a worker 20h-s staleness-guardja nem tüzel egy nagyon régi bejegyzést.
- **On-device funkcionális próba** — a debug APK fordul és csomagol; valós telefonon
  (riasztás Doze mellett, HC háttér-olvasás, tap → route) még nem futott.

## Lezárt kör: **Értesítés-előzmény + Lead-time szerkesztő** (2026-09-01)

A „Következő kör: post-MVP extrák" tábla két [[Értesítések]]-forrású sora, egy
menetben, tisztán frontend (nincs backend / séma / OpenAPI / Kotlin érintettség,
nincs új npm függőség). Frontend (Karma: 1345 zöld) + `ng build` + lint zöld. A
spec (`documentation/Features/Értesítések.md`) is frissült — mindkettő eddig
„nincs az első körben" volt.

- **Értesítés-előzmény lista.** `core/notifications/notification-history.store.ts`
  (`NotificationHistoryStore`, `@capacitor/preferences` `lm2_notifHistory`,
  legfrissebb-elöl, 60 bejegyzésnél levágva, `(type,key)`-enként egyszer). A
  `NotificationScheduler` az egyetlen író, ugyanazon a három ponton, ahol a
  dedup-naplóba is ír: azonnali (múltbeli) fire, egy ütemezett értesítés
  kézbesítésének kikövetkeztetése a reconcile-ban (ehhez a `RegistryEntry` most
  `title`/`body`/`route`-ot is eltárol), és a natív `ReminderWorker` által zárt app
  mellett kiküldött banner (`mergeNativeDedupe` az utolsó `lm2_notifBgPlan` tervből
  nyeri vissza a szöveget; ha nincs meg, route nélküli sor). `main.ts` cold-start
  `notificationHistory.init()`. `pages/menu/notifications/notification-history.page`
  (read-only lista, soronként a banner route-jára navigál, „Előzmények törlése"
  csak a naplót üríti), `notifications/history` alrút, link a beállítások lap
  tetején. i18n hu + en. `NotificationHistoryStore` spec + a scheduler spec
  kiegészítve a history-record ellenőrzésével.
- **Lead-time szerkesztő.** `core/notifications/notification-tuning.service.ts`
  (`NotificationTuningService`, `lm2_notifTuning` blob, `ThemeService`/`Settings`
  minta; `DEFAULT_TUNING` = spec-konstansok, `TUNING_BOUNDS` tartományhoz vágás +
  kerekítés). Négy küszöb: `foodExpiringLeadDaysLong` (3), `foodExpiringLeadDaysShort`
  (2), `stepsLowThreshold` (2000), `calorieStreakMarginKcal` (750). A
  `notification-rules` három érintett függvénye (`foodExpiringDailyRules`,
  `stepsLowRule`, `calorieStreakRule`) **opcionális** paraméterként veszi (alapérték
  a régi konstans → a meglévő hívások/tesztek nem törnek); a `NotificationScheduler`
  `computeDesired` és `writeBackgroundPlan` mindig a `tuning()` signalból ad át, és
  egy `effect`-olvasás miatt a küszöb-változás azonnal újraértékel + a
  `lm2_notifBgPlan` háttér-tervet is a friss küszöbökkel írja újra (a `STEPS_LOW`
  threshold és az étel-lead a zárt app melletti tüzelésnél is él).
  `notification-background-plan.ts` `buildBackgroundPlan` szintén opcionális `tuning`
  paraméter. `main.ts` cold-start `notificationTuning.init()`.
  `pages/menu/notifications/notification-tuning.page` (négy szám-mező hintekkel,
  „Mentés" csak dirty-re, „Alapértékek visszaállítása"), `notifications/tuning`
  alrút, link a beállítások lapon. i18n hu + en. `NotificationTuningService` spec +
  `notification-rules` / `notification-background-plan` specek kiegészítve.

**Fixen maradt (szándékosan):** a 09:00 / 20:00 fix idők (a natív `AlarmManager`
slotokhoz drótozva — JS-ből átállítani desync-et okozna), a §1 `> 5 nap` katalógus-
küszöb (strukturális elágazás, nem lead-time), és a §4 5 napos sorozat-hossz.
**On-device próba** (valós banner-előzmény, küszöb-változás → értesítés-viselkedés)
a folyó on-device tesztelés része.

### Code-review follow (ebben a commitban) — 6 észrevétel

A fenti kör `/code-review`-ja után. Frontend + egy kis natív érintettség (a #2 miatt
a `ReminderWorker` immár a kirenderelt szöveget is a `lm2_notifBgDedupe` sorba írja).
Karma zöld (1349), lint + `ng build` zöld.

1. **Natív-worker `STEPS_LOW` előzmény-sor 09:00-val, `__STEPS__`-sal.**
   `mergeNativeDedupe` minden natív sort `${day}T09:00:00`-ra bélyegzett és a
   `bodyTemplate`-et (benne a `__STEPS__` jelölő) tette a naplóba. A `ReminderWorker`
   `Ledger.record` most `title`/`body`/`route`/`firedAt`-et is ír (a `STEPS_LOW`-nál a
   behelyettesített darabszámot + a 20:00-s időt); a JS-oldal ezekből dolgozik, és csak
   régi (mezők nélküli) sornál esik vissza a `lm2_notifBgPlan` tervre — ott már a terv
   `fireAtEpochMs`-ét használva, nem fix 09:00-t.
2. Lásd #1 — ugyanaz a fix (a behelyettesített `body` visszaírása).
3. **Kiürített szám-mező = 0 a Lead-time szerkesztőben.** `setField` a `''` / `null`
   értéket explicit „nincs változás"-ként kezeli, nem engedi `Number('') === 0`-ként
   a draftba (különben Mentésre a min-re vágódott).
4. **Duplikált default küszöbök.** Új Angular-mentes `notification-tuning.ts` (típus +
   `DEFAULT_TUNING` + `TUNING_BOUNDS` + `sanitizeTuning`); a `notification-rules`
   fallback-konstansai ebből származnak, a `notification-background-plan` innen
   importál (nem a `*.service`-ből). A `*.service` re-exportál a régi importőröknek.
5. **`sanitize()` a spec-defaultra állított vissza.** `sanitizeTuning(patch, base)` —
   `set()` a jelenlegi state-et adja `base`-nek, így egy nem-véges patch-mező a
   felhasználó tárolt értékét tartja meg, nem a defaultot.
6. **`NotificationHistoryStore.record()` init() előtt felülírta a naplót.** `loaded`
   flag + `ensureLoaded()`: az `init()`-et megelőző `record()` előbb beolvassa a
   perzisztált naplót.

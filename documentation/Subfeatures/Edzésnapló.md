---
verifikalva: 2026-10-01
verifikalt_commit: c9676f5
---

# Edzésnapló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Heti terv]], [[Tápérték kalkulátor]], [[Profile]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Elvégzett konditermi / súlyzós / HIIT / mászó-kiegészítő (hangboard, pinch, campus, izometrikus) sessionök rögzítése és élő követése az [[Edzés]] tab alatt. Egy naplóbejegyzés = egy komplett session. A nap `activityExtraKcal` hozzájárulása a [[Tápérték kalkulátor]] univerzális MET képletével számolódik.

**Nem ide tartozik:** fal-/sziklamászás ([[Mászónapló]]), [[Úszás napló]], [[Biciklizés napló]], [[Lépésszám követés]] — külön modulok. A gyakorlat törzsadat: [[Gyakorlat]]; a tervezett rutinok: [[Heti terv]].

Feature flag: az Edzésnapló **önállóan** is működik [[Heti terv]] nélkül (ad-hoc + „ugyanaz, mint legutóbb”).

### Funkcionális leírás

#### Határok

| Modul | Szerep |
|---|---|
| [[Gyakorlat]] | Mit csinálhatsz? (katalógus / törzsadat) |
| [[Heti terv]] | Mit kéne csinálnod? (sablon / heti rutin) |
| **Edzésnapló** | Mit csináltál ténylegesen? (élő + utólagos session) |

Egy napon **több** session engedélyezett (pl. reggel hangboard, este súlyzós); mindegyik külön beleszámít az aznapi `activityExtraKcal`-ba.

Fejlesztési sorrend (függőség): [[Gyakorlat]] → **Edzésnapló** → [[Heti terv]].

#### Entitás — `WorkoutSession`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja létrehozáskor |
| `date` | Naptári dátum (kliens TZ); aznapi `activityExtraKcal` összegzéshez |
| `startTime` | Opcionális `LocalTime`; élő / ismert kezdés |
| `endTime` | Opcionális `LocalTime` |
| `durationMinutes` | Egész, `> 0` ha van kalóriaág. Alapértelmezés: `endTime − startTime` (perc), vagy stopper; **manuálisan felülírható**. Ha hiányzik: becslés — lásd Kalória. |
| `workoutType` | Kötelező enum: `GENERAL_WEIGHTS` \| `HIIT_CIRCUIT`. Alapértelmezett: `GENERAL_WEIGHTS`. Session létrehozásakor választott; **mentés után is módosítható**. |
| `title` | Opcionális szöveg |
| `notes` | Opcionális szöveg |
| `location` | Opcionális enum: `HOME_GYM` \| `COMMERCIAL_GYM` \| `OUTDOOR_PARK` |
| `planId` | Opcionális UUID → [[Heti terv]] **`WorkoutPlan.id`** (statikus sablon; nullable = ad-hoc) |
| `roundsCount` | Opcionális; `HIIT_CIRCUIT` UI körök száma (`≥ 1`) |
| `deleted` | Soft delete (`false` default) |
| `exercises` | `WorkoutExerciseEntry[]` (nested) |
| `createdAt` / `updatedAt` | Audit |

**Egy napló = egy session.** A sessionnek **egy** fő `workoutType`-ja van; vegyes blokkok (pl. súlyzós végén HIIT-szerű kör) `supersetGroup`-pal csoportosíthatók, nem külön session-típusként.

CRUD: lista (`deleted = false`), létrehozás, szerkesztés, törlés (megerősítéssel). **Törlés:** szerver / szinkronizált entitás → **soft delete** (`deleted`); multi-device synchez. Ha a session még sosem szinkronizált (helyi draft / pending outbox) → helyi **hard remove** + outbox tisztítás. Múltbeli sessionök teljes terjedelmükben szerkeszthetők.

#### Entitás — `WorkoutExerciseEntry`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `exerciseId` | Opcionális UUID → [[Gyakorlat]] master (ad-hoc esetén null) |
| `exerciseName` | **Snapshot** — kötelező; a mentéskori név (master átnevezés / törlés nem írja felül) |
| `exerciseCategory` | **Snapshot** — `ExerciseCategory` enum ([[Gyakorlat]]). `text` + `workout_exercise_entry_exercise_category_check` CHECK a 11 értékre. A `V35` (backlog/065) a régi snapshot-értékeket megfeleltette: `ARMS` → `BICEPS`, `CORE` → `ABS` (lossy — [[Gyakorlat]] migrációs jegyzet). |
| `exerciseKind` | **Snapshot** — `ExerciseKind` enum ([[Gyakorlat]]); szett UI mezők ehhez igazodnak |
| `orderIndex` | Egész; drag & drop sorrend |
| `supersetGroup` | Opcionális egész; azonos érték = vizuális szuperszett / kör-csoport (nincs bonyolult per-szett szuperszett UI) |
| `sets` | `WorkoutSetEntry[]` |

Egy master gyakorlat **többször** szerepelhet egy sessionben (külön entry-k, pl. bemelegítő húzódzkodás + munka húzódzkodás).

**Ad-hoc:** a pickerben új név → azonnali entry snapshot névvel; opcionálisan mentés a [[Gyakorlat]] katalógusba.

#### Entitás — `WorkoutSetEntry`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `setNumber` | Egész (`≥ 1`) |
| `setType` | Enum: `WARMUP` \| `WORKING` \| `DROPSET` \| `REST_PAUSE` \| `FAILURE` |
| `reps` | Opcionális egész; ismétléses gyakorlatoknál |
| `weightKg` | Opcionális szám; **csak kg**. Saját testsúly: `0`; súlyozott: `+kg`; rásegítés (gumi/csiga): **negatív** kg |
| `holdTimeSeconds` | Opcionális egész; izometrikus / hangboard / időalapú / kardió idő |
| `edgeSizeMm` | Opcionális egész; fogásméret mm (pl. 20 mm léc, pinch) |
| `distanceMeters` | Opcionális egész `≥ 0`; kardió táv méterben (pl. 1000 m evezés) |
| `restTimeSeconds` | Opcionális egész; pihenő cél / utolsó mért pihenő |
| `isCompleted` | Boolean; élő módban pipa; kihagyott: `false` vagy törlés |
| `orderIndex` | Egész (szettek sorrendje) |

**Mértékegység:** kizárólag kg, mm, m (nincs lb / mérföld). Százalékos 1RM-mátrix **nincs** a naplóban — mindig abszolút kg mentődik.

**Mezőválasztás `exerciseKind` szerint** (snapshot / [[Gyakorlat]]):

| `ExerciseKind` | Látható szett-mezők |
|---|---|
| `WEIGHTED_REPS` | `reps`, `weightKg` |
| `BODYWEIGHT_REPS` | `reps`, opcionális `weightKg` |
| `ISOMETRIC_TIME` | `holdTimeSeconds`, opcionális `weightKg` |
| `HANGBOARD_PINCH` | `edgeSizeMm`, `holdTimeSeconds`, opcionális `weightKg` |
| `CARDIO_TIME_DIST` | `holdTimeSeconds`, `distanceMeters` |

`distanceMeters` / `edgeSizeMm` / szett-szintű idő **nem** része a session MET-kalóriának (az a `durationMinutes` × MET).

#### Volumen és PR

\[\text{Volume}_{\text{exercise}} = \sum (\text{reps} \times \text{weightKg})\]

csak `WORKING`, `DROPSET`, `FAILURE` szettekre. **`WARMUP` és `REST_PAUSE` kizárva** a volumemből és a PR-detektálásból. Warmup beleszámít a session időtartamába / kalóriába (a session `durationMinutes` révén).

**1RM becslés (Epley)** — csak UI / PR, nem tárolt kötelező mező:

\[1RM = w \times \left(1 + \frac{r}{30}\right)\]

érvényes, ha \(r \in [1, 12]\).

PR típusok (badge a szett mellett): számított **1RM** megdöntés; **max súly**; **max volumen** (szett vagy gyakorlat aggregát).

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

\[\text{kcal} = \text{MET}(\text{workoutType}) \times m \times \frac{\text{durationMinutes}}{60}\]

| `workoutType` | MET |
|---|---|
| `GENERAL_WEIGHTS` | 5.0 |
| `HIIT_CIRCUIT` | 8.0 |

- \(m\): aktuális testsúly kg a [[Profile]]-ból — **nem** fagyasztódik a sessionbe.
- A session **nem tárol** `activityExtraKcal` / testsúly mezőt.
- MET a **teljes** `durationMinutes`-re vonatkozik (HIIT-nél a rövid pihenők benne vannak).
- **Hiányzó időtartam fallback:** ha nincs megadható / számítható `durationMinutes`, becslés: \(\text{szettek száma} \times 3\) perc (kcal / előnézet); a mentett `durationMinutes` felülírható kézzel.

#### Élő vs utólagos mód

- **Élő:** Active Workout View stopperrel; szett pipa → Rest Timer indul; haptic + hang a lejáratkor. Default pihenő: [[Gyakorlat]] katalógus (`restTimeSeconds` default), UI-n felülírható.
- **Draft:** aktív session állapota helyi store-ban (app kill / váltás után helyreáll).
- **Utólagos:** ugyanaz a nested modell; tetszőleges múltbeli `date` / idő.

#### Kapcsolat [[Heti terv]]

- „Edzés indítása a tervből”: új session a `WorkoutPlan` sablonból; előtöltés (`rowsFromPlan`); `planId = WorkoutPlan.id`. Tartományos cél-ismétlés (`8–12`, [[Heti terv]]) a határok átlagával, felfelé kerekítve töltődik; a tartomány display-only `repsTarget`-ként a helyi draftban is megmarad és „cél: …” segédszövegként látszik (a session szettjén nincs tartomány-mező). Az előtöltő logika kész; belépője jelenleg a [[Heti terv]] heti dashboard nap-`START` gombja (`?planId=`). Az Edzésnapló dashboardon nincs önálló „Terv indítása" gyorsindító (aktív sablonok listája) — tervezett: `backlog/054-edzesnaplo-dashboard-terv-inditasa-gyorsindito-aktiv-sablonok-li.md`.
- Eltérés szabad (nincs hiba); a napló a valóságot rögzíti.
- **Adherence:** adott héten van-e session ugyanezzel a `planId`-del (részletek: [[Heti terv]]).
- **Ad-hoc** terv nélkül: támogatott.
- **„Ugyanaz, mint legutóbb”:** legutóbbi session struktúra + súlyok másolása terv nélkül.

#### Statisztika

Jelenleg él:

- **Ghost values** az utólagos szerkesztőben (`workout-session-edit`) — legutóbbi alkalom ugyanarra a gyakorlatra, a csúcs-szettel (pl. „80 kg × 8”).
- **„Legutóbb” sor az élő `active-workout` nézetben** (`backlog/131`) — a gyakorlat neve alatt a legutóbbi alkalom dátuma és **összes** számolt (WORKING / DROPSET / FAILURE) szettje: azonos szettek összevonva („Legutóbb (2026-09-28): 3 × 5 @ 22.5 kg”), eltérőek ` · `-tal felsorolva („5 @ 22.5 kg · 4 @ 22.5 kg”); tartásidő „10 s”, 0 kg nem jelenik meg, rásegítés negatív kg-ként (`workout-metrics.ts`: `lastPerformance`, `formatSetSummary`). Mellette a **PR badge** (1RM / max súly / max volumen megdöntés).
- **Progresszió-javaslat („double progression”, `backlog/131`)** az élő nézetben: ha a gyakorlat WORKING szettjeinek a sablonból tartomány-célja van (pl. „3–5”), és legutóbb **minden** WORKING szett elérte a tartomány felső határát, súllyal, akkor a gyakorlat alatt egy „Javaslat: <legutóbbi legnagyobb munkasúly + 2,5> kg” gomb jelenik meg (`progressionSuggestion`, lépés `PROGRESSION_STEP_KG = 2.5`). Rásegítésnél (negatív kg) ez 2,5 kg-mal kevesebb rásegítés, legfeljebb 0-ig. Tapra a még nem kipipált WORKING szettek súlyát erre állítja; ha már mind ezen áll, a gomb eltűnik. Tartomány-cél nélkül (ad-hoc / fix cél), WORKING szett nélkül, vagy ha egy szett alulmaradt, nincs javaslat. Csak súlyt mutató kindnál (`weightKg` mező).
- Session-szintű **volumen-előnézet** (`Σ reps × weightKg` a WORKING/DROPSET/FAILURE szetteken).

Tervezett (`backlog/055-edzesnaplo-statisztika-felulet-1rm-max-suly-gorbe-heti-volumen-i.md`): per-gyakorlat 1RM / max súly fejlődési görbe, heti volumen aggregát, izomcsoport-eloszlás.

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Edzésnapló (dashboard / lista).
- Flow: Dashboard → Új edzés / Terv indítása / Ugyanaz mint legutóbb → Active Workout (vagy utólagos form) → gyakorlat modal → szettek → Befejezés → summary / dashboard frissülés.
- **Lista:** időrend (újabb elöl); soron: dátum, cím vagy típus, időtartam, megjelenített kcal (utility).
- **Gyakorlat picker:** `ion-searchbar` + `ExerciseCategory` chipek + Kedvencek; ad-hoc létrehozás. A `<ion-modal>`-ben megjelenő `app-exercise-picker` a modal **teljes magasságát** kitölti (`:host` a megosztott `ion-modal-host-fill` mixin — `shared/styles/_ion-modal-host.scss`, `backlog/117` — flex-oszlop, `position: absolute; inset: 0`), így a találati lista a teljes rendelkezésre álló teret használja, nem egy-két sorra zsugorodik. Ugyanezt a mintát használja az [[Étkezés]] tétel-szerkesztő modalja is.
- **Szettek:** gyakorlatonként egy szett-táblázat; `+ Új szett`; előző szett másolása; numerikus billentyűzet autofókusz. Az Active Workout gyors-növelő gombjai (`+2.5 kg` / `+5 kg` súlyos, `+1 ism.` repses gyakorlatnál) **szettenként egy kompakt sorban, a szett mezői alatt** vannak, így a megnövelt érték mindig látszik; a szett törlés (✕) a sor jobb szélén. Az utólagos formban nincsenek gyors-növelő gombok (az értéket úgyis begépeli a felhasználó).
- **Szett-táblázat elrendezése** (sablon-szerkesztő, utólagos form és Active Workout egyaránt, közös `shared/styles/_set-row.scss` mixin + `setGridColumns()` a `workout-fields.ts`-ben): gyakorlatonként **egyszer** egy oszlopfejléc (rövid mezőnév + mértékegység, pl. „Súly / kg”), alatta szettenként **egy sor** keretes, label nélküli inputokkal pontosan a saját oszlopuk alatt — a `kind` szerint 1–4 számoszlop, így ~360 px-en sem tördel. Az első oszlop a sorszám + a szett-típus rövid jelvénye (M = Munka, B = Bemelegítő, D = Dropset, R = Rest-pause, K = Kifáradásig; tapra popoverben választható a teljes nevű típus). Active Workoutban a sor elején a „kész” pipa oszlop; ha a szett a sablonból tartomány-célt kapott, az ismétlés mező placeholdere a cél (pl. „8-12”).
- **Gyakorlat műveletei:** a gyakorlat-fejléc jobb szélén egy ⋮ gomb action sheetet nyit (Mozgatás felfelé / lefelé — az első/utolsó gyakorlatnál a nem értelmezett irány hiányzik —, `WEIGHTED_REPS` / `BODYWEIGHT_REPS` kindnál „Bemelegítés generálása”, Eltávolítás), hogy a gyakorlatnév ne törjön két sorba.
- **Bemelegítés generálása (`backlog/132`, ramping warm-up):** a gyakorlat **első WORKING szettjének** súlyából 3 `WARMUP` szettet szúr a szettlista elejére: 5 ism. × ~30%, 3 ism. × ~65%, 1 ism. × ~87%, 2,5 kg-ra kerekítve, 60 / 90 / 120 mp cél-pihenővel (`warmup-ramp.ts`: `rampWarmupSets`). A meglévő `WARMUP` szettek helyére kerülnek; az élő nézetben a már kipipált bemelegítők megmaradnak. **Rásegített (negatív kg) munkasúlynál** a mozgatott teher `testsúly + munkasúly` ([[Profile]] aktuális testsúly), a bemelegítők ennek hányadai, így nagyobb rásegítésként (negatívabb kg) mentődnek. Munkasúly nélkül (nincs / 0 kg) vagy rásegítésnél testsúly nélkül nem generál, hanem figyelmeztető toastot ad. Mindig abszolút kg mentődik — nincs %-mező. Mindhárom szerkesztőben (élő, utólagos, sablon) elérhető.
- Az utólagos form láblécében az időtartam / volumen / kcal előnézet külön, térközzel elválasztott tételek.
- **Thumb-zone:** szett-pipa és „Edzés befejezése” a képernyő alsó harmadában.
- **HIIT:** körök (`roundsCount`); kör másolás gombokkal.
- **Törlés:** megerősítő dialógus.
- Élő kcal előnézet (Profile `m` + MET + `durationMinutes` / becslés).

### Megjegyzések

- Nincs edzés közbeni %-os 1RM mátrix és nincs komplex per-szett szuperszett UI — a csoportosítás egyetlen `supersetGroup` egész.
- A szett-modell tartalmazza az `edgeSizeMm` + `holdTimeSeconds` (hangboard) és a `distanceMeters` (kardió) mezőket — ezek nem részei a session MET-kalóriájának.
- Seed gyakorlatok: [[Gyakorlat]].
- Naplózható entitások törlése: egységes **soft delete** ([[Backend-offline first]]); nested mentés: egy session = egy payload.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: session lista/dashboard, élő Active Workout, utólagos create/edit, gyakorlat picker modal, delete confirm, summary.
- Nested model a store-ban; draft session SQLite / Ionic Storage.
- Rest timer + haptic; PR / volume / Epley pure TS utility.
- Shared MET / kcal: [[Tápérték kalkulátor]]; testsúly: [[Profile]].
- Ghost values (`workout-metrics.ts:ghostForExercise`): előző session ugyanarra `exerciseId` / név egyezésre — a `workout-session-edit` képernyőn jelenik meg.
- OpenAPI generált kliens; mutációk offline rétegen.
- Atomi mentés: teljes session + exercises + sets **egy** POST/PUT body.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is (élő edzés net nélkül is).
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID v4; sync: [[Szinkronizációs központ]].
- Kcal: mindig kliensoldali pure számítás; nincs kcal mező az entitáson; Étkezés / Tápérték store optimista frissítés.
- Draft aktív session nem feltétlenül outbox — helyi draft; „Befejezés” / mentés után outbox.
- Lásd [[Backend-offline first]].

### Backend

- Táblák (Liquibase): `workout_session`, `workout_exercise_entry`, `workout_set_entry` (+ katalógus: [[Gyakorlat]] / `exercise_catalog`).
- OpenAPI: nested CRUD `POST` / `PUT /api/workout-sessions` (kötőjeles, mint a `swim-logs` / `bike-ride-logs` / `workout-plans`) — teljes fa egy kérésben; lista / get / delete.
- Validáció: `workoutType` enum; szett mezők `exerciseKind` szerint (szerver oldalon laza vagy típus-szabály).
- Soft delete: `deleted` / `deleted_at` a sessionön; listák szűrnek.
- Update: **teljes nested fa cseréje** egy PUT body-ban (nincs részleges PATCH); a child-diff a `common/NestedChildResolver` (create / undelete / reject).
- Nincs szerveroldali kcal tárolás; opcionális MET-paritás a [[Tápérték kalkulátor]]ssal.
- Auth / user scope: a bejelentkezett user saját sessionjei.
- Konfliktus: kliens UUID; idempotens upsert + sor-szintű last-write-wins ([[Backend-offline first]]).

### Nyitott kérdések

Nincs nyitott kérdés.

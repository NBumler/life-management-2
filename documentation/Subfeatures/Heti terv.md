---
verifikalva: 2026-10-02
verifikalt_commit: f8fa488
---

# Heti terv

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Edzésnapló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Edzéssablonok (rutinok) és a **rotációs előrejelzés** („mit kéne csinálnod?”, `backlog/144`): nincs fix napi kiosztás — az aktív sablonok A/B(/C…) rotációban jönnek a ténylegesen edzett napokon, a tervezett mászásokhoz és egy felváltva 2 / 3 napos terhelő blokk utáni pihenőnaphoz igazítva; bármelyik nap kézzel felülírható (sablon vagy pihenő). Az [[Edzésnapló]] `planId` mezője a **statikus sablon** `WorkoutPlan.id`-jára mutat. Az [[Edzésnapló]] terv nélkül is teljes értékű (ad-hoc indítás).

Tetszőleges számú `WorkoutPlan` sablon létezhet, és közülük tetszőleges számú lehet egyszerre **aktív**. Ez teszi lehetővé, hogy egy állandó alap-rotáció (pl. „A” / „B” nap) mellett átmenetileg cél-specifikus sablonok is aktiválhatók legyenek — pl. egy időszakos edzéscél miatt bevezetett extra sablonok —, anélkül hogy az alap sablonokat törölni kellene; a blokk végén az alap sablonok egyszerűen visszaaktiválhatók.

Fejlesztési sorrend: [[Gyakorlat]] → [[Edzésnapló]] → **Heti terv**.

### Funkcionális leírás

#### Entitás — `WorkoutPlan` (statikus sablon / rutin)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `name` | Kötelező (pl. „Felsőtest A”, „Hangboard Heavy Day”) |
| `notes` | Opcionális |
| `active` | Boolean; alapértelmezett `true` létrehozáskor. Kikapcsolása **nem törlés**: a sablon megmarad a katalógusban és a rá mutató múltbeli `WorkoutSession.planId` / meglévő kézi felülírás érintetlen, csak kimarad a rotációból és elrejtődik a pickerekből (heti felülíró menü, „Terv indítása…”). Bármikor visszakapcsolható. Tetszőleges számú sablon lehet egyszerre aktív — lásd „Aktív / inaktív sablonok” lent. |
| `goalLabel` | Opcionális szöveg; csoportosító címke a listában és a pickerben (pl. „Alap rotáció”, „Cél: egykezes húzódzkodás”). Egyetlen hozzá kötött művelet a csoport egy koppintásos (de)aktiválása (`backlog/140`, lásd UI); a csoport kulcsa a trimmelt címke |
| `defaultWorkoutType` | Opcionális `GENERAL_WEIGHTS` \| `HIIT_CIRCUIT` — session indításkor előtöltés |
| `exercises` | `WorkoutPlanExercise[]` (nested) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

#### Aktív / inaktív sablonok

- Új sablon létrehozáskor `active = true`. A sablon lista fejlécén / soronként kapcsolható; nincs szükség edit módba lépésre.
- **A rotáció és a pickerek csak aktív, nem törölt sablonokat használnak**: rotációs előrejelzés, heti felülíró menü, [[Edzésnapló]] „Terv indítása…”. A sablon lista (katalógus) képernyő viszont Aktív / Inaktív / Mind szűrővel az inaktívakat is mutatja, hogy visszakapcsolhatók legyenek.
- Egy már megadott kézi felülírás vagy múltbeli session `planId`-je akkor is érvényes marad, ha az általa hivatkozott sablon időközben inaktívvá válik — az `active` mező csak azt befolyásolja, hogy a sablon részt vesz-e a rotációban és felkínálásra kerül-e.
- Nincs felső korlát az egyszerre aktív sablonok számára.

#### Entitás — `WorkoutPlanExercise` / cél-szettek

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `exerciseId` | UUID → [[Gyakorlat]] (kötelező a sablonban) |
| `exerciseName` / `exerciseCategory` / `exerciseKind` | Snapshot a szerkesztéskor (pickerből) |
| `orderIndex` | Egész |
| `supersetGroup` | Opcionális; ugyanaz a szabály mint az [[Edzésnapló]]ban |
| `notes` | Opcionális szöveg, max. **200** karakter (`backlog/133`, `V49` CHECK) — sablon-szintű utasítás ehhez a gyakorlat-sorhoz (padállás „szék: 5”, tempó „3–5 mp negatív”). Ugyanaz a gyakorlat sablononként más megjegyzést kaphat. Edzés indításakor a gyakorlat neve alatt segédszövegként látszik; a session entry nem tárolja. |
| `targetSets` | Cél szettek listája: `setType`, cél `reps` / `weightKg` / `holdTimeSeconds` / `edgeSizeMm` / `distanceMeters` / `restTimeSeconds` — a `exerciseKind` szerint releváns mezők —, valamint opcionális `side` (`LEFT` \| `RIGHT`, `backlog/134`: egyoldali cél-szett) és cél-`rpe` (6–10, 0,5-ös lépés, `backlog/135`); mindkettő az [[Edzésnapló]] szett-mezőjével azonos szabályú, és indításkor a session szettjébe másolódik. Az ismétlésszám **tartomány** is lehet (`backlog/125`): `reps` = alsó határ / egyetlen cél, nullable `repsMax` = felső határ (`null` = nem tartomány; a szerver `repsMax < reps` vagy `reps` nélküli `repsMax` esetén 400 `VALIDATION`). |

Indításkor az [[Edzésnapló]] átmásolja ezeket session entry / set előtöltésnek; a session `planId = WorkoutPlan.id`.

A sablon-szerkesztő ⋮ menüjének „Bemelegítés generálása” pontja (`backlog/132`, részletek: [[Edzésnapló]] „Bemelegítés generálása”) az első WORKING cél-szett súlyából 3 WARMUP cél-szettet generál (30 / 65 / 87 %, 60 / 90 / 120 mp cél-pihenő).

`targetSets` szabad `setType`-listája már önmagában kifejezi a bemelegítő ramping (több könnyű `WARMUP` szett) + kevés, nehéz `WORKING` szett (alacsony ismétlésszám, hosszú cél `restTimeSeconds`) mintát — nincs szükség külön mezőre a bemelegítés/munka szétválasztásához. Az explicit `FAILURE` típus jelzi, ha egy szett tudatosan a bukásig megy; a tervezett megerőltetés (pl. RPE 8–9 = 1–2 ismétlés tartalék) az opcionális cél-`rpe`-vel adható meg, ennek hiányában egy `WORKING` szett hallgatólagosan tartalék ismétléssel (RIR) végzett.

#### Entitás — `WeeklyPlan` (egy naptári hét kézi felülírásai)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID v5 `(userId, weekStartDate)` — két offline eszköz ugyanarra a hétre konvergál |
| `weekStartDate` | A hét hétfője (kliens TZ, ISO date) |
| `slots` | Napi **kézi felülírások** (`WeeklyPlanSlot`, `backlog/144`): `dayOfWeek`, `kind` = `PLAN` (sablon, `planId` kötelező — hiányában 400 `VALIDATION`) \| `REST` (kényszerített pihenőnap, `planId` = `null`). Max egy élő slot / nap (partial unique index `(weekly_plan_id, day_of_week) WHERE deleted = false`). Slot csak felülírt napon van; „Automatikus”-ra visszaállítva soft-delete. |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

Egy felülírás **csak a saját napjára** szól — nincs öröklés más hetekre. Felülírás a mai és a jövőbeli napokra adható; a múltra mindig a rögzített adat számít. A `planId` egy később inaktívvá tett sablonra is érvényes marad; törölt sablonra mutató felülírást az előrejelzés figyelmen kívül hagy (a nap automatikus lesz). Helyi SQLite-ban a `plan_id` NOT NULL oszlop: `REST`-nél `''`, a DTO-ban `null`.

#### Indítás

- **„Edzés indítása a tervből”:** a sablon `WorkoutPlan`-jából új `WorkoutSession`; gyakorlatok + cél szettek előtöltve; `planId` = sablon ID. Eltérés szabad. Tartományos cél-ismétlésnél a session szett `reps`-e a határok átlaga **felfelé kerekítve** (`8–12 → 10`, `8–11 → 10`), a tartomány pedig „cél: 8–11” segédszövegként látszik az ismétlés-mező alatt. Belépők: a heti nézet mai sorának „Edzés indítása” gombja (a mára előrejelzett sablon), az [[Edzésnapló]] gyorsindítója és „Terv indítása…” listája.
- Egy sablon egy héten többször is lefuthat; a rotáció a sablon `planId` szerinti utolsó élő sessionjét nézi.

#### Heti terhelés (`backlog/137`)

A dashboard az előrejelzés mellett a hét **tényleges** terhelését is mutatja, a helyi [[Mászónapló]] és [[Edzésnapló]] alapján (`pages/workout/training-load.ts`, tiszta TS):

- Naponként: `climbing` = aznapi élő mászó-sessionök száma; `workouts` = aznapi élő edzésnapló-sessionök száma; `fingerLoad` = mászás **vagy** egy élő `FOREARM_FINGERS` kategóriájú / `HANGBOARD_PINCH` kindú gyakorlat aznapi edzésben; `rest` = se mászás, se edzésnapló (úszás, bicikli, lépés könnyű aktivitás — nem töri meg a pihenőnapot).
- Napsoronként jelvények a dátum alatt (a rögzített adat): **Mászás**, **Edzés: <sablonnév>** rögzített edzésenként (sablon nélküli edzésnél „Edzés”), **Ujjterhelés** (ujj-gyakorlat mászás nélkül), **Pihenő** (csak múltbeli napon). A mai és a jövőbeli napokon emellett az előrejelzés látszik (lásd „Rotációs előrejelzés”).
- Felül összesítő a naptári hétre: „Mászás X nap · Edzés Y nap · Pihenőnap Z” (a pihenőnap a mai napig számol); ha van még előttünk álló tervezett mászás: „Mászás X nap (+Y tervezett) · …”. Hétváltáskor a megjelenített hétre számol.

#### Tervezett mászás (`backlog/143`)

A tervezett mászás egy `CLIMBING` típusú [[Események|esemény]] (egyszeri vagy ismétlődő; szinkronizál, a [[Naptár]]ban is látszik). A terhelés-sor (`plannedClimbDates` → `dailyTrainingLoad`) szabálya: **a múltra mindig a rögzített adat számít, mára és a jövőre a terv is**.

- `plannedClimb` = ma / jövőbeli nap, tervezett mászással, rögzített mászó-session nélkül — nem pihenőnap, a szabályok mászónapként kezelik. Ha a mászást rögzíted, a nap sima „Mászás”.
- `missedClimb` = múltbeli nap, terv volt, rögzítés nincs → szürke **„Elmaradt mászás”** jelvény; a számításban az a nap a tényleges adata szerint számít (pl. pihenőnap).
- Napsoron (ma / jövő, rögzített mászás nélkül) kapcsoló-gomb: **„+ Mászás”** (körvonalas) → egyszeri, egész napos „Mászás” esemény létrehozása; **„Mászás (tervezett)”** (kitöltött) → az aznapi egyszeri mászás-esemény(ek) törlése. Ha a napot csak ismétlődő mászás-esemény fedi, a tap az esemény szerkesztőjét nyitja (egy előfordulás nem törölhető külön — az [[Események]]ben nincs előfordulás-kivétel).

#### Rotációs előrejelzés (`backlog/139`, `backlog/144`)

Egyetlen tiszta TS előrejelzés (`pages/workout/training-forecast.ts`: `trainingForecast`, `forecastInputsFrom`, `overridesByDate`) adja a heti nézet mai / jövőbeli sorait **és** az [[Edzésnapló]] gyorsindítóját. Bemenet: aktív sablonok, rögzített edzések és mászások, tervezett mászások ([[Események]] `CLIMBING`), kézi felülírások.

- **Múlt (tegnapig):** a rögzített adat. Terhelő nap = rögzített mászás vagy edzés. A javasolt, de nem rögzített nap **pihenőnap** — utána a blokk újraindul.
- **Ma:** ha már van rögzített mászás / edzés, a nap az, ami történt (`LOGGED`) — aznapra nincs újabb javaslat. Különben ugyanaz, mint a jövő.
- **Jövő, napról napra, ebben a sorrendben:**
  1. **Kézi felülírás** nyer: `REST` → pihenő; `PLAN` → az a sablon.
  2. **Tervezett mászás** → mászónap (terhelő nap, edzés nélkül).
  3. **Blokklimit:** ha az egymást követő terhelő napok száma elérte a limitet → pihenőnap. A limit **felváltva 2 / 3**: az előző lezárt blokk ≥ 3 napos volt (vagy nincs előzmény) → 2, különben 3 (`nextBlockLimit`). Az aktuális blokkot és az előzőt a rögzített múlt (60 nap) adja, az előrejelzés innen folytatja.
  4. Egyébként **edzés: a rotáció következő sablonja** — az aktív, élő sablonok közül a legrégebben csinált (sosem csinált elsőbbséggel, holtversenyben a sablon-sorrend). Az előrejelzett és a felülírt napok is léptetik a rotációt, így egy felülírás után onnan folytatódik. **Mászás előtti napon** a következő ujjmentes sablon (élő `FOREARM_FINGERS` / `HANGBOARD_PINCH` gyakorlat nélküli, `planHasFingerLoad`); ha minden sablon ujjas, a soron következő, `fingerFallback` jelzéssel.
- Aktív sablon nélkül a szabad nap pihenőnap (`NO_PLANS`).
- A fókuszváltás (pl. „OAPU mód”) a sablon-csoport kapcsolóval (`backlog/140`) történik: csak az aktív sablonok vesznek részt a rotációban.
- A „ma” a `CurrentDayService` jelzése (előtérbe kerüléskor és percenként újraolvasva), így a nyitva hagyott nézet éjfélkor átáll.

#### Terhelés-figyelmeztetések (`backlog/138`)

Tiszta szabálymotor (`pages/workout/load-warnings.ts`) a fenti napi terhelés-soron és a rotációs előrejelzésen, mindig a **mai** naphoz (a megjelenített héttől függetlenül). Csak tanács — a szövegezés „javasolt”, semmit nem tilt, push-értesítés nincs. A küszöbök konstansok (`REST_WINDOW_DAYS = 7`, `FINGER_LOAD_DAYS_LIMIT = 5`, `MANY_CLIMBS_PER_WEEK = 4`, `REST_AHEAD_DAYS = 7`). Bemenet (`LoadWarningSources`): mászó- és edzésnapló, események (tervezett mászás, `backlog/143`), kézi felülírások + sablonok (az előrejelzéshez, `backlog/144`).

| Kód | Súlyosság | Feltétel | Szöveg (hu) |
|---|---|---|---|
| `NO_REST_DAY` | figyelmeztetés | a ma előtti 7 nap egyike sem pihenőnap | „Az elmúlt 7 napban nem volt pihenőnap — heti 1–2 teljes pihenőnap javasolt.” |
| `FINGER_LOAD` | figyelmeztetés | a gördülő 7 napban (ma is) ≥ 5 ujjterhelő nap | „…az ínak és a pulley-k lassan regenerálódnak, pihentetés javasolt.” |
| `NO_REST_AHEAD` | figyelmeztetés | a rotációs előrejelzés a következő 7 napban (ma is) egyetlen pihenőnapot sem tartalmaz — automatikusan ez nem fordul elő (a blokklimit legfeljebb 3), csak tervezett mászások és / vagy kézi felülírások miatt — `backlog/143`, `backlog/144` | „A tervezett mászások és a kézi beállítások mellett a következő 7 napban nem marad pihenőnap — érdemes egy napot szabadon hagyni.” |
| `CLIMBED_TODAY` | info | ma van mászó-session | „Ma már másztál — ma legfeljebb rövid törzs / prehab edzés javasolt.” |
| `CLIMB_PLANNED_TODAY` | info | mára mászás van tervezve (még nincs rögzítve) — `backlog/143` | „Mára mászás van tervezve — ma legfeljebb rövid törzs / prehab edzés javasolt.” |
| `CLIMB_TOMORROW` | info | holnapra mászás van tervezve — `backlog/143` | „Holnap mászás — ma ujj- és nehéz húzóedzés nem javasolt.” |
| `MANY_CLIMBS` | info | a naptári héten (hétfő–vasárnap) ≥ 4 mászónap, a rögzítettek **és** a még előttünk álló tervezettek együtt | „Sok mászás a héten — az otthoni húzó- és ujjedzés kihagyható.” |

Megjelenés: nem blokkoló sáv(ok) (`app-load-warnings-banner`, figyelmeztetés: sárgás háttér + ⚠ ikon, info: szürke) a Heti terv dashboard tetején és az [[Edzésnapló]] lista tetején; figyelmeztetés nélkül nem renderel semmit. Sorrend: előbb a figyelmeztetések, aztán az infók.

CRUD: sablon lista/szerkesztő; napi kézi felülírás a heti nézetben; soft delete sablonra (megerősítéssel). Sablon soft delete után a múltbeli sessionök `planId`-je megmarad; felülírásnak és a rotációnak nem része.

### UI/UX elvárások

- Sablonok lista + nested gyakorlat/cél-szett szerkesztő ([[Gyakorlat]] picker). Az ismétlésszám mező szöveges (`inputmode="tel"` — számbillentyűzet kötőjellel): `N` vagy `N-M` (szóköz, en-dash tűrve; `N-N` egyetlen értékké egyszerűsödik); értelmezhetetlen vagy fordított tartománynál a mező kerete piros, a szett sora alatt teljes szélességű hibaüzenet, és a mentés blokkolva. A parse / megjelenítés mezőtől független (`shared/target-range.ts`), hogy később más cél-mezők is kaphassanak tartományt. A cél-szett táblázat elrendezése az [[Edzésnapló]]-val közös (oszlopfejléc + szettenként egy sor, szett-típus jelvény, ⋮ gyakorlat-menü); a sablonban a `kind` mezői mellett egy „Pihenő / mp” (cél pihenő) oszlop is van. A szett-jelvény popoverében (típus / Oldal / **Cél RPE**) állítható az egyoldali cél-szett és a cél-RPE; „+ Új szett” egyoldali szett után a kezet váltogatja, a cél-RPE-t átviszi. A gyakorlat-fejléc alatt egysoros **megjegyzés** mező (max. 200 karakter, „Megjegyzés (pl. szék: 5, 3 mp negatív)”); üresen `null`-ként mentődik.
- Sablonok lista szűrő: **Aktív** (alapértelmezett) / Inaktív / Mind; soronkénti aktív/inaktív kapcsoló (nincs szükség edit módba lépésre); opcionális `goalLabel` szerinti csoport-fejléc a listában. A címkés csoport-fejlécen ⋮ gomb → action sheet (`backlog/140`, fókuszváltás pl. „OAPU mód”): **Csoport aktiválása** (a csoport minden sablonja aktív), **Csoport inaktiválása**, **Csak ez a csoport legyen aktív** (a csoport aktív, minden más élő sablon — más csoportok és a címke nélküliek — inaktív). A művelet a szűrőtől függetlenül az összes élő sablonra hat, csak a ténylegesen változó sablonokat menti (mindegyiket a soronkénti kapcsolóval azonos nested PUT + outbox úton, `planGroupActivationChanges` — `pages/workout/plan/plan-group-activation.ts`), utána toast: „N sablon módosítva”. Megerősítés nincs: a művelet ugyanígy visszafordítható. A címke nélküli sablonoknak nincs fejléce, így csoport-menüje sem.
- A heti nézet felülíró menüje és az [[Edzésnapló]] „Terv indítása…” listája (action sheet; a „Terv indítása…”-ban „Csoport · Név”) csak aktív sablonokat kínál fel.
- Heti dashboard: 7 napos nézet. Múltbeli nap: a rögzített jelvények. Mai / jövőbeli nap: „+ Mászás” kapcsoló, és — ha a nap nem mászónap és nem rögzített — egy **előrejelzés-chip**: „Javasolt: <sablon>” (körvonalas) vagy „Pihenő”; kézi felülírásnál kitöltött, „· kézi” utótaggal. Hosszú sablonnév a chipen belül tördelődik. A mai sor végén „Edzés indítása” a mára javasolt sablonnal.
- **Kézi felülírás:** a chip tapjára action sheet — fejléc „<nap> · <dátum>”, alcím „Kézi beállítás erre a napra — a rotáció innen folytatódik.”; gombok: **Automatikus (rotáció)** (csak felülírt napon), az aktív sablonok, **Pihenőnap**, Mégse. A választás azonnal ment (a hét saját slotjai, a többi nap felülírása megmarad).
- A hét-navigátor (előző hét ◂ / hét kezdete / következő hét ▸) **egy sorban** jelenik meg, a nyilak a hét-felirat két szélén (`.week-nav` flex-sor); a felirat tapja a mai hétre ugrik.
- Thumb-zone barát CTA az indításhoz (mobil).

### Megjegyzések

Nincs bonyolult progresszió-motor — a napló ghost values / PR viszi a progresszió UX-et ([[Edzésnapló]]). A `active` sablon-szintű kapcsoló, nem „program" entitás; nincs „mikro-session" típus (a rövid kiegészítő edzések sima naplók).

Fix napi sablon-kiosztás (és annak heti öröklése) szándékosan nincs (`backlog/144`): rendszertelen mászás mellett a rotáció + egynapos kézi felülírás követi a valóságot, a fix kiosztás csak ütközéseket és kézi tologatást termelt.

Az `active` mező szándékosan sablon-szintű kapcsoló, nem egy külön „sablon-készlet” / „program” entitás — tetszőleges kombináció aktiválható egyszerre, nincs kikényszerített „csak egy aktív készlet” szabály. Nagyon gyakori, alacsony volumenű, egy-két gyakorlatos sessionök (pl. napi rövid, nem bukásig menő kiegészítő gyakorlás) külön modell nélkül, sima [[Edzésnapló]] sessionként rögzíthetők — nincs szükség rájuk külön „mikro-session” típusra.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: sablon lista/edit, heti dashboard (előrejelzés + kézi felülírás), indítás → [[Edzésnapló]] Active Workout.
- Előrejelzés: `training-forecast.ts` a helyi store-okból (nincs saját hívás); a heti nézet és a gyorsindító ugyanazt használja.
- OpenAPI generált kliens; nested sablon mentés egy requestben (mint session).

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- A heti terhelés, a rotációs előrejelzés és a terhelés-figyelmeztetések kizárólag a helyi mászó- és edzésnapló-, esemény- (tervezett mászás), heti felülírás- és sablon store-ból számolnak (nincs saját hívás), így Full-offline is teljesek. A „+ Mászás” kapcsoló a szokásos esemény-írási úton, a kézi felülírás a `WeeklyPlan` nested mentésen (helyi store + egy outbox elem) ment. Outbox payload v18: a frissítés előtt sorban álló `WeeklyPlan` mentések slotjai `kind: 'PLAN'`-t kapnak (`addWeeklyPlanSlotKindDefault`).
- Create / update / soft-delete → outbox + kliens UUID; sync: [[Szinkronizációs központ]].
- Szinkronizálatlan helyi draft elvetése: hard remove + outbox tisztítás.
- Lásd [[Backend-offline first]].

### Backend

- Táblák: `workout_plan` (`active boolean`, default `true`; `goal_label` opcionális szöveg), `workout_plan_exercise`, `workout_plan_set`, `weekly_plan` + `weekly_plan_slot` (`kind` `PLAN` | `REST`, `plan_id` nullable, CHECK: `PLAN` ↔ `plan_id` nem null — `V52`).
- OpenAPI: nested plan CRUD; weekly plan CRUD; listák `deleted = false`. Aktiválás/inaktiválás sima mező-update (nincs külön endpoint), ugyanazon a nested PUT-on megy át, mint bármely más sablon-módosítás.
- Auth / user scope.

### Nyitott kérdések

Nincs nyitott kérdés.

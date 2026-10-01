---
verifikalva: 2026-10-01
verifikalt_commit: e59bc75
---

# Heti terv

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Edzésnapló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Edzéssablonok (rutinok) és heti kiosztásuk („mit kéne csinálnod?”). Az [[Edzésnapló]] `planId` mezője a **statikus sablon** `WorkoutPlan.id`-jára mutat. Az [[Edzésnapló]] terv nélkül is teljes értékű (ad-hoc + „ugyanaz, mint legutóbb”).

Tetszőleges számú `WorkoutPlan` sablon létezhet, és közülük tetszőleges számú lehet egyszerre **aktív**. Ez teszi lehetővé, hogy egy állandó alap-rotáció (pl. „A” / „B” nap) mellett átmenetileg cél-specifikus sablonok is aktiválhatók legyenek — pl. egy időszakos edzéscél miatt bevezetett extra sablonok —, anélkül hogy az alap sablonokat törölni kellene; a blokk végén az alap sablonok egyszerűen visszaaktiválhatók.

Fejlesztési sorrend: [[Gyakorlat]] → [[Edzésnapló]] → **Heti terv**.

### Funkcionális leírás

#### Entitás — `WorkoutPlan` (statikus sablon / rutin)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `name` | Kötelező (pl. „Felsőtest A”, „Hangboard Heavy Day”) |
| `notes` | Opcionális |
| `active` | Boolean; alapértelmezett `true` létrehozáskor. Kikapcsolása **nem törlés**: a sablon megmarad a katalógusban és a rá mutató múltbeli `WorkoutSession.planId` / meglévő `WeeklyPlan` slot érintetlen, csak elrejtődik a pickerekből (heti slot kiosztás, „Edzés indítása a tervből” gyorsindítás). Bármikor visszakapcsolható. Tetszőleges számú sablon lehet egyszerre aktív — lásd „Aktív / inaktív sablonok” lent. |
| `goalLabel` | Opcionális szöveg; csoportosító címke a listában és a pickerben (pl. „Alap rotáció”, „Cél: egykezes húzódzkodás”). Egyetlen hozzá kötött művelet a csoport egy koppintásos (de)aktiválása (`backlog/140`, lásd UI); a csoport kulcsa a trimmelt címke |
| `defaultWorkoutType` | Opcionális `GENERAL_WEIGHTS` \| `HIIT_CIRCUIT` — session indításkor előtöltés |
| `exercises` | `WorkoutPlanExercise[]` (nested) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

#### Aktív / inaktív sablonok

- Új sablon létrehozáskor `active = true`. A sablon lista fejlécén / soronként kapcsolható; nincs szükség edit módba lépésre.
- **Pickerek csak aktív, nem törölt sablonokat listáznak**: heti dashboard slot kiosztás, [[Edzésnapló]] „Terv indítása” gyorsindítás. A sablon lista (katalógus) képernyő viszont Aktív / Inaktív / Mind szűrővel az inaktívakat is mutatja, hogy visszakapcsolhatók legyenek.
- Egy már kiosztott `WeeklyPlan` slot vagy múltbeli session `planId`-je akkor is érvényes marad, ha az általa hivatkozott sablon időközben inaktívvá válik — az `active` mező **nem** befolyásolja a visszamenőleges adherence-t (lásd lent), csak azt, hogy a sablon felkínálásra kerül-e új session indításkor / új slot kiosztáskor.
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

#### Entitás — `WeeklyPlan` (adott naptári hét kiosztása)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `weekStartDate` | A hét hétfője (kliens TZ, ISO date) |
| `slots` | Nap → opcionális `planId` (Hétfő…Vasárnap; max egy sablon / nap — partial unique index `(weekly_plan_id, day_of_week) WHERE deleted = false`) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

**Állandó beosztás — öröklés előre (`backlog/127`):** a heti beosztást nem kell hetente újra megadni. Egy hét, amelynek **nincs saját** élő `WeeklyPlan` sora, a legutóbbi **korábbi**, saját sorral rendelkező hét slotjait örökli (`resolveEffectiveWeek`, `weekly-plan-adherence.ts`); saját sor — akár üres, azaz tudatosan edzésmentes hét — mindig az öröklött fölött nyer. Az első valaha beállított hét előtt minden hét üres. Az öröklés csak visszafelé néz, ezért egy hét módosítása soha nem változtat korábbi hetet (és annak adherence-ét). Tisztán kliensoldali feloldás: az adatmodell, a determinisztikus UUID v5 `(userId, weekStartDate)` azonosító és a szinkron változatlan.

**Módosítás érvényessége** (szegmens a heti nézet tetején, alapértelmezés „Mostantól”): egy nap kiosztásakor / törlésekor a hét teljes érvényes (saját vagy örökölt) beosztása a hét **saját sorává** mentődik — az örökölt slot-id soha nem kerül át másik hét mentésébe.
- **„Mostantól”** — csak az adott hét mentődik; minden későbbi, saját sor nélküli hét ezt örökli.
- **„Csak erre a hétre”** — egyszeri kivétel: ha a következő hétnek még nincs saját sora, előbb az kapja meg a módosítás *előtti* beosztást, így a kivétel utáni héten az korábbi rend folytatódik.

#### Tudatos korlát

Egy későbbi hét, amelynek már saját sora van (pl. egy korábbi „Csak erre a hétre” visszaállító sora), egy „Mostantól” módosításkor megtartja a saját beosztását — a heti nézetben ez nem „örökölt”-ként jelenik meg, így látható.

#### Indítás és adherence

- **„Edzés indítása a tervből”:** a slot / sablon `WorkoutPlan`-jából új `WorkoutSession`; gyakorlatok + cél szettek előtöltve; `planId` = sablon ID. Eltérés szabad. Tartományos cél-ismétlésnél a session szett `reps`-e a határok átlaga **felfelé kerekítve** (`8–12 → 10`, `8–11 → 10`), a tartomány pedig „cél: 8–11” segédszövegként látszik az ismétlés-mező alatt.
- **Teljesítve (adherence):** az adott héten létezik nem törölt `WorkoutSession`, ahol `planId` = a slot sablon ID-ja **és** `date` az adott `weekStartDate` hetébe esik. Nincs tartalmi egyezés-vizsgálat.
- Egy sablon **többször** is teljesíthető egy héten (több session ugyanazzal a `planId`-del); a jelvényhez elég ≥1.

#### Heti terhelés (`backlog/137`)

A dashboard a beosztás mellett a hét **tényleges** terhelését is mutatja, a helyi [[Mászónapló]] és [[Edzésnapló]] alapján (`pages/workout/training-load.ts`, tiszta TS):

- Naponként: `climbing` = aznapi élő mászó-sessionök száma; `workouts` = aznapi élő edzésnapló-sessionök száma; `fingerLoad` = mászás **vagy** egy élő `FOREARM_FINGERS` kategóriájú / `HANGBOARD_PINCH` kindú gyakorlat aznapi edzésben; `rest` = se mászás, se edzésnapló (úszás, bicikli, lépés könnyű aktivitás — nem töri meg a pihenőnapot).
- Napsoronként jelvények a dátum alatt: **Mászás**, **Edzés** (csak ha a nap „Teljesítve” jelvényt nem kapott — a nem a slot-sablonból indított edzés), **Ujjterhelés** (ujj-gyakorlat mászás nélkül), **Pihenő** (csak mai / múltbeli napon; a jövőbeli nap még nem „pihent”).
- Felül összesítő a naptári hétre: „Mászás X nap · Edzés Y nap · Pihenőnap Z” (a pihenőnap a mai napig számol); ha van még előttünk álló tervezett mászás: „Mászás X nap (+Y tervezett) · …”. Hétváltáskor a megjelenített hétre számol.

#### Tervezett mászás (`backlog/143`)

A tervezett mászás egy `CLIMBING` típusú [[Események|esemény]] (egyszeri vagy ismétlődő; szinkronizál, a [[Naptár]]ban is látszik). A terhelés-sor (`plannedClimbDates` → `dailyTrainingLoad`) szabálya: **a múltra mindig a rögzített adat számít, mára és a jövőre a terv is**.

- `plannedClimb` = ma / jövőbeli nap, tervezett mászással, rögzített mászó-session nélkül — nem pihenőnap, a szabályok mászónapként kezelik. Ha a mászást rögzíted, a nap sima „Mászás”.
- `missedClimb` = múltbeli nap, terv volt, rögzítés nincs → szürke **„Elmaradt mászás”** jelvény; a számításban az a nap a tényleges adata szerint számít (pl. pihenőnap).
- Napsoron (ma / jövő, rögzített mászás nélkül) kapcsoló-gomb: **„+ Mászás”** (körvonalas) → egyszeri, egész napos „Mászás” esemény létrehozása; **„Mászás (tervezett)”** (kitöltött) → az aznapi egyszeri mászás-esemény(ek) törlése. Ha a napot csak ismétlődő mászás-esemény fedi, a tap az esemény szerkesztőjét nyitja (egy előfordulás nem törölhető külön — az [[Események]]ben nincs előfordulás-kivétel).
- **„Ütközés — edzés áthelyezése javasolt”** jelvény: a napon heti slot sablon van (még nem teljesítve) **és** tervezett mászás.

#### Rotációs javaslat (`backlog/139`)

A fix napkiosztás mellett (nem helyette) az [[Edzésnapló]] terv-gyorsindítója rotációt is javasol: a „Következő javasolt” az aktív, élő sablonok közül a legrégebben teljesített (`planId` szerinti utolsó élő session dátuma; sosem teljesített → elsőbbség; holtversenyben a sablon-sorrend). Így egy A/B pár a ténylegesen edzett napokon halad tovább, a mászásmentes napok rendszertelensége nem töri meg. Ha a mai napra van (öröklött) heti slot, az elsőbbséget élvez, a rotációs javaslat csak alternatíva. A fókuszváltás (pl. „OAPU mód”) a sablon-csoport kapcsolóval (`backlog/140`) történik: csak az aktív sablonok vesznek részt a rotációban. **Mászás közelében** (`backlog/143`: ma rögzített / tervezett, vagy holnap tervezett mászás) a javaslat kihagyja az ujjgyakorlatos sablonokat (élő `FOREARM_FINGERS` / `HANGBOARD_PINCH` gyakorlattal) és a következő ujjgyakorlat nélkülit ajánlja; ha minden maradék sablon ujjas, a soron következőt ajánlja, alatta „Minden aktív sablonban van ujjgyakorlat…” jelzéssel. Tiszta TS: `pages/workout/rotation-suggestion.ts` (`rotationOrder`, `suggestNextPlan`, `planHasFingerLoad`, `todaySlotPlan`, `doneToday`).

#### Terhelés-figyelmeztetések (`backlog/138`)

Tiszta szabálymotor (`pages/workout/load-warnings.ts`) a fenti napi terhelés-soron, mindig a **mai** naphoz (a megjelenített héttől függetlenül). Csak tanács — a szövegezés „javasolt”, semmit nem tilt, push-értesítés nincs. A küszöbök konstansok (`REST_WINDOW_DAYS = 7`, `FINGER_LOAD_DAYS_LIMIT = 5`, `MANY_CLIMBS_PER_WEEK = 4`, `REST_AHEAD_DAYS = 7`). Bemenet (`LoadWarningSources`): mászó- és edzésnapló, események (tervezett mászás, `backlog/143`), heti beosztás + sablonok.

| Kód | Súlyosság | Feltétel | Szöveg (hu) |
|---|---|---|---|
| `NO_REST_DAY` | figyelmeztetés | a ma előtti 7 nap egyike sem pihenőnap | „Az elmúlt 7 napban nem volt pihenőnap — heti 1–2 teljes pihenőnap javasolt.” |
| `FINGER_LOAD` | figyelmeztetés | a gördülő 7 napban (ma is) ≥ 5 ujjterhelő nap | „…az ínak és a pulley-k lassan regenerálódnak, pihentetés javasolt.” |
| `NO_REST_AHEAD` | figyelmeztetés | a következő 7 napban (ma is) van tervezett mászás, és egyetlen nap sem szabad (szabad = se rögzített / tervezett mászás, se edzés, se heti slot sablon) — `backlog/143` | „A tervezett mászások és a heti beosztás mellett a következő 7 napban nem marad pihenőnap — érdemes egy napot szabadon hagyni.” |
| `CLIMBED_TODAY` | info | ma van mászó-session | „Ma már másztál — ma legfeljebb rövid törzs / prehab edzés javasolt.” |
| `CLIMB_PLANNED_TODAY` | info | mára mászás van tervezve (még nincs rögzítve) — `backlog/143` | „Mára mászás van tervezve — ma legfeljebb rövid törzs / prehab edzés javasolt.” |
| `CLIMB_TOMORROW` | info | holnapra mászás van tervezve — `backlog/143` | „Holnap mászás — ma ujj- és nehéz húzóedzés nem javasolt.” |
| `MANY_CLIMBS` | info | a naptári héten (hétfő–vasárnap) ≥ 4 mászónap, a rögzítettek **és** a még előttünk álló tervezettek együtt | „Sok mászás a héten — az otthoni húzó- és ujjedzés kihagyható.” |

Megjelenés: nem blokkoló sáv(ok) (`app-load-warnings-banner`, figyelmeztetés: sárgás háttér + ⚠ ikon, info: szürke) a Heti terv dashboard tetején és az [[Edzésnapló]] lista tetején; figyelmeztetés nélkül nem renderel semmit. Sorrend: előbb a figyelmeztetések, aztán az infók.

CRUD: sablon lista/szerkesztő; heti dashboard slot szerkesztés; soft delete sablonra / hétre (megerősítéssel). Sablon soft delete után a múltbeli sessionök `planId`-je megmarad; új slotba nem választható.

### UI/UX elvárások

- Sablonok lista + nested gyakorlat/cél-szett szerkesztő ([[Gyakorlat]] picker). Az ismétlésszám mező szöveges (`inputmode="tel"` — számbillentyűzet kötőjellel): `N` vagy `N-M` (szóköz, en-dash tűrve; `N-N` egyetlen értékké egyszerűsödik); értelmezhetetlen vagy fordított tartománynál a mező kerete piros, a szett sora alatt teljes szélességű hibaüzenet, és a mentés blokkolva. A parse / megjelenítés mezőtől független (`shared/target-range.ts`), hogy később más cél-mezők is kaphassanak tartományt. A cél-szett táblázat elrendezése az [[Edzésnapló]]-val közös (oszlopfejléc + szettenként egy sor, szett-típus jelvény, ⋮ gyakorlat-menü); a sablonban a `kind` mezői mellett egy „Pihenő / mp” (cél pihenő) oszlop is van. A szett-jelvény popoverében (típus / Oldal / **Cél RPE**) állítható az egyoldali cél-szett és a cél-RPE; „+ Új szett” egyoldali szett után a kezet váltogatja, a cél-RPE-t átviszi. A gyakorlat-fejléc alatt egysoros **megjegyzés** mező (max. 200 karakter, „Megjegyzés (pl. szék: 5, 3 mp negatív)”); üresen `null`-ként mentődik.
- Sablonok lista szűrő: **Aktív** (alapértelmezett) / Inaktív / Mind; soronkénti aktív/inaktív kapcsoló (nincs szükség edit módba lépésre); opcionális `goalLabel` szerinti csoport-fejléc a listában. A címkés csoport-fejlécen ⋮ gomb → action sheet (`backlog/140`, fókuszváltás pl. „OAPU mód”): **Csoport aktiválása** (a csoport minden sablonja aktív), **Csoport inaktiválása**, **Csak ez a csoport legyen aktív** (a csoport aktív, minden más élő sablon — más csoportok és a címke nélküliek — inaktív). A művelet a szűrőtől függetlenül az összes élő sablonra hat, csak a ténylegesen változó sablonokat menti (mindegyiket a soronkénti kapcsolóval azonos nested PUT + outbox úton, `planGroupActivationChanges` — `pages/workout/plan/plan-group-activation.ts`), utána toast: „N sablon módosítva”. Megerősítés nincs: a művelet ugyanígy visszafordítható. A címke nélküli sablonoknak nincs fejléce, így csoport-menüje sem.
- Heti dashboard slot kiosztás pickere és az [[Edzésnapló]] „Terv indítása…” gyorsindítás listája (action sheet, „Csoport · Név”) csak aktív sablonokat kínál fel, `goalLabel` szerint csoportosítva, ha van címke.
- Heti dashboard: 7 napos nézet; naphoz sablon rendelés; „Teljesítve” jelvény adherence szerint; CTA: Edzés indítása.
- A hét-navigátor (előző hét ◂ / hét kezdete / következő hét ▸) **egy sorban** jelenik meg, a nyilak a hét-felirat két szélén (`.week-nav` flex-sor); a felirat tapja a mai hétre ugrik.
- Örökölt hétnél jelzés: „A <dátum> héten beállított beosztás érvényes (öröklött)”; „Mostantól” / „Csak erre a hétre” szegmens a módosítás érvényességéhez. (A korábbi „Másolás következő hétre” akció megszűnt — az öröklés feleslegessé tette.)
- Thumb-zone barát CTA az indításhoz (mobil).

### Megjegyzések

Nincs bonyolult progresszió-motor — a napló ghost values / PR viszi a progresszió UX-et ([[Edzésnapló]]). A `active` sablon-szintű kapcsoló, nem „program" entitás; nincs „mikro-session" típus (a rövid kiegészítő edzések sima naplók).

Az `active` mező szándékosan sablon-szintű kapcsoló, nem egy külön „sablon-készlet” / „program” entitás — tetszőleges kombináció aktiválható egyszerre, nincs kikényszerített „csak egy aktív készlet” szabály. Nagyon gyakori, alacsony volumenű, egy-két gyakorlatos sessionök (pl. napi rövid, nem bukásig menő kiegészítő gyakorlás) külön modell nélkül, sima [[Edzésnapló]] sessionként rögzíthetők — nincs szükség rájuk külön „mikro-session” típusra.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: sablon lista/edit, heti dashboard, másolás, indítás → [[Edzésnapló]] Active Workout.
- Adherence: helyi session store lekérdezés `planId` + dátumtartomány.
- OpenAPI generált kliens; nested sablon mentés egy requestben (mint session).

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- A heti terhelés és a terhelés-figyelmeztetések kizárólag a helyi mászó- és edzésnapló-, esemény- (tervezett mászás) és heti terv store-ból számolnak (nincs saját hívás), így Full-offline is teljesek. A „+ Mászás” kapcsoló a szokásos esemény-írási úton (helyi store + outbox) ment.
- Create / update / soft-delete → outbox + kliens UUID; sync: [[Szinkronizációs központ]].
- Szinkronizálatlan helyi draft elvetése: hard remove + outbox tisztítás.
- Lásd [[Backend-offline first]].

### Backend

- Táblák: `workout_plan` (`active boolean`, default `true`; `goal_label` opcionális szöveg), `workout_plan_exercise`, `workout_plan_set` (vagy JSON nested), `weekly_plan` (+ slotok).
- OpenAPI: nested plan CRUD; weekly plan CRUD; listák `deleted = false`. Aktiválás/inaktiválás sima mező-update (nincs külön endpoint), ugyanazon a nested PUT-on megy át, mint bármely más sablon-módosítás.
- Auth / user scope.

### Nyitott kérdések

Nincs nyitott kérdés.

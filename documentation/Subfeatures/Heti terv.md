---
verifikalva:
verifikalt_commit:
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
| `goalLabel` | Opcionális szöveg; tisztán megjelenítési célú csoportosító címke a listában és a pickerben (pl. „Alap rotáció”, „Cél: egykezes húzódzkodás”) — nincs hozzá üzleti logika |
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
| `targetSets` | Cél szettek listája: `setType`, cél `reps` / `weightKg` / `holdTimeSeconds` / `edgeSizeMm` / `distanceMeters` / `restTimeSeconds` — a `exerciseKind` szerint releváns mezők |

Indításkor az [[Edzésnapló]] átmásolja ezeket session entry / set előtöltésnek; a session `planId = WorkoutPlan.id`.

`targetSets` szabad `setType`-listája már önmagában kifejezi a bemelegítő ramping (több könnyű `WARMUP` szett) + kevés, nehéz `WORKING` szett (alacsony ismétlésszám, hosszú cél `restTimeSeconds`) mintát — nincs szükség külön mezőre a bemelegítés/munka szétválasztásához, sem külön „intenzitás” mezőre: az explicit `FAILURE` típus jelzi, ha egy szett tudatosan a bukásig megy, minden más `WORKING` szett hallgatólagosan tartalék ismétléssel (RIR) végzett.

#### Entitás — `WeeklyPlan` (adott naptári hét kiosztása)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `weekStartDate` | A hét hétfője (kliens TZ, ISO date) |
| `slots` | Nap → opcionális `planId` (Hétfő…Vasárnap; max egy sablon / nap az első körben) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

**Másolás következő hétre:** a aktuális `WeeklyPlan` slotjai új `weekStartDate`-tel másolhatók (új UUID-k).

#### Indítás és adherence

- **„Edzés indítása a tervből”:** a slot / sablon `WorkoutPlan`-jából új `WorkoutSession`; gyakorlatok + cél szettek előtöltve; `planId` = sablon ID. Eltérés szabad.
- **Teljesítve (adherence):** az adott héten létezik nem törölt `WorkoutSession`, ahol `planId` = a slot sablon ID-ja **és** `date` az adott `weekStartDate` hetébe esik. Nincs tartalmi egyezés-vizsgálat.
- Egy sablon **többször** is teljesíthető egy héten (több session ugyanazzal a `planId`-del); a jelvényhez elég ≥1.

CRUD: sablon lista/szerkesztő; heti dashboard slot szerkesztés; soft delete sablonra / hétre (megerősítéssel). Sablon soft delete után a múltbeli sessionök `planId`-je megmarad; új slotba nem választható.

### UI/UX elvárások

- Sablonok lista + nested gyakorlat/cél-szett szerkesztő ([[Gyakorlat]] picker).
- Sablonok lista szűrő: **Aktív** (alapértelmezett) / Inaktív / Mind; soronkénti aktív/inaktív kapcsoló (nincs szükség edit módba lépésre); opcionális `goalLabel` szerinti csoport-fejléc a listában.
- Heti dashboard slot kiosztás pickere és az [[Edzésnapló]] „Terv indítása” gyorsindítás listája csak aktív sablonokat kínál fel, `goalLabel` szerint csoportosítva, ha van címke.
- Heti dashboard: 7 napos nézet; naphoz sablon rendelés; „Teljesítve” jelvény adherence szerint; CTA: Edzés indítása.
- „Másolás következő hétre” akció.
- Thumb-zone barát CTA az indításhoz (mobil).

### Megjegyzések

Nincs bonyolult progresszió-motor az első körben — a napló ghost values / PR viszi a progresszió UX-et ([[Edzésnapló]]).

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
- Create / update / soft-delete → outbox + kliens UUID; sync: [[Szinkronizációs központ]].
- Szinkronizálatlan helyi draft elvetése: hard remove + outbox tisztítás.
- Lásd [[Backend-offline first]].

### Backend

- Táblák: `workout_plan` (`active boolean`, default `true`; `goal_label` opcionális szöveg), `workout_plan_exercise`, `workout_plan_set` (vagy JSON nested), `weekly_plan` (+ slotok).
- OpenAPI: nested plan CRUD; weekly plan CRUD; listák `deleted = false`. Aktiválás/inaktiválás sima mező-update (nincs külön endpoint), ugyanazon a nested PUT-on megy át, mint bármely más sablon-módosítás.
- Auth / user scope.

### Nyitott kérdések

Nincs nyitott kérdés.

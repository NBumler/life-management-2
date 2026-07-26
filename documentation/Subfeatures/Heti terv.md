# Heti terv

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Edzésnapló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

Edzéssablonok (rutinok) és heti kiosztásuk („mit kéne csinálnod?”). Az [[Edzésnapló]] `planId` mezője a **statikus sablon** `WorkoutPlan.id`-jára mutat. Az [[Edzésnapló]] terv nélkül is teljes értékű (ad-hoc + „ugyanaz, mint legutóbb”).

Fejlesztési sorrend: [[Gyakorlat]] → [[Edzésnapló]] → **Heti terv**.

### Funkcionális leírás

#### Entitás — `WorkoutPlan` (statikus sablon / rutin)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `name` | Kötelező (pl. „Felsőtest A”, „Hangboard Heavy Day”) |
| `notes` | Opcionális |
| `defaultWorkoutType` | Opcionális `GENERAL_WEIGHTS` \| `HIIT_CIRCUIT` — session indításkor előtöltés |
| `exercises` | `WorkoutPlanExercise[]` (nested) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

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
- Heti dashboard: 7 napos nézet; naphoz sablon rendelés; „Teljesítve” jelvény adherence szerint; CTA: Edzés indítása.
- „Másolás következő hétre” akció.
- Thumb-zone barát CTA az indításhoz (mobil).

### Megjegyzések

Nincs bonyolult progresszió-motor az első körben — a napló ghost values / PR viszi a progresszió UX-et ([[Edzésnapló]]).

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

- Táblák: `workout_plan`, `workout_plan_exercise`, `workout_plan_set` (vagy JSON nested), `weekly_plan` (+ slotok).
- OpenAPI: nested plan CRUD; weekly plan CRUD; listák `deleted = false`.
- Auth / user scope.

### Nyitott kérdések

Nincs nyitott kérdés.

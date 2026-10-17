---
verifikalva: 2026-10-17
verifikalt_commit: c6a3b27
---

# Gyakorlat

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Heti terv]], [[Edzésnapló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Egyedi gyakorlatok master / törzsadat katalógusa („mit csinálhatsz?”), **két típussal** (`backlog/167`):
**erősítő** (terhelő) gyakorlatok — az `Exercise` entitás, ezeket használja az [[Edzésnapló]] és a
[[Heti terv]] — és **nyújtó** gyakorlatok — a külön `StretchExercise` entitás, saját, egyszerűbb
mezőkészlettel. A két típus egy közös katalógus-listában látszik. A típus nem oszlop: két külön tábla, így
minden korábbi gyakorlat adatmódosítás nélkül erősítő maradt.

Az [[Edzésnapló]] session entry-k `exerciseId`-re hivatkoznak, és **snapshotolják** a nevet, `ExerciseCategory`-t és `ExerciseKind`-ot — master átnevezés vagy törlés nem rontja a múltbeli sessionöket.

Fejlesztési sorrend: **Gyakorlat → [[Edzésnapló]] → [[Heti terv]]**.

### Funkcionális leírás

#### Enum — `ExerciseCategory`

Célzott izomcsoport / domén (picker chipek, statisztika):

| Érték | Jelentés |
|---|---|
| `CHEST` | Mell |
| `BACK` | Hát |
| `LEGS` | Láb (combfeszítő, hajlító, vádli) |
| `SHOULDERS` | Váll |
| `BICEPS` | Bicepsz |
| `TRICEPS` | Tricepsz |
| `ABS` | Has (rectus abdominis) |
| `LOWER_BACK` | Mélyhát (erector spinae, mély stabilizátorok) |
| `OBLIQUES` | Oldalsó törzs (ferde hasizmok) |
| `FOREARM_FINGERS` | Alkar, ujjak (mászóspecifikus) |
| `FULL_BODY` | Egész test / összetett kardió |
| `HIPS` | Csípő, farizom (`backlog/167`) |
| `NECK` | Nyak (`backlog/167`) |

A `HIPS` / `NECK` értéket a nyújtások miatt vezette be a `V57` (csak bővítés, meglévő sor nem változott);
mindkét típus használhatja. A két típus **ugyanazt** az értékkészletet használja, így a katalógus
kategória-chipjei típustól függetlenül szűrnek.

#### Migrációs jegyzet — `ARMS` / `CORE` felbontás (backlog/065)

Korábban egy `ARMS` (kar) és egy `CORE` (has + mélyhát + törzs) érték volt. A `V35__exercise_category_split_arms_core.sql`
(on-device: `SCHEMA_V34`) a meglévő `exercise_catalog.category` sorokat **és** az [[Edzésnapló]] /
[[Heti terv]] snapshotokat (`workout_exercise_entry` / `workout_plan_exercise`) a legvalószínűbb új
értékre képezte: **`ARMS` → `BICEPS`**, **`CORE` → `ABS`**. Ez tudatosan **lossy** (egy régi
tricepszes vagy oldalsó-törzs gyakorlat is `BICEPS` / `ABS` lett) — a felhasználó a gyakorlat
szerkesztőben utólag átállíthatja, a snapshotok pedig nem viselkedést befolyásoló adatok. A friss
`exercise-seed.json` már a pontos értéket adja („Tricepsz nyújtás" → `TRICEPS`, „Plank" → `ABS`),
így egy már leseedelt telepítésen a régi 3 seed-sor a lossy megfeleltetést kapja, egy új telepítés a
pontosat.

#### Enum — `ExerciseKind`

Meghatározza az [[Edzésnapló]] szett beviteli mezőit:

| Érték | UI mezők a szetten | Példa |
|---|---|---|
| `WEIGHTED_REPS` | `reps` + `weightKg` | Fekvenyomás, súlyos húzódzkodás |
| `BODYWEIGHT_REPS` | `reps` (+ opcionális `weightKg` rásegítéshez / súlyhoz) | Fekvőtámasz, súlytalan húzódzkodás |
| `ISOMETRIC_TIME` | `holdTimeSeconds` (+ opcionális `weightKg`) | Plank, L-sit |
| `HANGBOARD_PINCH` | `edgeSizeMm` + `holdTimeSeconds` + opcionális `weightKg` | 20 mm léc, pinch block |
| `CARDIO_TIME_DIST` | `holdTimeSeconds` + `distanceMeters` | Evezőgép, futópad |

#### Entitás — `Exercise`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; **egyedi a user élő katalógusán belül** — összehasonlítási szabály: [[Névegyediség]]. Törölt név újra felvehető. |
| `category` | Kötelező `ExerciseCategory` |
| `kind` | Kötelező `ExerciseKind` |
| `defaultRestTimeSeconds` | Opcionális egész `> 0`; élő Rest Timer alapértelmezés az [[Edzésnapló]]ban |
| `isFavorite` | Boolean; default `false` |
| `equipment` | Opcionális szöveg (eszközigény) |
| `description` | Opcionális szabad szöveg (cue / variáns / cél; max. **1000** karakter). **Nem** része a [[Névegyediség]] összehasonlításnak, és az [[Edzésnapló]] session entry **nem snapshotolja** — nem viselkedést befolyásoló adat (szemben a `category` / `kind` mezőkkel). |
| `deleted` | Soft delete flag (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

#### Entitás — `StretchExercise` (nyújtó gyakorlat, `backlog/167`)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja |
| `name` | Kötelező; **egyedi a user élő nyújtó gyakorlatai között** — [[Névegyediség]]. Külön névtér az erősítő gyakorlatoktól (lehet „Hát” nevű erősítő és nyújtó is). |
| `category` | Kötelező, a fenti `ExerciseCategory` |
| `description` | Opcionális szabad szöveg, max. **1000** karakter (leírás / megjegyzés) |
| `equipment` | Opcionális szöveg (eszközigény) |
| `isFavorite` | Boolean; default `false` |
| `defaultHoldSeconds` | Kötelező egész `> 0`, alapból **30** — előtöltés: nyújtó sablon tételébe felvételkor ez lesz a tartás |
| `defaultPerSide` | Boolean, alapból `false` — előtöltés: a tétel oldalanként (bal, majd jobb) fut-e |
| `deleted` | Soft delete flag; listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs `kind`, `defaultRestTimeSeconds` és szett-modell — ezek az erősítő naplózáshoz tartoznak. A két
`default*` mező csak előtöltés: a sablon-tétel saját másolatot tárol, a gyakorlat utólagos módosítása nem
írja át a meglévő tételeket. Nincs seed. Törlés: soft delete megerősítéssel.

Nincs kötelező „alapértelmezett szett / súly sablon” a masteren — a cél reps/súly a [[Heti terv]] sablonján és az [[Edzésnapló]] ghost values-ön él.

**Seed:** első indításkor (üres store) az `assets/data/exercise-seed.json` **12 beépített, magyar nevű** gyakorlata kerül a helyi store-ba, és syncelődik a backendre. Minden seed sor user-owned másolat, determinisztikus v5 kliens UUID-val (`Exercise:<userId>:<normalizedName>`), nincs külön shared rendszer-katalógus. (Weben a seed-latch localStorage-ban él.)

**Ad-hoc az [[Edzésnapló]]ból:** új név → opcionálisan új `Exercise` a katalógusba (`category` / `kind` kitöltendő a mentéskor).

**Törlés:** soft delete (`deleted`). Az [[Edzésnapló]] múltbeli snapshotok érintetlenek. A [[Heti terv]] sablonok hivatkozásainál: törölt gyakorlat ne jelenjen meg pickerben; **meglévő terv-tételek snapshotja (`exerciseName`/`exerciseCategory`/`exerciseKind`) megmarad, nincs külön UI figyelmeztetés** — a sablon a törléskori snapshottal továbbra is használható (edzés indítható belőle), csak a picker nem ajánlja fel újraválasztásra a törölt gyakorlatot.

CRUD: lista (nem töröltek), létrehozás, szerkesztés, soft delete (megerősítéssel).

### UI/UX elvárások

- Katalógus lista: az erősítő és a nyújtó gyakorlatok **egy**, név szerint rendezett listában (azonos névnél az erősítő elöl). Kereső, Kedvencek chip, **típus-chipek** (Erősítés / Nyújtás) és `category` chipek. A típus- és a kategória-chipek **többszörösen** kiválaszthatók (`backlog/167`, `pages/workout/exercises/catalog-filter.ts`): csoporton belül **VAGY**, a csoportok (típus, kategória, Kedvencek, kereső) között **ÉS** — „Hát + Nyújtás” = hátnyújtások, „Hát + Mell” = hát vagy mell mindkét típusból, semmi kijelölve = minden; újratap kiveszi a chipet. Soron: név, kategória, erősítőnél a kind, nyújtónál „Nyújtás”, eszközigény, és — ha van — a `description` első **1–2 sora** csonkolással. A kereső a névre, az `equipment`-re és a `description`-re is illeszt. Tap: erősítő → `exercises/:id`, nyújtó → `exercises/stretch/:id`.
- „Új gyakorlat”: a szerkesztő tetején **Erősítés | Nyújtás** szegmens (alapból Erősítés). Nyújtásra váltva a nyújtó szerkesztő nyílik a helyén (`replaceUrl`); a szegmens az első mező, így gépelt adat nem vész el. Szerkesztéskor a szegmens nem látszik — a típus utólag nem váltható (két külön entitás).
- Erősítő create / edit: név, `category`, `kind`, opcionális `defaultRestTimeSeconds`, `equipment`, `description` (többsoros, auto-növő mező), kedvenc toggle.
- Nyújtó create / edit: név, `category`, **Alap tartás (mp)**, **Oldalanként** kapcsoló (segédszöveg: „Sablonba felvételkor ezzel töltődik elő.”), eszközigény, leírás / megjegyzés, kedvenc toggle.
- Feature flag `edzes.nyujtas` (alapból be): kikapcsolva nincsenek nyújtó sorok és típus-chipek, a szegmens nem jelenik meg, az `exercises/stretch/:id` route guardolt.
- `kind` választás után rövid hint, mely szett-mezők jelennek meg az [[Edzésnapló]]ban.
- Megosztott picker komponens a naplóval / hetí tervvel (search + chipek + kedvencek + ad-hoc) — **csak erősítő** gyakorlatokat kínál.
- Törlés: megerősítés → soft delete.

### Megjegyzések

Snapshot mezők a napló `WorkoutExerciseEntry`-jén: `exerciseName`, `exerciseCategory`, `exerciseKind` — lásd [[Edzésnapló]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Katalógus képernyők + megosztott exercise picker. Nyújtó gyakorlat: `StretchExerciseRepository` (`core/data/stretch-exercise.repository.ts`, az `ExerciseRepository` tükre seed nélkül), `StretchExerciseEditPage`; a lista szűrője tiszta függvény (`catalog-filter.ts`).
- Seed JSON betöltés első indításkor (ha üres a store).
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / soft-delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Szinkronizálatlan, soha fel nem küldött helyi tétel elvetése: helyi hard remove + outbox tisztítás.
- Nyújtó gyakorlat (`backlog/167`): ugyanígy — helyi `stretch_exercise` tábla (`SCHEMA_V52`), outbox entitás `StretchExercise`, a sync-központ Fix ága a saját névterében keres név-ütközést. Outbox payload v22 (új entitás + a `HIPS` / `NECK` enum-bővítés; minden lépés identity).
- Lásd [[Backend-offline first]] (napló / master soft delete elv).

### Backend

- Tábla: `exercise_catalog` (`id` UUID, `name`, `category`, `kind`, `default_rest_time_seconds`, `is_favorite`, `equipment`, `description` (`text`, `CHECK char_length ≤ 1000`), `deleted` / `deleted_at`, audit). A `category` `text` + `exercise_catalog_category_check` CHECK a 13 értékre (`V57` óta: `CHEST`, `BACK`, `LEGS`, `SHOULDERS`, `BICEPS`, `TRICEPS`, `ABS`, `LOWER_BACK`, `OBLIQUES`, `FOREARM_FINGERS`, `FULL_BODY`, `HIPS`, `NECK`). A `sync_changes` view érintetlen (csak `id` / `user_id` / `updated_at` / `deleted` oszlopokat vetít).
- Tábla: `stretch_exercise` (`V57`, `backlog/167`): `id`, `user_id`, `name` / `name_normalized` (partial unique index élő sorokra), `category` (CHECK, 13 érték), `description` (≤ 1000), `equipment`, `is_favorite`, `default_hold_seconds` (`> 0`, default 30), `default_per_side`, soft delete, audit; szerepel a `sync_changes` view-ban (`StretchExercise`). A `V57` a három meglévő category CHECK-et (`exercise_catalog`, `workout_exercise_entry`, `workout_plan_exercise`) `HIPS` / `NECK`-kel bővítette.
- OpenAPI CRUD (`/api/exercises`, `/api/stretch-exercises`); listák alapból `deleted = false`. A category enum mindkét sémában inline (nem közös `$ref`), azonos értékekkel.
- Auth / user scope: a bejelentkezett user saját katalógusa (seed = userhez másolt sorok).

### Nyitott kérdések

Nincs nyitott kérdés.

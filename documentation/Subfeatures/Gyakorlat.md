---
verifikalva: 2026-09-06
verifikalt_commit: 6ca6bc6
---

# Gyakorlat

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Heti terv]], [[Edzésnapló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Egyedi gyakorlatok master / törzsadat katalógusa („mit csinálhatsz?”). Az [[Edzésnapló]] session entry-k `exerciseId`-re hivatkoznak, és **snapshotolják** a nevet, `ExerciseCategory`-t és `ExerciseKind`-ot — master átnevezés vagy törlés nem rontja a múltbeli sessionöket.

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

Nincs kötelező „alapértelmezett szett / súly sablon” a masteren — a cél reps/súly a [[Heti terv]] sablonján és az [[Edzésnapló]] ghost values-ön él.

**Seed:** első indításkor (üres store) az `assets/data/exercise-seed.json` **12 beépített, magyar nevű** gyakorlata kerül a helyi store-ba, és syncelődik a backendre. Minden seed sor user-owned másolat, determinisztikus v5 kliens UUID-val (`Exercise:<userId>:<normalizedName>`), nincs külön shared rendszer-katalógus. (Weben a seed-latch localStorage-ban él.)

**Ad-hoc az [[Edzésnapló]]ból:** új név → opcionálisan új `Exercise` a katalógusba (`category` / `kind` kitöltendő a mentéskor).

**Törlés:** soft delete (`deleted`). Az [[Edzésnapló]] múltbeli snapshotok érintetlenek. A [[Heti terv]] sablonok hivatkozásainál: törölt gyakorlat ne jelenjen meg pickerben; **meglévő terv-tételek snapshotja (`exerciseName`/`exerciseCategory`/`exerciseKind`) megmarad, nincs külön UI figyelmeztetés** — a sablon a törléskori snapshottal továbbra is használható (edzés indítható belőle), csak a picker nem ajánlja fel újraválasztásra a törölt gyakorlatot.

CRUD: lista (nem töröltek), létrehozás, szerkesztés, soft delete (megerősítéssel).

### UI/UX elvárások

- Katalógus lista: kereső, `category` chipek, Kedvencek szűrő; soron: név, kategória, kind jelölés, és — ha van — a `description` első **1–2 sora** csonkolással. A kereső a névre, az `equipment`-re és a `description`-re is illeszt.
- Create / edit: név, `category`, `kind`, opcionális `defaultRestTimeSeconds`, `equipment`, `description` (többsoros, auto-növő mező), kedvenc toggle.
- `kind` választás után rövid hint, mely szett-mezők jelennek meg az [[Edzésnapló]]ban.
- Megosztott picker komponens a naplóval / hetí tervvel (search + chipek + kedvencek + ad-hoc).
- Törlés: megerősítés → soft delete.

### Megjegyzések

Snapshot mezők a napló `WorkoutExerciseEntry`-jén: `exerciseName`, `exerciseCategory`, `exerciseKind` — lásd [[Edzésnapló]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Katalógus képernyők + megosztott exercise picker.
- Seed JSON betöltés első indításkor (ha üres a store).
- OpenAPI generált kliens; mutációk offline rétegen.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is.
- Create / update / soft-delete → outbox (`OfflineQueueService`) + kliens UUID; sync: [[Szinkronizációs központ]].
- Szinkronizálatlan, soha fel nem küldött helyi tétel elvetése: helyi hard remove + outbox tisztítás.
- Lásd [[Backend-offline first]] (napló / master soft delete elv).

### Backend

- Tábla: `exercise_catalog` (`id` UUID, `name`, `category`, `kind`, `default_rest_time_seconds`, `is_favorite`, `equipment`, `description` (`text`, `CHECK char_length ≤ 1000`), `deleted` / `deleted_at`, audit). A `category` `text` + `exercise_catalog_category_check` CHECK a 11 értékre (`V35` óta: `CHEST`, `BACK`, `LEGS`, `SHOULDERS`, `BICEPS`, `TRICEPS`, `ABS`, `LOWER_BACK`, `OBLIQUES`, `FOREARM_FINGERS`, `FULL_BODY`). A `sync_changes` view érintetlen (csak `id` / `user_id` / `updated_at` / `deleted` oszlopokat vetít).
- OpenAPI CRUD; listák alapból `deleted = false`.
- Auth / user scope: a bejelentkezett user saját katalógusa (seed = userhez másolt sorok).

### Nyitott kérdések

Nincs nyitott kérdés.

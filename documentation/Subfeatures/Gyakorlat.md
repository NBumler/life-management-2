# Gyakorlat

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Heti terv]], [[Edzésnapló]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

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
| `ARMS` | Kar (bicepsz, tricepsz) |
| `CORE` | Has, mélyhát, törzs |
| `FOREARM_FINGERS` | Alkar, ujjak (mászóspecifikus) |
| `FULL_BODY` | Egész test / összetett kardió |

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
| `deleted` | Soft delete flag (`false` default); listák szűrik |
| `createdAt` / `updatedAt` | Audit |

Nincs kötelező „alapértelmezett szett / súly sablon” a masteren — a cél reps/súly a [[Heti terv]] sablonján és az [[Edzésnapló]] ghost values-ön él.

**Seed:** első indításkor beépített JSON a helyi store-ba (és sync a backendre) — pl. Bench Press, Squat, Pull-up, Hangboard Hang, Pinch Block Lift. Seed tételek user-owned másolatok stabil kliens UUID-val (nincs külön shared rendszer-katalógus az első körben).

**Ad-hoc az [[Edzésnapló]]ból:** új név → opcionálisan új `Exercise` a katalógusba (`category` / `kind` kitöltendő a mentéskor).

**Törlés:** soft delete (`deleted`). Az [[Edzésnapló]] múltbeli snapshotok érintetlenek. A [[Heti terv]] sablonok hivatkozásainál: törölt gyakorlat ne jelenjen meg pickerben; **meglévő terv-tételek snapshotja (`exerciseName`/`exerciseCategory`/`exerciseKind`) megmarad, nincs külön UI figyelmeztetés** — a sablon a törléskori snapshottal továbbra is használható (edzés indítható belőle), csak a picker nem ajánlja fel újraválasztásra a törölt gyakorlatot.

CRUD: lista (nem töröltek), létrehozás, szerkesztés, soft delete (megerősítéssel).

### UI/UX elvárások

- Katalógus lista: kereső, `category` chipek, Kedvencek szűrő; soron: név, kategória, kind jelölés.
- Create / edit: név, `category`, `kind`, opcionális `defaultRestTimeSeconds`, `equipment`, kedvenc toggle.
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

- Tábla: `exercise_catalog` (`id` UUID, `name`, `category`, `kind`, `default_rest_time_seconds`, `is_favorite`, `equipment`, `deleted` / `deleted_at`, audit).
- OpenAPI CRUD; listák alapból `deleted = false`.
- Auth / user scope: a bejelentkezett user saját katalógusa (seed = userhez másolt sorok).

### Nyitott kérdések

Nincs nyitott kérdés.

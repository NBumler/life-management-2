---
verifikalva: 2026-10-17
verifikalt_commit: abb37fb
---

# Indoor boulder admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Névegyediség]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri boulder **terem + szín-sáv** törzsadat. Egyedi boulder problémák **nincsenek** az adminban (gyors forgás a falakon) — a napló szín-sávval / ad-hoc grade-del dolgozik.

### Funkcionális leírás

#### Entitás — `Gym` (indoor, boulder használat)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `name` | Kötelező |
| `address` | Opcionális |
| `disciplines` | Legalább boulder jelölés / flag (ugyanaz a `Gym` kötélnél is bővíthető — [[Indoor köteles admin]]) |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

#### Entitás — `GymColorBand`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `gymId` | FK → `Gym` |
| `name` | Kötelező (pl. „Piros”) |
| `hexColor` | Kötelező; **egyedi a terem élő szín-sávjai között** (nem lehet két azonos hex). Kanonikus alak (`#rrggbb`, rövid forma kifejtve, kisbetűs) és összehasonlítás: [[Névegyediség]] |
| `gradeLower` | [[Nehézségi szint skálája]] — alsó bound (boulder skála) |
| `gradeUpper` | Felső bound |
| `absoluteDifficultyIndexLower` / `Upper` | Mátrixból számolt |
| `deleted` | Soft delete |

CRUD: terem lista, szín-sávok nested vagy külön; soft delete; megerősítés.

### UI/UX elvárások

- Belépés: [[Mászónapló]] hub Admin, vagy Indoor Boulder napló jobb felső admin.
- Terem szerkesztő + színlista (sávonként szín, név, `alsó–felső` fokozat); grade alsó/felső a shared nehézség komponenssel.
- `hexColor` bevitel kétféleképp: szabad szöveges `ion-input` (`#rrggbb`/rövid forma) **és** a mező
  végén (`slot="end"`) egy gomb, ami egy natív `input[type=color]` színpalettát nyit (`backlog/115`,
  minta: a súgó-gomb `shared/help-input/`). A paletta választása visszaírja a szöveges mezőt a
  kanonikus (`#rrggbb`, kisbetűs) alakra; amíg a szöveges mező nem érvényes 6-jegyű hex, a paletta
  gomb egy semleges szürke (`#888888`) mintaszínnel nyílik.
- Egyedi hex validáció mentéskor (a kanonikus alakon — [[Névegyediség]]); ütközésnél `HEX_CONFLICT` hiba a mező alatt.
- **Mentés soha nem csendes** (`backlog/129`): érvénytelen űrlapnál a Mentés nem navigál el, és minden hibás mező (név, hex, alsó / felső fokozat) alatt azonnal lefordított hiba jelenik meg — üres kötelező mező: `COMMON.FIELD_REQUIRED`; üres / fel nem ismert / kétértelmű fokozat: a fokozat-mező saját hibája (üresen `SHARED.GRADE_INPUT.ERROR_REQUIRED`). Nem várt mentési hibánál (`COMMON.SAVE_FAILED`) toast jelenik meg, az oldal nyitva marad.

### Megjegyzések

Reference admin a többi indoor masterhez. Outdoor: [[Outdoor boulder admin]] (Crag hierarchia).

A sávnak nincs saját `+` / `−` változata: azt, hogy egy probléma a sáv melyik részén volt, a beltéri
boulder kísérlet `bandModifier`-e rögzíti ([[Mászónapló]]) — `MINUS` a sáv alsó, `PLUS` a felső
indexét választja. (A korábbi, sehol nem használt `variant` mező `backlog/156`-tal megszűnt.)

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Terem / szín-sáv CRUD; offline store.

#### Backend-offline

Helyi store + outbox; kliens UUID; soft delete. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].
A helyi `gym_color_band.variant` oszlop holt mező (nem minden on-device SQLite build enged
`DROP COLUMN`-t): semmi nem olvassa, az írás konstans `'NEUTRAL'`-lal tölti a `NOT NULL` miatt. A
`variant` kulcsot hordozó, még el nem küldött outbox-tételekből az outbox-migrátor (payload v19)
leveszi.

### Backend

Táblák: `gym`, `gym_color_band` (a `variant` oszlopot `V54` eldobta). OpenAPI a [[Mászónapló]] climbing master tag alatt. Auth / user scope (saját termek).

### Nyitott kérdések

Nincs nyitott kérdés.

---
verifikalva: 2026-09-06
verifikalt_commit: 8dbfb13
---

# Outdoor köteles admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - köteles]] |
| **Kapcsolódó** | [[Outdoor köteles napló]], [[Outdoor boulder admin]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Kültéri köteles törzsadat: **Crag → Sector → Route**.

**Ownership:** **user-owned** ([[Bejelentkezés]]; közös helyszínfa a boulder adminnal ugyanazon useren belül).

### Funkcionális leírás

| Entitás | Fő mezők |
|---|---|
| `Crag` / `Sector` | Mint [[Outdoor boulder admin]] (közös helyszín fa) |
| `Route` | `name`, `guidebookGrade`, `lengthInMeters`, `totalPitches`, `rockType`, `aspect`, `topoNumber`, soft delete |

`aspect` (fekvés) — **8 irányú égtáj-enum**: `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW` (üres/`null` = ismeretlen; nincs `UNKNOWN` tag). Bevitel a `Route` és a `Sector` szerkesztőn a **vizuális választóval** (`app-aspect-picker`): négyzet kerületén a 8 irány, É felül, egy tap; a kijelöltre újra tap → törlés. Iránytű-fokból a `degreesToAspect` binnel (45°-os cikkek, az alsó határ felfelé kerekít — 22,5° = `NE`); paritás-fixture: `shared/fixtures/aspect-degrees.json` (kliens: `shared/aspect.ts`, backend: `hu.bumler.lm2.common.AspectDirection`). A Route saját `aspect`-je a naplóban felülírja a `Sector` defaultot.

`topoNumber` — opcionális topó / felmászókönyv-sorszám (rövid szabad szöveg, max. 32 kar.; pl. „12", „5/a", „5b"). Nem uniqueness-kényszerített, szektor-scope-ban értelmezett. A Route pickerek (admin szektor-lista **és** a napló „kísérlet hozzáadása" select-je) **természetes alfanumerikus** rendezéssel rendeznek rá (`2` < `5/a` < `5/b` < `10`), a `topoNumber` nélküli sorok a lista végére kerülnek név szerint. Kliensoldali rendezés (`shared/natural-sort.ts`, fixture: `shared/fixtures/natural-sort.json`); a szerver soha nem rendez `topoNumber` szerint (a lista-végpontok név szerint maradnak).

Naplózáskor a Route kiválasztása előtölti hossz / pitch / grade **és** (ha a Route-on ki van töltve) `rockType` / `aspect` értékeket; ha a Route-on üres, a napló a Sector/Crag defaultra esik vissza — [[Outdoor köteles napló]]. Soft delete: [[Mászónapló]].

### UI/UX elvárások

Route CRUD a szektor alatt; grade a [[Nehézségi szint skálája]] komponenssel. A szerkesztő űrlapon opcionális `topoNumber` mező (a név alatt); a szektor route-listája és a napló picker a sorszámot a név elé fűzi (`12 · Sárga áthajlás`), és a fenti természetes rendezéssel rendez. A fekvés (`aspect`) mező helyén az `app-aspect-picker` négyzetes égtáj-választó áll (`ion-input` helyett), ugyanígy a `Sector` szerkesztőn is.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Crag/Sector/Route admin.

#### Backend-offline

Outbox + UUID + soft delete. Lásd [[Backend-offline first]].

### Backend

`route` tábla (+ közös `crag`/`sector`); `topo_number text CHECK (char_length ≤ 32)` a `V33__climbing_route_topo_number.sql`-ből. `route.aspect` / `sector.default_aspect`: 8 irányú égtáj-token (`N`..`NW`), OpenAPI `enum` + `route_aspect_check` / `sector_default_aspect_check` DB CHECK a `V34__climbing_aspect_compass_enum.sql`-ből (a korábbi szabad szöveget best-effort megfeleltette, a felismerhetetlent NULL-ra állította). A token szövegoszlopban marad, `sync_changes` view érintetlen. API: [[Mászónapló]]. Auth / user scope ([[Bejelentkezés]]).

### Nyitott kérdések

Nincs nyitott kérdés.

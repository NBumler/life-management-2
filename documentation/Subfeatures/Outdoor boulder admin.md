---
verifikalva: 2026-09-06
verifikalt_commit: 99ba651
---

# Outdoor boulder admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - boulder]] |
| **Kapcsolódó** | [[Outdoor boulder napló]], [[Indoor boulder admin]], [[Mászónapló]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Kültéri boulder törzsadat: **Crag → Sector → (opcionális) BoulderProblem**.

**Ownership:** **user-owned** — a bejelentkezett user saját helyszínfája ([[Bejelentkezés]]).

### Funkcionális leírás

| Entitás | Fő mezők |
|---|---|
| `Crag` | `name`, opcionális GPS, default `rockType`, soft delete |
| `Sector` | `cragId`, `name`, default `aspect` (fekvés), soft delete |
| `BoulderProblem` | Opcionális master: név, `guidebookGrade`, `sectorId`, `topoNumber`; ad-hoc a naplóban is születhet |

`topoNumber` — opcionális topó / felmászókönyv-sorszám (rövid szabad szöveg, max. 32 kar.; pl. „12", „5/a", „5b"). Nem uniqueness-kényszerített, szektor-scope-ban. A probléma-pickerek (admin szektor-lista **és** napló select) **természetes alfanumerikus** rendezéssel rendeznek rá (`2` < `5/a` < `5/b` < `10`), a `topoNumber` nélküli sorok a lista végén név szerint. Kliensoldali rendezés (`shared/natural-sort.ts`, fixture: `shared/fixtures/natural-sort.json`); a szerver nem rendez rá. A picker a sorszámot a név elé fűzi (`12 · …`).

Nincs `GymColorBand`. Soft delete: [[Mászónapló]]. Térkép/fotó UI: **nem** 2.0 (csak opcionális GPS mező).

### UI/UX elvárások

Hierarchikus admin (helyszín → szektor → problémák). Belépés: hub Admin / napló gyorslink.

### Megjegyzések

Mintázatban rokon: outdoor kötél Crag/Sector + Route.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Hierarchia CRUD offline.

#### Backend-offline

Outbox + UUID + soft delete. Lásd [[Backend-offline first]].

### Backend

Táblák: `crag`, `sector`, `boulder_problem` (utóbbin `topo_number text CHECK (char_length ≤ 32)` a `V33`-ból; `sync_changes` view érintetlen). API: [[Mászónapló]] master. Auth / user scope ([[Bejelentkezés]]).

### Nyitott kérdések

Nincs nyitott kérdés.

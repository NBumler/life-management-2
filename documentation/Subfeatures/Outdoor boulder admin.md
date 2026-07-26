# Outdoor boulder admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - boulder]] |
| **Kapcsolódó** | [[Outdoor boulder napló]], [[Indoor boulder admin]], [[Mászónapló]], [[Backend-offline first]] |

### Célállapot

Kültéri boulder törzsadat: **Crag → Sector → (opcionális) BoulderProblem**.

### Funkcionális leírás

| Entitás | Fő mezők |
|---|---|
| `Crag` | `name`, opcionális GPS, default `rockType`, soft delete |
| `Sector` | `cragId`, `name`, default `aspect` (fekvés), soft delete |
| `BoulderProblem` | Opcionális master: név, `guidebookGrade`, `sectorId`; ad-hoc a naplóban is születhet |

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

Táblák: `crag`, `sector`, `boulder_problem`. API: [[Mászónapló]] master.

### Nyitott kérdések

Nincs nyitott kérdés.

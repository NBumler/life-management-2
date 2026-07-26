# Outdoor köteles admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - köteles]] |
| **Kapcsolódó** | [[Outdoor köteles napló]], [[Outdoor boulder admin]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Backend-offline first]] |

### Célállapot

Kültéri köteles törzsadat: **Crag → Sector → Route**.

### Funkcionális leírás

| Entitás | Fő mezők |
|---|---|
| `Crag` / `Sector` | Mint [[Outdoor boulder admin]] (közös helyszín fa) |
| `Route` | `name`, `guidebookGrade`, `lengthInMeters`, `totalPitches`, `rockType`, `aspect`, soft delete |

Naplózáskor a Route kiválasztása előtölti hossz / pitch / grade értékeket. Soft delete: [[Mászónapló]].

### UI/UX elvárások

Route CRUD a szektor alatt; grade a [[Nehézségi szint skálája]] komponenssel.

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

`route` tábla (+ közös `crag`/`sector`). API: [[Mászónapló]].

### Nyitott kérdések

Nincs nyitott kérdés.

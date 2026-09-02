---
verifikalva:
verifikalt_commit:
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
| `Route` | `name`, `guidebookGrade`, `lengthInMeters`, `totalPitches`, `rockType`, `aspect`, soft delete |

Naplózáskor a Route kiválasztása előtölti hossz / pitch / grade **és** (ha a Route-on ki van töltve) `rockType` / `aspect` értékeket; ha a Route-on üres, a napló a Sector/Crag defaultra esik vissza — [[Outdoor köteles napló]]. Soft delete: [[Mászónapló]].

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

`route` tábla (+ közös `crag`/`sector`). API: [[Mászónapló]]. Auth / user scope ([[Bejelentkezés]]).

### Nyitott kérdések

Nincs nyitott kérdés.

---
verifikalva: 2026-09-06
verifikalt_commit: 99ba651
---

# Indoor köteles admin

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - köteles]] |
| **Kapcsolódó** | [[Indoor köteles napló]], [[Indoor boulder admin]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri köteles terem-master. **Ugyanaz a `Gym` entitás**, mint a [[Indoor boulder admin]]ban; köteles specifikus mezőkkel bővül.

### Funkcionális leírás

**Eltérések a boulder adminhoz képest:**

| Mező / fogalom | Szabály |
|---|---|
| `defaultWallHeightMeters` | Átlagos falmagasság; napló `lengthInMeters` default |
| `availableSafetyStyles` | `TOPROPE` / `LEAD` (TRAD nincs indoor) |
| `GymColorBand` | **Nem** kötelező kötélnél |
| `IndoorRoute` (opcionális) | Név, grade, szektor/sáv, `topoNumber`; fix termi út katalógus |

`topoNumber` — opcionális topó / sorszám (rövid szabad szöveg, max. 32 kar.; pl. „12", „5/a", „5b"). Nem uniqueness-kényszerített, terem-scope-ban. Az `IndoorRoute` pickerek (admin terem-lista **és** [[Indoor köteles napló]] select) **természetes alfanumerikus** rendezéssel rendeznek rá (`2` < `5/a` < `5/b` < `10`), a `topoNumber` nélküli sorok a lista végén név szerint (`shared/natural-sort.ts`, fixture: `shared/fixtures/natural-sort.json`). A szerver nem rendez rá; a picker a sorszámot a név elé fűzi.

Nincs multi-pitch master. Soft delete: [[Mászónapló]].

### UI/UX elvárások

Gym szerkesztő köteles tab/szekció: falmagasság, safety flags, opcionális beltéri utak CRUD. Belépés: hub Admin vagy napló gyorslink.

### Megjegyzések

Reference mintázat: [[Indoor boulder admin]]; közös `Gym` tábla.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Gym edit + opcionális IndoorRoute lista.

#### Backend-offline

Helyi store + outbox; kliens UUID; soft delete. Lásd [[Backend-offline first]].

### Backend

`gym` bővített mezők; `indoor_route` opcionális tábla (`topo_number text CHECK (char_length ≤ 32)` a `V33__climbing_route_topo_number.sql`-ből; `sync_changes` view érintetlen). API: [[Mászónapló]] master.

### Nyitott kérdések

Nincs nyitott kérdés.

---
verifikalva: 2026-09-02
verifikalt_commit: dac7f81
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
| `IndoorRoute` (opcionális) | Név, grade, szektor/sáv; fix termi út katalógus |

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

`gym` bővített mezők; `indoor_route` opcionális tábla. API: [[Mászónapló]] master.

### Nyitott kérdések

Nincs nyitott kérdés.

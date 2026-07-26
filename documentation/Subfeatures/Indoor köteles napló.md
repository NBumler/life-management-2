# Indoor köteles napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - köteles]] |
| **Kapcsolódó** | [[Indoor köteles admin]], [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

Beltéri köteles session + kísérletek. Dashboard: **Indoor Kötél**. Közös modell: [[Mászónapló]]; UI/mező eltérések az [[Indoor boulder napló]] reference-hez képest.

### Funkcionális leírás

**Discriminator:** `INDOOR` + `ROPE`.

| Szempont | Indoor kötél (vs indoor boulder) |
|---|---|
| Helyszín | `gymId` + snapshot; legutóbbi terem előtöltés |
| Út | Kézi grade + magasság **vagy** opcionális `IndoorRoute` választás / ad-hoc név |
| `safetyStyle` | `TOPROPE` \| `LEAD` (TRAD **rejtve**; default `LEAD`) |
| `lengthInMeters` | Opcionális; default = terem `defaultWallHeightMeters` |
| `PitchLog` | **Nincs** |
| Szín-sáv | Nincs (boulder-only) |
| `ascentStyle` | Siker esetén: ONSIGHT / FLASH / REDPOINT |
| Sikertelen | `failurePoint` opcionális |
| Duration fallback | utak/kísérletek × 15 perc |
| Kalória | kötél aktív s/m + rest — [[Mászónapló]] |

### UI/UX elvárások

Hub → Indoor Kötél csempe → session form (safety chip-ek, grade parser, magasság). Admin link → [[Indoor köteles admin]].

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kontextus-form; shared climbing utilities.

#### Backend-offline

Mint [[Indoor boulder napló]] / [[Mászónapló]].

### Backend

Ugyanaz a `/api/climbing/sessions` discriminatorral; `safetyStyle`, `lengthInMeters`, opcionális `indoorRouteId` + snapshot.

### Nyitott kérdések

Nincs nyitott kérdés.

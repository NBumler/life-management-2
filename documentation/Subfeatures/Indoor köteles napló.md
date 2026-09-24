---
verifikalva: 2026-09-24
verifikalt_commit: 3aee8a9
---

# Indoor köteles napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - köteles]] |
| **Kapcsolódó** | [[Indoor köteles admin]], [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri köteles session + kísérletek. Dashboard: **Indoor Kötél**. Közös modell: [[Mászónapló]]; UI/mező eltérések az [[Indoor boulder napló]] reference-hez képest.

### Funkcionális leírás

**Discriminator:** `INDOOR` + `ROPE`.

| Szempont | Indoor kötél (vs indoor boulder) |
|---|---|
| Helyszín | `gymId` + snapshot; legutóbbi terem előtöltés. A picker csak azokat a termeket listázza, amelyek `Gym.disciplines`-e tartalmazza a kötél jelölést ([[Indoor köteles admin]]). |
| Út | Kézi grade + magasság **vagy** opcionális `IndoorRoute` választás / ad-hoc név. `IndoorRoute` kiválasztásakor a fokozat abból töltődik; **másik útra váltáskor újratöltődik** (és vele a nehézségi index) — kivéve ha a user kézzel átírta ([[Mászónapló]] `AscentAttempt`). |
| `safetyStyle` | `TOPROPE` \| `LEAD` (TRAD **rejtve**; default `LEAD`) |
| `lengthInMeters` | Opcionális; default = terem `defaultWallHeightMeters` |
| `PitchLog` | **Nincs** |
| Szín-sáv | Nincs (boulder-only) |
| `ascentStyle` | Siker esetén: ONSIGHT / FLASH / REDPOINT |
| Sikertelen | Nincs külön mező — a `notes` (többsoros) kapja a „hol akadt el" promptot ([[Mászónapló]], `backlog/archive/077`) |
| `attemptCount` | [[Mászónapló]] közös mező — próbák (gólok) száma **ebben a sessionben** ezen az úton (napló-form címke: „Próbák (ebben a sessionben)") |
| Duration fallback | utak/kísérletek × 15 perc |
| Kalória | kötél aktív s/m + rest — [[Mászónapló]] |

### UI/UX elvárások

- „Új kísérlet" gomb a lista tetején és (≥1 kísérletnél) alján is, görgetés az új kártyához — [[Mászónapló]] `### UI/UX elvárások`.
Hub → Indoor Kötél csempe → session form (safety chip-ek, grade parser, magasság). Sikeres kísérletnél a Stílus választó mellett súgó (ⓘ) gomb (`app-help-button` — [[Mászónapló]]). Ha sikeres `ONSIGHT` / `FLASH` egy olyan `IndoorRoute`-ra, amit a user korábbi dátumú sessionben már megmászott, a stílus alatt nem blokkoló figyelmeztetés jelenik meg a legutóbbi megmászás dátumával (a mentés engedélyezett) — részletek: [[Mászónapló]] `ascentStyle`. Admin link → [[Indoor köteles admin]].

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

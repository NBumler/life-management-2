# Outdoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - boulder]] |
| **Kapcsolódó** | [[Outdoor boulder admin]], [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

Kültéri boulder session + kísérletek. Dashboard: **Outdoor Boulder**.

### Funkcionális leírás

**Discriminator:** `OUTDOOR` + `BOULDER`. Reference flow: [[Indoor boulder napló]]; eltérések:

| Szempont | Outdoor boulder |
|---|---|
| Helyszín | `cragId` + `sectorId` (+ snapshot nevek) |
| Probléma | Master `BoulderProblem` **vagy** ad-hoc név (+ opcionális `saveToCatalog`) |
| Grade | `guidebookGrade` / `userRawInput` + `absoluteDifficultyIndex` |
| `rockType` | Crag default, session/attempt szinten **felülírható** |
| `aspect` | Sector default, öröklődik |
| `weatherConditions` | Session szint, aznapi |
| `ascentStyle` | ONSIGHT / FLASH / REDPOINT |
| Szín-sáv | Nincs |
| Kalória / volume | boulder szabályok — [[Mászónapló]] |

### UI/UX elvárások

Hub → Outdoor Boulder; crag/sector picker; grade parser; időjárás chip. Admin → [[Outdoor boulder admin]].

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kontextus-form; shared utilities.

#### Backend-offline

Mint [[Mászónapló]].

### Backend

Sessions API + `boulderProblemId` / snapshot; outdoor mezők.

### Nyitott kérdések

Nincs nyitott kérdés.

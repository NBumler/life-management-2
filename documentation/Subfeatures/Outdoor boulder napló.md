---
verifikalva: 2026-09-09
verifikalt_commit: ca19d1e
---

# Outdoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - boulder]] |
| **Kapcsolódó** | [[Outdoor boulder admin]], [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Kültéri boulder session + kísérletek. Dashboard: **Outdoor Boulder**.

### Funkcionális leírás

**Discriminator:** `OUTDOOR` + `BOULDER`. Reference flow: [[Indoor boulder napló]]; eltérések:

| Szempont | Outdoor boulder |
|---|---|
| Helyszín | `cragId` + `sectorId` (+ snapshot nevek) |
| Probléma | Master `BoulderProblem` **vagy** ad-hoc név (+ opcionális `saveToCatalog`). Probléma kiválasztásakor a fokozat abból töltődik; **másik problémára váltáskor újratöltődik** (és vele a nehézségi index) — kivéve ha a user kézzel átírta ([[Mászónapló]] `AscentAttempt`). |
| Grade | `guidebookGrade` / `userRawInput` + `absoluteDifficultyIndex` |
| `rockType` | Crag default, **session szinten** felülírható (nincs attempt-szintű mező — egy sessionben egy sziklatípus) |
| `aspect` | Sector default, öröklődik; session szinten felülírható. **8 irányú égtáj-enum** (`N`..`NW`, üres = ismeretlen), `app-aspect-picker` vizuális választóval — [[Mászónapló]] |
| `weatherConditions` | Session szint, aznapi |
| `ascentStyle` | ONSIGHT / FLASH / REDPOINT |
| Szín-sáv | Nincs |
| Kalória / volume | boulder szabályok — [[Mászónapló]] |

### UI/UX elvárások

Hub → Outdoor Boulder; crag/sector picker; grade parser; időjárás chip. Sikeres kísérletnél a Stílus választó mellett súgó (ⓘ) gomb (`app-help-button` — [[Mászónapló]]). Ha sikeres `ONSIGHT` / `FLASH` egy olyan `BoulderProblem`-re, amit a user korábbi dátumú sessionben már megmászott, a stílus alatt nem blokkoló figyelmeztetés jelenik meg a legutóbbi megmászás dátumával (a mentés engedélyezett) — részletek: [[Mászónapló]] `ascentStyle`. Admin → [[Outdoor boulder admin]].

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

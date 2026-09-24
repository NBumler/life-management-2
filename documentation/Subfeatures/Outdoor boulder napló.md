---
verifikalva: 2026-09-24
verifikalt_commit: d6e22b2
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
| Helyszín | `cragId` **session szinten** (egy alkalom = egy szikla); a **szektor kísérletenként** (`backlog/084`, `sectorId` + `sectorName` snapshot az `AscentAttempt`-en) — egy alkalom több szektort is érinthet. Új kísérlet-sor a szektort az **előző kísérletéből** tölti elő; a `Crag` váltása minden sor szektorát törli. |
| Probléma | Master `BoulderProblem` **vagy** ad-hoc név (+ opcionális `saveToCatalog`) — a `BoulderProblem` opciók a kísérlet szektorából jönnek, a `saveToCatalog` a kísérlet szektorába ír. Probléma kiválasztásakor a fokozat abból töltődik; **másik problémára váltáskor újratöltődik** (és vele a nehézségi index) — kivéve ha a user kézzel átírta ([[Mászónapló]] `AscentAttempt`). |
| Grade | `guidebookGrade` / `userRawInput` + `absoluteDifficultyIndex` |
| `rockType` / `aspect` | **Nem napló-mező** (`backlog/084` — a session-szintű felülírás megszűnt). Törzsadat: `rockType` a `Crag.defaultRockType`, `aspect` a `Sector.defaultAspect` — szerkesztésük [[Outdoor boulder admin]]. |
| `weatherConditions` | Session szint, aznapi; több címke egyszerre (toggle-chipek) — [[Mászónapló]] |
| `ascentStyle` | ONSIGHT / FLASH / REDPOINT |
| Szín-sáv | Nincs |
| Kalória / volume | boulder szabályok — [[Mászónapló]] |

### UI/UX elvárások

- „Új kísérlet" gomb a lista tetején és (≥1 kísérletnél) alján is, görgetés az új kártyához — [[Mászónapló]] `### UI/UX elvárások`.
Hub → Outdoor Boulder; session szintű `Crag` picker; minden kísérlet-kártyán **szektor select** (a `Crag` szektorai közül, az előző kísérletéből előtöltve), majd — ha a szektorban van `BoulderProblem` — probléma select; grade parser; időjárás toggle-chipek (több is kijelölhető). Sikeres kísérletnél a Stílus választó mellett súgó (ⓘ) gomb (`app-help-button` — [[Mászónapló]]). Ha sikeres `ONSIGHT` / `FLASH` egy olyan `BoulderProblem`-re, amit a user korábbi dátumú sessionben már megmászott, a stílus alatt nem blokkoló figyelmeztetés jelenik meg a legutóbbi megmászás dátumával (a mentés engedélyezett) — részletek: [[Mászónapló]] `ascentStyle`. Admin → [[Outdoor boulder admin]].

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

Sessions API + `boulderProblemId` / snapshot; outdoor mezők. `AscentAttempt.sectorId` (valós FK a `sector`-re) + `sectorName` snapshot — `backlog/084`, `V37__climbing_sector_to_attempt.sql`; a `climbing_session` szintjén megszűnt `sector_id` / `sector_name` / `rock_type` / `aspect` oszlop. Outbox payload-séma `v4 → v5` (a `ClimbingSession` migrátor-lépés a függő írások session-szektorát leviszi a kísérletekre).

### Nyitott kérdések

Nincs nyitott kérdés.

---
verifikalva: 2026-09-09
verifikalt_commit: b5d1556
---

# Outdoor köteles napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - köteles]] |
| **Kapcsolódó** | [[Outdoor köteles admin]], [[Indoor köteles napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Jelenlegi működés

Kültéri köteles session + kísérletek / multi-pitch. Dashboard: **Outdoor Kötél**.

### Funkcionális leírás

**Discriminator:** `OUTDOOR` + `ROPE`. Reference: [[Indoor köteles napló]] + [[Mászónapló]]; eltérések:

| Szempont | Outdoor kötél |
|---|---|
| Helyszín | `Crag` **session szinten** (egy alkalom = egy szikla); a **szektor kísérletenként** (`backlog/084`) — egy alkalom több szektort is érinthet. Új kísérlet-sor a szektort az **előző kísérletéből** tölti elő (első sornál az utolsó outdoor-kötél session utolsó kísérletének szektorából); a `Crag` váltása minden sor szektorát törli. |
| Út | `Route` master **vagy** ad-hoc (+ `saveToCatalog`) — a `Route` opciók a kísérlet szektorából jönnek, a `saveToCatalog` a kísérlet szektorába ír. Út kiválasztásakor a fokozat és a hossz a Route-ból töltődik; **másik Route-ra váltáskor újratöltődik** az újból (és vele a levezetett nehézségi index) — kivéve ha a user közben kézzel átírta, akkor a kézi érték marad ([[Mászónapló]] `AscentAttempt`). |
| `safetyStyle` | `TOPROPE` \| `LEAD` \| `TRAD` (TRAD: +6 kg aktív kalóriánál) |
| `lengthInMeters` | Öröklési sorrend (`backlog/088`): **1.** `Route.lengthInMeters` → **2.** a kísérlet szektorának `defaultLengthInMeters`-e → **3.** kézi felülírás. A `lengthAutoFilled` provenance-flag a szektor-defaultra is kiterjed: út- vagy szektorváltáskor az örökölt hossz újratöltődik, kézi átírásig. A kötél-kalória (`lengthInMeters × {25\|45\|60}`) a feloldott hosszt használja. |
| `PitchLog` | **Opcionális** lista: `pitchNumber`, `isLead`, `rawGrade`, index, `lengthInMeters` — ha nincs kitöltve, elég session + teljes úthossz |
| Másodmászó | `isLead=false` → aktív MET ×0.8 |
| `weatherConditions` | Session |
| `rockType` / `aspect` | **Nem napló-mező** (`backlog/084` — a session-szintű felülírás megszűnt). A szikla helyben marad; a kőzettípus és a fekvés a törzsadat tulajdonsága: `rockType` a `Crag.defaultRockType` (opcionálisan a `Route.rockType`), `aspect` a `Sector.defaultAspect` (opcionálisan a `Route.aspect`) — szerkesztésük [[Outdoor köteles admin]]. A napló legfeljebb megjeleníti, a `Route` → `Sector` / `Crag` láncból származtatva. |
| Multi-pitch indoor | N/A (csak itt) |

### UI/UX elvárások

Hub → Outdoor Kötél; session szintű `Crag` picker; minden kísérlet-kártyán **szektor select** (a `Crag` szektorai közül, az előző kísérletéből előtöltve), majd — ha a szektorban van `Route` — út select; safety; opcionális pitch szerkesztő (összecsukható). Sikeres kísérletnél a Stílus választó mellett súgó (ⓘ) gomb (`app-help-button` — [[Mászónapló]]). Ha sikeres `ONSIGHT` / `FLASH` egy olyan `Route`-ra, amit a user korábbi dátumú sessionben már megmászott, a stílus alatt nem blokkoló figyelmeztetés jelenik meg a legutóbbi megmászás dátumával (a mentés engedélyezett) — részletek: [[Mászónapló]] `ascentStyle`. Admin → [[Outdoor köteles admin]].

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kontextus-form + opcionális pitch UI; shared calorie (TRAD / second).

#### Backend-offline

Mint [[Mászónapló]].

### Backend

Sessions + nested attempts + nested pitches; `routeId` + snapshot. `AscentAttempt.sectorId` (valós FK a `sector`-re) + `sectorName` snapshot — `backlog/084`, `V37__climbing_sector_to_attempt.sql`. A `climbing_session` szintjén megszűnt `sector_id` / `sector_name` / `rock_type` / `aspect` oszlop; a nested PUT az attempt szektorát a szokásos fa-diff szerint menti. `Sector.defaultLengthInMeters` (`V38__sector_default_length.sql`, `backlog/088`) — a köteles napló hossz-fallbackja. Outbox payload-séma: `v4 → v5` (`backlog/084` `ClimbingSession` migrátor-lépés) majd `v5 → v6` (`backlog/088` `Sector` mezőalak, identity).

### Nyitott kérdések

Nincs nyitott kérdés.

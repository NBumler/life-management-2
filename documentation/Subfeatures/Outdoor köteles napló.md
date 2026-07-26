# Outdoor köteles napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Outdoor - köteles]] |
| **Kapcsolódó** | [[Outdoor köteles admin]], [[Indoor köteles napló]], [[Nehézségi szint skálája]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

Kültéri köteles session + kísérletek / multi-pitch. Dashboard: **Outdoor Kötél**.

### Funkcionális leírás

**Discriminator:** `OUTDOOR` + `ROPE`. Reference: [[Indoor köteles napló]] + [[Mászónapló]]; eltérések:

| Szempont | Outdoor kötél |
|---|---|
| Út | `Route` master **vagy** ad-hoc (+ `saveToCatalog`) |
| `safetyStyle` | `TOPROPE` \| `LEAD` \| `TRAD` (TRAD: +6 kg aktív kalóriánál) |
| `lengthInMeters` | Route-ból vagy kézi |
| `PitchLog` | **Opcionális** lista: `pitchNumber`, `isLead`, `rawGrade`, index, `lengthInMeters` — ha nincs kitöltve, elég session + teljes úthossz |
| Másodmászó | `isLead=false` → aktív MET ×0.8 |
| `weatherConditions` | Session |
| `rockType` / `aspect` | Öröklés + felülírás |
| Multi-pitch indoor | N/A (csak itt) |

### UI/UX elvárások

Hub → Outdoor Kötél; route picker; safety; opcionális pitch szerkesztő (összecsukható). Admin → [[Outdoor köteles admin]].

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

Sessions + nested pitches; `routeId` + snapshot.

### Nyitott kérdések

Nincs nyitott kérdés.

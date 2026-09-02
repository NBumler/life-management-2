---
verifikalva: 2026-09-02
verifikalt_commit: dac7f81
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
| Út | `Route` master **vagy** ad-hoc (+ `saveToCatalog`) |
| `safetyStyle` | `TOPROPE` \| `LEAD` \| `TRAD` (TRAD: +6 kg aktív kalóriánál) |
| `lengthInMeters` | Route-ból vagy kézi |
| `PitchLog` | **Opcionális** lista: `pitchNumber`, `isLead`, `rawGrade`, index, `lengthInMeters` — ha nincs kitöltve, elég session + teljes úthossz |
| Másodmászó | `isLead=false` → aktív MET ×0.8 |
| `weatherConditions` | Session |
| `rockType` / `aspect` | Öröklési sorrend: **1.** ha van kiválasztott `Route` és annak van saját `rockType`/`aspect`-je → onnan; **2.** különben `Sector.aspect` / `Crag.rockType` default ([[Outdoor boulder admin]] mintájára); **3.** session szinten mindig felülírható |
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

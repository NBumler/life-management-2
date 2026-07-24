# Biciklizés napló

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Edzés]], [[Backend-offline first]] |

### Célállapot

Kerékpáros edzések / utak naplózása; elégetett kalória a [[Tápérték kalkulátor]] MET képletével → `activityExtraKcal`.

### Funkcionális leírás

Kötelező: időtartam (`durationMinutes`) + intenzitás / típus enum. Opcionális: táv, emelkedő (nem kell a MET-hez az első körben).

#### MET

\[\text{kcal} = \text{MET} \times \text{testsúly} \times \frac{\text{durationMinutes}}{60}\]

| Típus | MET |
|---|---|
| `CITY` (&lt;16 km/h, kényelmes) | 4.0 |
| `STATIONARY` (szobabicikli / görgő) | 6.0 |
| `ROAD_LEISURE` (16–22 km/h) | 6.8 |
| `MOUNTAIN_TRAIL` | 8.5 |
| `ROAD_VIGOROUS` (&gt;22 km/h) | 10.0 |

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

GPS / külső sync: későbbi scope.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Napló űrlap; shared MET utility.

#### Backend-offline

Helyi store + outbox. Lásd [[Backend-offline first]].

### Backend

CRUD OpenAPI — TBD részletek.

### Nyitott kérdések

Nincs nyitott kérdés.

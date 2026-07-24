# Úszás napló

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Edzés]], [[Backend-offline first]] |

### Célállapot

Úszóedzések rögzítése; kalóriaégetés MET alapján, offline is ([[Tápérték kalkulátor]]).

### Funkcionális leírás

Bemenet (elvárás): `id` (UUID), dátum, `durationMinutes` (kötelező), opcionális táv / medence; intenzitás / úszásnem a MET-hez.

#### MET (kanonikus — [[Tápérték kalkulátor]])

\[\text{kcal} = \text{MET} \times \text{testsúly} \times \frac{\text{durationMinutes}}{60}\]

| Kategória | MET |
|---|---|
| `CASUAL` / `BREASTSTROKE` | 5.5 |
| `BACKSTROKE` | 7.0 |
| `CRAWL_FREESTYLE` | 8.0 |
| `OPEN_WATER` | 9.5 |
| `BUTTERFLY` / `VIGOROUS` | 11.0 |

Mapping: ha `swimmingIntensity = CASUAL` → 5.5; `VIGOROUS` → 11.0; egyébként a `strokeType` szerinti sor. `MIXED` → default `CASUAL` 5.5 (vagy user választ intenzitást).

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Napló űrlap; shared MET utility; Edzés környékén.

#### Backend-offline

Offline számítás + outbox. Lásd [[Backend-offline first]].

### Backend

CRUD OpenAPI; szerveroldali kalória ellenőrzés.

### Nyitott kérdések

Nincs nyitott kérdés.

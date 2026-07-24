# Edzésnapló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Heti terv]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

Elvégzett edzések rögzítése (gyakorlatok, súlyok, ismétlések, időtartam), kalóriaégetés becslése a [[Tápérték kalkulátor]] felé.

### Funkcionális leírás

Elvégzett edzések rögzítése (gyakorlatok, súlyok, ismétlések, **időtartam**), kalóriaégetés a [[Tápérték kalkulátor]] felé.

#### MET (erőedzés)

\[\text{kcal} = \text{MET} \times \text{testsúly} \times \frac{\text{durationMinutes}}{60}\]

| Típus | MET |
|---|---|
| `GENERAL_WEIGHTS` (súlyzós, pihenőkkel) | 5.0 |
| `HIIT_CIRCUIT` | 8.0 |

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Heti tervből indított vs ad-hoc edzés
- Edzés típus választó UI (`GENERAL_WEIGHTS` / `HIIT_CIRCUIT`)

## Architektúra

### Frontend

Edzésnapló űrlap; offline queue; kalória utility.

#### Backend-offline

Offline rögzítés: helyi store + outbox; kalória utility a kliensen. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

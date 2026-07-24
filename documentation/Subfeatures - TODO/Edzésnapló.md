# Edzésnapló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Heti terv]], [[Kalóriakalkulátor]], [[Backend-offline first]] |

### Célállapot

Elvégzett edzések rögzítése (gyakorlatok, súlyok, ismétlések, időtartam), kalóriaégetés becslése a [[Kalóriakalkulátor]] felé.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Heti tervből indított vs ad-hoc edzés
- Offline rögzítés
- MET / kalória képlet edzéshez

## Architektúra

### Frontend

Edzésnapló űrlap; offline queue; kalória utility.

#### Backend-offline

Offline rögzítés: helyi store + outbox; kalória utility a kliensen. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

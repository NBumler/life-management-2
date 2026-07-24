# Biciklizés napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Profile]], [[Edzés]], [[Backend-offline first]] |

### Célállapot

Kerékpáros edzések / utak naplózása (időtartam, táv, intenzitás), elégetett kalória számítása a [[Tápérték kalkulátor]] felé.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Bemeneti mezők (sebesség, emelkedő, beltéri / kültéri)
- MET konstansok (offline utility a frontenden is)
- GPS / külső sync (későbbi scope?)

## Architektúra

### Frontend

Napló űrlap; offline MET utility; Edzés tab környékén.

#### Backend-offline

Napló + offline MET utility; mentés helyi store + outbox. Lásd [[Backend-offline first]].

### Backend

Bicikli napló CRUD (OpenAPI) — TBD.

### Nyitott kérdések

Nincs nyitott kérdés.

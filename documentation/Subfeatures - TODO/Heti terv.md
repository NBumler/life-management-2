# Heti terv

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Edzésnapló]], [[Backend-offline first]] |

### Célállapot

Heti edzésterv összeállítása [[Gyakorlat]] tételekből (napok, szettek, ismétlések, progresszió).

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Sablon vs konkrét hét példány
- Áthúzás / másolás következő hétre

## Architektúra

### Frontend

Heti terv szerkesztő UI.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

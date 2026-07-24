# Élet tervek

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Tennivalók]] |
| **Kapcsolódó** | [[Naptár]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Hosszabb távú életcélok / tervek kezelése (pl. jogosítvány szerzés, rope-solo tanulás).

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezők / állapotgép (terv → folyamatban → kész)
- Kapcsolat kisebb [[Tennivalók]] / [[Háztartási feladatok]] tételekkel

## Architektúra

### Frontend

_Nincs frontend érintettség._

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

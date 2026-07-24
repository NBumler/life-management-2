# Gyakorlat

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Heti terv]], [[Edzésnapló]], [[Backend-offline first]] |

### Célállapot

Egyedi gyakorlatok (pl. fekvenyomás, guggolás) master data-ja: név, izomcsoportok, eszközigény, alapértelmezett ismétlés / súly sablon.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezők listája
- Kapcsolat [[Heti terv]] és [[Edzésnapló]] felé

## Architektúra

### Frontend

Gyakorlat katalógus UI.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

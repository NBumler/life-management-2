# Outdoor boulder admin

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Outdoor - boulder]] |
| **Kapcsolódó** | [[Outdoor boulder napló]], [[Indoor boulder admin]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Backend-offline first]] |

### Célállapot

Kültéri boulder helyszínek / szektorok adminisztrációja (master data a naplóhoz). Mintaként: [[Indoor boulder admin]].

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Helyszín vs szektor hierarchia
- Kőzet típus (`RockType`), fekvés (`aspect`) — lásd giga specifikáció `Route` entitás
- Guidebook grade vs helyi skála

## Architektúra

### Frontend

Helyszín / szektor admin UI.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

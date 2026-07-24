# Outdoor - köteles

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Outdoor mászónapló]] |
| **Kapcsolódó** | [[Outdoor köteles admin]], [[Outdoor köteles napló]], [[Nehézségi szint skálája]], [[Backend-offline first]] |

### Célállapot

Kültéri köteles admin + napló.

### Funkcionális leírás

Subfeature lista:

- [[Outdoor köteles admin]]
- [[Outdoor köteles napló]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Dashboard kontextus: Outdoor Kötél.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

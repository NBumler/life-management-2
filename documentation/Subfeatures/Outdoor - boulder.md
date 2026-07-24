# Outdoor - boulder

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Outdoor mászónapló]] |
| **Kapcsolódó** | [[Outdoor boulder admin]], [[Outdoor boulder napló]], [[Nehézségi szint skálája]], [[Backend-offline first]] |

### Célállapot

Kültéri boulder admin + napló.

### Funkcionális leírás

Subfeature lista:

- [[Outdoor boulder admin]]
- [[Outdoor boulder napló]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Dashboard kontextus: Outdoor Boulder.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

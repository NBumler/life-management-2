# Indoor - boulder

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Indoor mászónapló]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Backend-offline first]] |

### Célállapot

Beltéri boulder admin + napló.

### Funkcionális leírás

Subfeature lista:

- [[Indoor boulder admin]]
- [[Indoor boulder napló]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Dashboard kontextus: Indoor Boulder.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

# Indoor mászónapló

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Outdoor mászónapló]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Backend-offline first]] |

### Célállapot

Beltéri mászás napló / admin belépő (boulder + köteles).

### Funkcionális leírás

Subfeature lista:

- [[Indoor - boulder]]
- [[Indoor - köteles]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Indoor kontextus választó / navigáció.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös API: [[Mászónapló]] / giga-spec)

### Nyitott kérdések

Nincs nyitott kérdés.

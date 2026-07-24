# Események

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Naptár]], [[Értesítések]], [[Tennivalók]], [[Backend-offline first]] |

### Célállapot

Események kezelése; megjelenés a [[Naptár]]ban; közeledő eseményekhez [[Értesítések]].

### Funkcionális leírás

Subfeature lista:

- [[Új esemény hozzáadása]]
- [[Google Calendar szinkronizálása]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Feladatok / Naptár környéki UI; Google sync a gyerekben.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (esemény entitás — [[Új esemény hozzáadása]] / itt később)

### Nyitott kérdések

Nincs nyitott kérdés.

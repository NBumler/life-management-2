# Eszközök

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[GearCheck]] |
| **Kapcsolódó** | [[Sablonok]], [[Pakolás]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Felszerelés-elemek CRUD-ja (pl. kötél, bundászsák, fejlámpa): név, kategória, megjegyzés, esetleg súly / állapot.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezők listája
- Duplikáció tiltása név alapján?
- Élettartam / ellenőrzési emlékeztető ([[Értesítések]])?

## Architektúra

### Frontend

Eszköz katalógus UI.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

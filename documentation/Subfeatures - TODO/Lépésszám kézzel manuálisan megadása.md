# Lépésszám kézzel manuálisan megadása

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Lépésszám követés]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Backend-offline first]] |

### Célállapot

Napi lépésszám kézi rögzítése / felülírása, ha nincs Samsung Health szinkron.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Napi egy érték vs többszöri frissítés
- Manuális vs szinkronizált érték prioritása konfliktusnál

## Architektúra

### Frontend

Manuális lépésszám űrlap; kalória újraszámolás ([[Kalóriakalkulátor]] / Samsung Health gyerek képlete).

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

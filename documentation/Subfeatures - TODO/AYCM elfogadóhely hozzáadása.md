# AYCM elfogadóhely hozzáadása

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM Check-In]], [[AYCM Statisztikák]], [[Backend-offline first]] |

### Célállapot

Új AYCM elfogadóhely (partner) hozzáadása az alkalmazásban.

### Funkcionális leírás

Kötelező:

- név

Opcionális:

- megjegyzés

Nyitvatartás / árszabályok: a nap flag-ek, `startTime` / `endTime`, `price_huf`, `extra_co_payment_huf` részletes modellje még hiányzik. A check-in illesztési logika vázát lásd: [[AYCM Check-In]].

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Nyitvatartás és idősávonkénti árszabályok teljes adatmodellje

## Architektúra

### Frontend

Partner create / edit űrlap.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

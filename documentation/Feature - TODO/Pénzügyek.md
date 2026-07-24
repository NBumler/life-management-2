# Pénzügyek

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[AYCM tracker]], [[Profile]], [[Nettó fizetés kalkulátor]], [[Rendszeres kiadások]], [[Backend-offline first]] |

### Célállapot

Pénzügyi segédfunkciók: nettó bér kalkuláció és rendszeres kiadások. Belépés: Menü.

### Funkcionális leírás

Subfeature lista:

- [[Nettó fizetés kalkulátor]]
- [[Rendszeres kiadások]]

A [[Rendszeres kiadások]] az [[AYCM tracker]] bérletköltségének SSOT-ja is.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Menü alatti Pénzügyek belépő.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (előfizetés / kalkuláció — gyerekekben)

### Nyitott kérdések

Nincs nyitott kérdés.

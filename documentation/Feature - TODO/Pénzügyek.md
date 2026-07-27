# Pénzügyek

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[AYCM tracker]], [[Profile]], [[Nettó fizetés kalkulátor]], [[Rendszeres kiadások]], [[Bejelentkezés]], [[Backend-offline first]] |

### Célállapot

Pénzügyi segédfunkciók: nettó bér kalkuláció és rendszeres kiadások. Belépés: Menü.

**Ownership:** **user-owned** (minden pénzügyi entitás) — a részletes specek kidolgozásakor követni: [[Bejelentkezés]] ownership mátrix. A Bejelentkezés spechet ez **nem** blokkolja.

### Funkcionális leírás

Subfeature lista:

- [[Nettó fizetés kalkulátor]]
- [[Rendszeres kiadások]]

A [[Rendszeres kiadások]] az [[AYCM tracker]] bérletköltségének SSOT-ja is.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Specifikáláskor: Auth / `userId` szűrés kötelező ([[Bejelentkezés]]). A bruttó bér a [[Profile]]-on marad.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Menü alatti Pénzügyek belépő.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (előfizetés / kalkuláció — gyerekekben; user scope: [[Bejelentkezés]])

### Nyitott kérdések

Nincs nyitott kérdés.

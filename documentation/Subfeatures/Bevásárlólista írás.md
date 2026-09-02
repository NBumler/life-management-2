---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Bevásárlólista írás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Bevásárlás teljesítve]], [[Mennyiség mező]], [[Backend-offline first]] |

### Jelenlegi működés

Aktív bevásárlólista(ák) összeállítása és szerkesztése vásárlás előtt és közben; tételek pipálása a teljesítésig.

### Funkcionális leírás

- Új aktív lista létrehozása; opcionális név.
- Több aktív lista párhuzamosan kezelhető (a [[Bevásárlás]] szülő szerint).
- Tétel hozzáadása:
  - **Élelmiszer:** kizárólag az [[Élelmiszerek]] katalógusból (nincs „gyors létrehozás” a listáról). Mennyiség: [[Mennyiség mező]] — **`cs` (csomag) + súly/térfogat**; a `db` (darab) itt **nem** választható, mert a bevásárlás csomag-szintű (a katalógus ára is `Ft / csomag`, per-darab ár nincs). Részletek / indoklás: `backlog/063`.
  - **Nem-élelmiszer:** név (kötelező) + mennyiség ([[Mennyiség mező]]) + egy szabad szöveges mező (bolt, megjegyzés, egyéb — egy mezőben).
- Lista és tételek **szerkeszthetők** vásárlás közben is (hozzáadás, módosítás, törlés, átnevezés).
- Tételek **pipálhatók** („megvettem” jelzés). A pipa csak UI / állapot a listán; semmi sem történik a [[Bevásárlás teljesítve]] megnyomásáig.
- Aktív lista **törlés** megerősítő dialógussal: soft delete (nem kerül az [[Bevásárlás előzmény]]be). Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás — [[Backend-offline first]]. Nincs undelete UI.

### UI/UX elvárások

- Lista részlete: név (opcionális szerkesztés), tételek listája, pipa kontroll tételenként.
- Élelmiszer hozzáadás: katalógus választó (keresés: [[Szöveges keresés]], ha a választó keresőmezőt ad).
- Mennyiség mezők: [[Mennyiség mező]] (összeragasztott input, pl. `120dkg`, `3cs`, `2l`). Élelmiszer-tételnél nincs `db`-chip; ha egy legacy / más eszközről szinkronizált sor mégis `db` egységű, a [[Bevásárlás teljesítve]] a teljesítéskor egész csomagra felfelé kerekíti.
- Nem-élelmiszer: név + mennyiség + szabad szöveg mező.
- Egyértelmű „Bevásárlás vége” belépő a [[Bevásárlás teljesítve]] flow-ra.
- Törlés: megerősítés kötelező (soft delete; lásd fent).

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Aktív lista képernyő(k); tétel szerkesztő; pipa state; navigáció a teljesítés flow-ra. Mennyiség: [[Mennyiség mező]].

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (lista + tétel CRUD a [[Bevásárlás]] szülő OpenAPI scope-jában)

### Nyitott kérdések

Nincs nyitott kérdés.

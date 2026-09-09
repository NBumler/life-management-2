---
verifikalva: 2026-09-09
verifikalt_commit: 1d1b15c
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
- **`saveToStorage` kapcsoló** (lista-szintű, perzisztált, alapból **be**): teljesítéskor a pipált
  élelmiszerek bekerüljenek-e a saját tárolóba (`StoredFood`). Kikapcsolva a [[Bevásárlás teljesítve]]
  **nem** hoz létre `StoredFood` sorokat (pl. ha nem otthonra írod a listát). A pipálatlanokból
  születő új aktív lista (és az [[Bevásárlás előzmény]] „Újralistázás") **örökli** a kapcsoló
  értékét. Részletek: [[Bevásárlás teljesítve]].
- Több aktív lista párhuzamosan kezelhető (a [[Bevásárlás]] szülő szerint).
- Tétel hozzáadása:
  - **Élelmiszer:** kizárólag az [[Élelmiszerek]] katalógusból (nincs „gyors létrehozás” a listáról). Mennyiség: [[Mennyiség mező]] — **`cs` (csomag) + súly/térfogat**; a `db` (darab) itt **nem** választható, mert a bevásárlás csomag-szintű (a katalógus ára is `Ft / csomag`, per-darab ár nincs). Részletek / indoklás: `backlog/063`.
  - **Nem-élelmiszer:** név (kötelező) + mennyiség ([[Mennyiség mező]]) + egy szabad szöveges mező (bolt, megjegyzés, egyéb — egy mezőben).
- Lista és tételek **szerkeszthetők** vásárlás közben is (hozzáadás, módosítás, törlés, átnevezés).
- Tételek **pipálhatók** („megvettem” jelzés). A pipa csak UI / állapot a listán; semmi sem történik a [[Bevásárlás teljesítve]] megnyomásáig.
- A kipipált tételek **külön, halványított szekcióba** kerülnek a lista alján (`Kosárban (N)` fejléc), a pipálatlanok maradnak felül a húzható listában, változatlan relatív sorrendben. Vissza-pipálásra a tétel visszakerül a felső listába az eredeti helyére. A csoportosítás tisztán UI / származtatott állapot — a mentett `sortOrder` és a `checked` mező nem változik tőle.
- Aktív lista **törlés** megerősítő dialógussal: soft delete (nem kerül az [[Bevásárlás előzmény]]be). Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás — [[Backend-offline first]]. Nincs undelete UI.

### UI/UX elvárások

- Lista részlete: név (opcionális szerkesztés), alatta a **„Tárolóba mentés teljesítéskor"** `ion-toggle` (alapból be) rövid magyarázó `ion-note`-tal, majd a pipálatlan tételek húzható listája, alatta a kipipált („Kosárban") tételek halványított, áthúzott nevű szekciója (fejléc + darabszám); pipa kontroll mindkét csoportban, törlés a kipipált soron is.
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

Aktív lista képernyő(k); tétel szerkesztő; pipa state (a pipálatlan / kipipált csoport a `checked` signalokból származtatott computed, a kipipáltak külön szekcióban); navigáció a teljesítés flow-ra. Mennyiség: [[Mennyiség mező]].

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

`ShoppingList.saveToStorage` (`boolean`, OpenAPI default `true`, nem `readOnly`) — a nested aggregate
PUT/POST írja, mint a `name`-et; hiányzó / `null` bemenet = `true`. DB: `shopping_list.save_to_storage
boolean NOT NULL DEFAULT true` (`V36`), on-device tükre `SCHEMA_V35` (`INTEGER … DEFAULT 1`). A
`sync_changes` view érintetlen (új oszlop, nem új entitás). Outbox: `OUTBOX_PAYLOAD_SCHEMA_VERSION`
v3 → v4, a `ShoppingList` migrátor-lépés a hiányzó kulcsot `true`-ra tölti. Egyébként lista + tétel
CRUD a [[Bevásárlás]] szülő OpenAPI scope-jában.

### Nyitott kérdések

Nincs nyitott kérdés.

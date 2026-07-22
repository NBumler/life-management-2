# Bevásárlólista írás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Bevásárlás teljesítve]], [[Mennyiség mező]] |

### Célállapot

Aktív bevásárlólista(ák) összeállítása és szerkesztése vásárlás előtt és közben; tételek pipálása a teljesítésig.

### Funkcionális leírás

- Új aktív lista létrehozása; opcionális név.
- Több aktív lista párhuzamosan kezelhető (a [[Bevásárlás]] szülő szerint).
- Tétel hozzáadása:
  - **Élelmiszer:** kizárólag az [[Élelmiszerek]] katalógusból (nincs „gyors létrehozás” a listáról). Mennyiség: [[Mennyiség mező]].
  - **Nem-élelmiszer:** név (kötelező) + mennyiség ([[Mennyiség mező]]) + egy szabad szöveges mező (bolt, megjegyzés, egyéb — egy mezőben).
- Lista és tételek **szerkeszthetők** vásárlás közben is (hozzáadás, módosítás, törlés, átnevezés).
- Tételek **pipálhatók** („megvettem” jelzés). A pipa csak UI / állapot a listán; semmi sem történik a [[Bevásárlás teljesítve]] megnyomásáig.
- Aktív lista **hard delete** megerősítő dialógussal (archívum nélkül törlődik).

### UI/UX elvárások

- Lista részlete: név (opcionális szerkesztés), tételek listája, pipa kontroll tételenként.
- Élelmiszer hozzáadás: katalógus választó (keresés: [[Szöveges keresés]], ha a választó keresőmezőt ad).
- Mennyiség mezők: [[Mennyiség mező]] (összeragasztott input, pl. `120dkg`, `3db`, `2l`).
- Nem-élelmiszer: név + mennyiség + szabad szöveg mező.
- Egyértelmű „Bevásárlás vége” belépő a [[Bevásárlás teljesítve]] flow-ra.
- Hard delete megerősítés kötelező.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Aktív lista képernyő(k); tétel szerkesztő; pipa state; navigáció a teljesítés flow-ra. Mennyiség: [[Mennyiség mező]].

### Backend

_Nincs backend érintettség._ (lista + tétel CRUD a [[Bevásárlás]] szülő OpenAPI scope-jában)

### Nyitott kérdések

Nincs nyitott kérdés.

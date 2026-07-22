# Bevásárlás előzmény

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Bevásárlás teljesítve]], [[Bevásárlólista írás]], [[Szöveges keresés]] |

### Célállapot

Archivált bevásárlólisták megtekintése, szöveges keresése, és újralistázása új aktív listába.

### Funkcionális leírás

- Az `ARCHIVED` státuszú listák megtekinthetők (tételek, mennyiségek, pipaállapotok, teljesítés időpontja).
- A `completedAt` / létrehozás dátuma **el van mentve**; az első verzióban **nincs** dátum alapú szűrés — csak megjelenítéshez kell.
- **Szöveges keresés** az előzményben: [[Szöveges keresés]] (kis/nagybetű és ékezet-független egyezés; ékezetes query esetén az ékezet-pontos találatok előre). Keresési célmezők: lista neve, tételnevek (élelmiszer megjelenített neve / nem-élelmiszer név), nem-élelmiszer szabad szöveg.
- **Újralistázás:** archív listából új `ACTIVE` lista jön létre:
  - ugyanazok a tételek és mennyiségek,
  - **üres pipák**,
  - lista neve: másolható az eredetiből (ha volt), vagy üresen hagyható — a másolat legyen szerkeszthető létrehozás után ([[Bevásárlólista írás]]).

Az előzmény listák read-only-k (nincs szerkesztés / hard delete az első verzióban; az aktív másolat már szerkeszthető).

### UI/UX elvárások

- Előzmény lista + részlet nézet.
- Keresőmező felül: [[Szöveges keresés]] viselkedés.
- Újralistázás gomb a részleten (vagy listaelem akció); eredmény: navigáció az új aktív listára.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Archivált listák UI; keresés a [[Szöveges keresés]] szabályaival; újralistázás → create active list API.

### Backend

_Nincs backend érintettség._ (olvasás + „relist” / copy a [[Bevásárlás]] szülő API-jában)

### Nyitott kérdések

Nincs nyitott kérdés.

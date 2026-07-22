# Bevásárlás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Kaja]], [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Mennyiség mező]], [[Szöveges keresés]], [[Frontend]] |

### Célállapot

Bevásárlólisták írása és párhuzamos aktív listák kezelése, vásárlás közbeni pipálás, teljesítés (archiválás + élelmiszerek vezetése az [[Élelmiszer tárolás]]ba), valamint archivált listák előzménye (keresés, újralistázás). Belépés: **Menü** tab (lásd [[Frontend]]) — nem a Kaja tabon.

### Funkcionális leírás

Subfeature lista:

- [[Bevásárlólista írás]]
- [[Bevásárlás teljesítve]]
- [[Bevásárlás előzmény]]

Közös szabályok (szülő szint):

- Több **aktív** lista egyszerre megengedett.
- Lista **neve** opcionális.
- Nincs lista-szintű bolt mező; bolt / megjegyzés csak nem-élelmiszer tételen (szabad szöveg).
- Tétel típusok:
  - **Élelmiszer:** csak az [[Élelmiszerek]] katalógusból választható; mennyiség a [[Mennyiség mező]] komponenssel.
  - **Nem-élelmiszer:** név + mennyiség ([[Mennyiség mező]]) + egy szabad szöveges mező (bolt / megjegyzés / egyéb).
- Vásárlás közben a tételek **pipálhatók**; a pipa önmagában nem indít archiválást, tárolást vagy új listát. Ezek a [[Bevásárlás teljesítve]] gomb megnyomásakor futnak.
- Aktív lista **hard delete** (megerősítéssel).
- Mennyiség mindenütt: [[Mennyiség mező]]. Előzmény keresés: [[Szöveges keresés]].

### UI/UX elvárások

- Belépés a Menü tabból (GearCheck / AYCM / stb. mintájára).
- Aktív listák listanézete + lista részlete / szerkesztő.
- Előzmény külön belépő vagy szekció a Bevásárlás feature-ön belül — lásd [[Bevásárlás előzmény]].

### Megjegyzések

A Kaja feature domainben kapcsolódik ([[Élelmiszerek]], [[Élelmiszer tárolás]]), de a navigációs helye a Menü.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Menü alatti Bevásárlás belépő; feature flag a [[Life Management 2.0]] szerint.
- Közös UI: [[Mennyiség mező]], [[Szöveges keresés]].
- Offline: [[Backend-offline first]] (kliens UUID, outbox).

### Backend

OpenAPI scope a Bevásárlás feature alatt (közös a subfeature-ökkel):

| Entitás | Fő mezők |
|---|---|
| `ShoppingList` | `id` (UUID, kliens), `name` (opcionális), `status` (`ACTIVE` \| `ARCHIVED`), `createdAt`, `completedAt` (archívumnál), tételek |
| `ShoppingListItem` | `id` (UUID), `type` (`FOOD` \| `NON_FOOD`), `foodId` (FOOD), `name` (NON_FOOD), `note` (NON_FOOD, szabad szöveg), `quantityAmount`, `quantityUnit`, `checked`, sorrend |

Műveletek (elvárás):

- Aktív lista CRUD; tétel CRUD; pipa frissítés.
- Aktív lista hard delete.
- Teljesítés: atomi / tranzakcionális flow — lásd [[Bevásárlás teljesítve]] (archívum + tárolás create + opcionális új aktív lista a pipálatlanokból).
- Előzmény: archivált listák olvasása; újralistázás új `ACTIVE` listát hoz létre.

Mennyiség egységek SSOT a [[Mennyiség mező]] szerint (`db`, `g`, `dkg`, `kg`, `l`, `dl`, `ml`).

### Nyitott kérdések

Nincs nyitott kérdés.

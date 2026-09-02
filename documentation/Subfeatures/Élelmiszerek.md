---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Élelmiszerek

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszer hozzáadása]], [[Élelmiszer manuális bevitele]], [[Élelmiszer tárolás]], [[Bevásárlólista írás]], [[Bevásárlás teljesítve]], [[Kaja statisztika]], [[Recept]], [[Mennyiség mező]], [[Szöveges keresés]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Élelmiszer **katalógus** (master data) a Kaja modulban: listázás, keresés, részletek, létrehozás, szerkesztés, törlés. A bevásárlás, tárolás, recept és étkezés ebből választ / erre hivatkozik.

**Ownership:** **shared** (globális) — minden bejelentkezett user ugyanazt a katalógust látja / szerkeszti. Nem user-scoped. Részletek: [[Bejelentkezés]] ownership mátrix.

### Funkcionális leírás

#### Subfeature / belépők

- [[Élelmiszer hozzáadása]] (manuális, vonalkód, clipboard)

#### Katalógus műveletek

- **Lista** + **keresés** ([[Szöveges keresés]]).
- **Részletek** megtekintése.
- **Szerkesztés:** ugyanaz az űrlap, mint [[Élelmiszer manuális bevitele]].
- **Létrehozás:** [[Élelmiszer hozzáadása]] → tipikusan [[Élelmiszer manuális bevitele]] (előtöltéssel vagy üresen).
- Csak a **termék neve** kötelező; hiányos tételek megengedettek. (Külön „hiányos tételek" szűrő jelenleg nincs — tervezett, nincs nyitott jegy.)

#### Mezők (összefoglaló)

Részletes UI / szabályok: [[Élelmiszer manuális bevitele]].

- Alap: termék, üzlet, márka, vonalkód (EAN), egyéb, ár (Ft/csomag), 1 csomag nettó tartalma ([[Mennyiség mező]] `quantity`), **1 darab** (opcionális darab-definíció).
- **1 darab (`pieceAmount` + `pieceUnit`):** opcionális; „1 darab mekkora" — vagy SI mennyiséggel (`1 db = 30 g`), vagy a csomag hányadaként (`0.25 cs`, tört is: `1/6 csomag`). Mindkettő üres → `1 darab = 1 csomag`. Csak az egyik kitöltve → validációs hiba (vagy mindkettő, vagy egyik sem). A `pieceUnit` **nem** lehet `db` (körkörös). Ezáltal a `db` mennyiség-egység ott is használható, ahol egy `Food`-hoz kötött (recept-hozzávaló, [[Élelmiszer forrású étkezés]], [[Élelmiszer tárolás]] felvétel), és a darab-definíción keresztül old fel csomagra → g/ml-re → árra.
- Tápanyagok 100 g / 100 ml-re (rögzített sorrend; só → nátrium / klorid kalkuláció).
- Romlási idők ([[Mennyiség mező]] `duration`): kamra, hűtő, fagyasztó, felbontás után.
- Engedélyezett tárolási mód = kitöltött kamra / hűtő / fagyasztó idő; üres = nem engedélyezett ([[Bevásárlás teljesítve]], [[Élelmiszer tárolás]]).

#### Duplikáció

Új tétel mentése **tiltott**, ha **minden** mezője megegyezik egy már létező **élő** katalóguselemével. Részleges egyezés megengedett (pl. ugyanaz a termék más üzletben = külön tétel). A szabály **backend-offline** állapotban is él (helyi adat).

A mezők összehasonlításának kanonikus szabálya (szöveg-normalizálás, vonalkód, `null` ≠ `0`, mennyiség-egység — `netAmount`/`netUnit` **és** `pieceAmount`/`pieceUnit`, skálázott-egész egyenlőséggel): [[Névegyediség]] → mezőhalmaz-egyediség.

A `store` jelenleg szabad szöveg a `Food` soron; külön bolt-entitásra bontás (ár boltonként) tervezett, nincs nyitott jegy.

#### Törlés (soft delete)

- Soft delete + megerősítés — [[Backend-offline first]] (tombstone, ne 404). Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás.
- A megerősítő dialógus **jelenleg** egy generikus közös-katalógus figyelmeztetést mutat („más felhasználók tárolását, receptjeit, bevásárlólistáit és étkezéseit is érintheti"). A konkrét hivatkozás-lista tételes felsorolása még nincs bekötve — tervezett: `backlog/009-katalogus-recept-etkezes-torles-megerosito-nem-sorolja-fel-a-cas.md`.
- Törléskor a hivatkozó elemek is soft delete (cascade a szerveren: `stored_food`, `recipe_ingredient`, `meal_item`, `shopping_list_item`, + cascade után üres étkezés is soft delete — [[Étkezés]]). A **helyi** (offline) cascade jelenleg csak `stored_food` + `recipe_ingredient` sorokra fut; a `meal_item` / `shopping_list_item` a következő delta pull-ig marad helyben — tervezett: `backlog/010-offline-food-torles-helyi-cascade-nem-terjed-ki-meal-item-shoppi.md`.
- **Shared katalógus:** a cascade **minden user** hivatkozó adataira vonatkozik; a megerősítő szöveg jelezze, hogy közös katalóguselem törlése más felhasználók adatait is érintheti.
- Duplikáció-ellenőrzés csak **élő** (`deleted = false`) sorokra. Nincs undelete UI.
- Backend-offline állapotban is elérhető (helyi `deleted` + outbox `DELETE`).

#### Fogyasztók

- [[Bevásárlólista írás]]: élelmiszer tétel **csak** ebből a katalógusból.
- [[Bevásárlás teljesítve]] / [[Élelmiszer tárolás]]: lejárat és tárolási hely a katalógus romlási / engedélyezett mód mezőiből.

Az egész Élelmiszerek feature (CRUD, keresés, OFF sync a gyerekekben) **backend-offline first**.

### UI/UX elvárások

- Belépés a **Kaja** tabon.
- Lista + kereső; tétel → részletek / szerkesztés.
- Hozzáadás belépő: [[Élelmiszer hozzáadása]] (és/vagy FAB — vonalkód: [[Vonalkódos élelmiszer beolvasás]]).
- Törlés: megerősítő dialógus (közös-katalógus figyelmeztetés; a tételes hivatkozás-lista tervezett — `backlog/009-katalogus-recept-etkezes-torles-megerosito-nem-sorolja-fel-a-cas.md`).

### Megjegyzések

A [[Bevásárlás]] navigációja a Menü tabon van, de az élelmiszer tételek ehhez a katalógushoz kötődnek.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Kaja tab: katalógus lista, keresés ([[Szöveges keresés]]), részletek, szerkesztő / létrehozó ([[Élelmiszer manuális bevitele]]).

#### Backend-offline

- Katalógus CRUD, keresés, duplikáció-ellenőrzés: helyi adatokból (Backend-offline / Full-offline). Listák `deleted = false`. A helyi törlés-cascade jelenleg `stored_food` + `recipe_ingredient` (lásd „Törlés"); tételes cascade-előnézet UI nincs.
- Mutációk outboxba; kliens UUID. OFF sync a gyerek specekben.
- Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

OpenAPI scope — élelmiszer katalógus (közös a subfeature-ökkel):

| Entitás | Fő mezők (elvárás) |
|---|---|
| `Food` | `id` (UUID, kliens); `name` (kötelező); `store`; `brand`; `barcode`; `note`; `priceHuf` (Ft/csomag); `netAmount` + `netUnit` (`quantity` egységek, `cl` is); `pieceAmount` + `pieceUnit` (darab-definíció — `numeric` / `text`, mindkettő nullable, both-or-neither; `pieceUnit ∈ {g,dkg,kg,ml,cl,dl,l,cs}`, `db` tiltott); tápanyag mezők (kcal + g értékek a spece szerinti listával); `shelfRoomAmount`/`Unit`, `shelfFridgeAmount`/`Unit`, `shelfFreezerAmount`/`Unit`, `shelfAfterOpeningAmount`/`Unit` (`duration`); `deleted` / `deleted_at`; `createdAt`, `updatedAt` |

**Ownership:** shared — nincs `userId`; Auth: bármely autentikált `USER` CRUD ([[Bejelentkezés]]).

Műveletek:

- CRUD; lista + szöveges keresés.
- Create/update: duplikáció ellenőrzés (összes mező egyezése, [[Névegyediség]] szerint normalizálva, a darab-definíciót is beleértve) — **globális** a shared katalógus **élő** sorain. Alkalmazás-szintű ellenőrzés, nem egyetlen unique index. A darab-definíció both-or-neither / `db`-tiltás szabályát a `FoodService.validatePiece` kényszeríti (`VALIDATION_ERROR` + `field`), a klienssel azonos szabállyal.
- Delete: soft delete + cascade soft delete a hivatkozó tárolás / recept / bevásárlás / étkezés tételekre **minden usernél**; a kliens a megerősítéshez előtte lekérdezheti / helyben tudja a hivatkozásokat. `DELETE` idempotens; saját törölt `GET` by id → 200 + `deleted` (ne 404).

Mennyiség / időtartam egységek SSOT: [[Mennyiség mező]].

### Nyitott kérdések

Nincs nyitott kérdés.

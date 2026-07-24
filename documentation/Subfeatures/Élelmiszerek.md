# Élelmiszerek

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszer hozzáadása]], [[Élelmiszer manuális bevitele]], [[Élelmiszer tárolás]], [[Bevásárlólista írás]], [[Bevásárlás teljesítve]], [[Kaja statisztika]], [[Recept]], [[Mennyiség mező]], [[Szöveges keresés]], [[Backend-offline first]] |

### Célállapot

Élelmiszer **katalógus** (master data) a Kaja modulban: listázás, keresés, részletek, létrehozás, szerkesztés, törlés. A bevásárlás, tárolás, recept és étkezés ebből választ / erre hivatkozik.

### Funkcionális leírás

#### Subfeature / belépők

- [[Élelmiszer hozzáadása]] (manuális, vonalkód, clipboard)

#### Katalógus műveletek

- **Lista** + **keresés** ([[Szöveges keresés]]).
- **Részletek** megtekintése.
- **Szerkesztés:** ugyanaz az űrlap, mint [[Élelmiszer manuális bevitele]].
- **Létrehozás:** [[Élelmiszer hozzáadása]] → tipikusan [[Élelmiszer manuális bevitele]] (előtöltéssel vagy üresen).
- Csak a **termék neve** kötelező; hiányos tételek megengedettek (későbbi szűrő feature a hiányosakra — nincs scope ebben a spechen).

#### Mezők (összefoglaló)

Részletes UI / szabályok: [[Élelmiszer manuális bevitele]].

- Alap: termék, üzlet, márka, vonalkód (EAN), egyéb, ár (Ft/csomag), 1 csomag nettó tartalma ([[Mennyiség mező]] `quantity`).
- Tápanyagok 100 g / 100 ml-re (rögzített sorrend; só → nátrium / klorid kalkuláció).
- Romlási idők ([[Mennyiség mező]] `duration`): kamra, hűtő, fagyasztó, felbontás után.
- Engedélyezett tárolási mód = kitöltött kamra / hűtő / fagyasztó idő; üres = nem engedélyezett ([[Bevásárlás teljesítve]], [[Élelmiszer tárolás]]).

#### Duplikáció

Új tétel mentése **tiltott**, ha **minden** mezője megegyezik egy már létező katalóguselemével. Részleges egyezés megengedett (pl. ugyanaz a termék más üzletben = külön tétel). A szabály **backend-offline** állapotban is él (helyi adat).

Későbbi modellbontás (külön bolt entitás) nincs scope-ban.

#### Törlés (hard delete)

- Hard delete; megerősítéssel.
- Ha vannak hivatkozások (tárolás, recept összetevő, bevásárlólista tétel, stb.), a megerősítő UI **felsorolja**, mi törlődik együtt.
- Törléskor a hivatkozó elemek is törlődnek (cascade).
- Backend-offline állapotban is elérhető (helyi törlés + outbox).

#### Fogyasztók

- [[Bevásárlólista írás]]: élelmiszer tétel **csak** ebből a katalógusból.
- [[Bevásárlás teljesítve]] / [[Élelmiszer tárolás]]: lejárat és tárolási hely a katalógus romlási / engedélyezett mód mezőiből.

Az egész Élelmiszerek feature (CRUD, keresés, OFF sync a gyerekekben) **backend-offline first**.

### UI/UX elvárások

- Belépés a **Kaja** tabon.
- Lista + kereső; tétel → részletek / szerkesztés.
- Hozzáadás belépő: [[Élelmiszer hozzáadása]] (és/vagy FAB — vonalkód: [[Vonalkódos élelmiszer beolvasás]]).
- Törlés: megerősítő dialógus; hivatkozások felsorolása, ha vannak.

### Megjegyzések

A [[Bevásárlás]] navigációja a Menü tabon van, de az élelmiszer tételek ehhez a katalógushoz kötődnek.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Kaja tab: katalógus lista, keresés ([[Szöveges keresés]]), részletek, szerkesztő / létrehozó ([[Élelmiszer manuális bevitele]]).

#### Backend-offline

- Katalógus CRUD, keresés, duplikáció-ellenőrzés, cascade törlés előnézet: helyi adatokból (Backend-offline / Full-offline).
- Mutációk outboxba; kliens UUID. OFF sync a gyerek specekben.
- Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

OpenAPI scope — élelmiszer katalógus (közös a subfeature-ökkel):

| Entitás | Fő mezők (elvárás) |
|---|---|
| `Food` | `id` (UUID, kliens); `name` (kötelező); `store`; `brand`; `barcode`; `note`; `priceHuf` (Ft/csomag); `netAmount` + `netUnit` (`quantity` egységek, `cl` is); tápanyag mezők (kcal + g értékek a spece szerinti listával); `shelfRoomAmount`/`Unit`, `shelfFridgeAmount`/`Unit`, `shelfFreezerAmount`/`Unit`, `shelfAfterOpeningAmount`/`Unit` (`duration`); `createdAt`, `updatedAt` |

Műveletek:

- CRUD; lista + szöveges keresés.
- Create/update: duplikáció ellenőrzés (összes mező egyezése).
- Delete: hard delete + cascade a hivatkozó tárolás / recept / bevásárlás tételekre (vagy ekvivalens szerveroldali törlés); a kliens a megerősítéshez előtte lekérdezheti / helyben tudja a hivatkozásokat.

Mennyiség / időtartam egységek SSOT: [[Mennyiség mező]].

### Nyitott kérdések

Nincs nyitott kérdés.

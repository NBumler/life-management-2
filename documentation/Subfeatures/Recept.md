---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Recept

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Mennyiség mező]], [[Szöveges keresés]], [[Recept forrású étkezés]], [[Étkezés]], [[Kaja statisztika]], [[Tápérték kalkulátor]], [[Élelmiszer tárolás]], [[Pakolás]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Receptek katalógusa: név, megjegyzés, hozzávalók ([[Élelmiszerek]] + mennyiség), automatikus összegzett tápanyag / ár a részleteken. Étkezéskor a recept forrásként használható ([[Recept forrású étkezés]]); adag / részfogyasztás **nem** receptmező — az étkezés spechéhez tartozik.

**Ownership:** **shared** (globális) — minden bejelentkezett user ugyanazt a receptkatalógust látja / szerkeszti. Részletek: [[Bejelentkezés]] ownership mátrix.

Az egész feature (lista, create, szerkesztés, törlés, kalkuláció, keresés) **backend-offline** állapotban is működik.

### Funkcionális leírás

#### Mezők

| Mező | Szabály |
|---|---|
| **Recept neve** | Kötelező (pl. Sajtos tejfölös tészta). |
| **Megjegyzés** | Opcionális, többsoros sima szöveg (pl. elkészítési lépések). **Nincs** markdown. Külön lépéslista / elkészítési idő admin tervezett (`backlog/053-recept-kulon-elkeszitesi-lepesek-ido-admin.md`); jelenleg a megjegyzésben él. |
| **Hozzávalók** | Opcionális lista; üres hozzávalós recept menthető. |

Nincs adagszám / serving mező a recepten.

#### Hozzávalók

- Csak az [[Élelmiszerek]] katalógusból.
- Mennyiség: [[Mennyiség mező]] `quantity` módban.
- **Ugyanaz az élelmiszer kétszer** a receptben: **tiltott** (választóban a már felvett elemek disabled).
- Hozzávaló **törölhető** létrehozáskor és szerkesztéskor is.
- **Sorrend:** manuális újrarendezés — weben drag-and-drop; telefonon fel / le nyilak ([[Pakolás]] / GearCheck mintájára). A sorrend mentésre kerül; duplikáció-ellenőrzésnél **nem** számít.

##### Élelmiszer felvétel UX

1. Keresős választó ([[Szöveges keresés]]), **többszörös kijelölés** egy megnyitással.
2. Bezárás után a kijelölt élelmiszerek megjelennek a hozzávalólistán.
3. Mennyiség mezők **üresek** (nincs előtöltés) — mentés előtt a user tölti; üres mennyiségű hozzávaló → invalid / nem menthető, amíg ki nincs töltve **vagy** a sor törölve nincs. (Ha a receptnek van hozzávaló sora, annak mennyisége kötelező; nulla hozzávaló OK.)

##### `cs` / `db` megjelenítés és jelentés

A hozzávaló mennyisége lehet **csomag** (`cs`), **darab** (`db`) vagy SI (`g`/`ml`/…). A `db` egység
**kontextuális**: mindig az adott [[Élelmiszerek]] darab-definícióján keresztül értelmezhető
(`pieceAmount` + `pieceUnit`), ahogy a `cs` a nettó tartalmon keresztül. Feloldás nélkül `1 db = 1
csomag`. A közös feloldó: `frontend/src/app/pages/food/food-quantity.ts`.

- Tárolás: pl. `amount=2`, `unit=cs` vagy `unit=db`.
- UI zárójeles átváltás (`formatFoodQuantity`):
  - `2cs (1000g)` — ha a katalógus nettó tartalma ismert; különben `2cs`.
  - `3db (18dkg)` — ha a darab-definíció SI (`1 db = 6 dkg`).
  - `3db (0.5cs)` — ha a darab-definíció csomag-hányad (`1 db = 1/6 cs`, tört tizedesre kerekítve).
  - `3db` — ha nincs darab-definíció.

#### Automatikus összegzés (részletek + downstream)

A hozzávalók és az [[Élelmiszerek]] tápanyag / ár mezőiből **számított** (nem szerkeszthető) összesítők. Részleteken megjelenő, fontos értékek:

- összes **ár** (Ft)
- összes **kalória** (kcal)
- összes **fehérje** (g)
- összes **szénhidrát** (g)
- összes **zsír** (g)

A `computeRecipeSummary` jelenleg a fenti öt értéket (a 4 headline makró + ár) összegzi. Az egyéb tápanyagok (só, rost, stb.) ugyanezzel a modellel való összegzése tervezett: `backlog/050-recept-egyeb-tapanyagok-so-rost-osszegzese.md`.

##### Mennyiség → tápanyag

Tápanyagok a katalógusban **100 g / 100 ml**-re vannak megadva.

1. Határozd meg a hozzávaló **gramm / ml ekvivalensét** (`baseAmount`) a közös
   `resolveFoodQuantity(amount, unit, food)` feloldóval:
   - `unit = cs`: `baseAmount = csomagszám × nettó tartalom` (kanonikus g/ml); nettó nem-SI / üres →
     nincs `baseAmount` (hiányos).
   - `unit = db`: a darab-definíción át `cs`-re, majd a fenti; SI darab-definíció esetén közvetlenül
     `darabszám × pieceAmount` (g/ml). Definíció nélkül `1 db = 1 cs`.
   - tömeg / térfogat egység: `baseAmount =` a megadott mennyiség kanonikus g/ml-re hozva.
2. Egy tápanyagra: `(baseAmount / 100) × (tápanyag / 100 g|ml)`.
3. Receptösszeg = hozzávalók összege.

Ha egy élelmiszeren a konkrét tápanyag mező üres → ahhoz a hozzávalóhoz **0** azzal a tápanyaggal, és a recept **hiányos adat** jelzést kap.

##### Ár

Katalógus ár = **Ft / csomag** (1 csomag = nettó tartalom). Az ár mindig
`csomag-ekvivalens × priceHuf`, ahol a csomag-ekvivalenst a `resolveFoodQuantity` adja (`packages`):

- `N cs` → `N × priceHuf`
- `N db` → a darab-definíción át csomagra, majd `× priceHuf` (definíció nélkül `N × priceHuf`); SI
  darab-definíció + azonos dimenziójú nettó esetén a g/ml-ből számolt csomaghányad.
- Egyéb mennyiség + ismert nettó (ugyanaz a dimenzió): `(felhasznált / nettó) × priceHuf`
- Nettó vagy ár üres (és nem `cs`/definíció nélküli `db`) → az adott hozzávaló ára **0** + hiányos jelzés

#### Duplikáció

Új / mentett recept **tiltott**, ha:

1. a **neve** megegyezik egy meglévő **élő** recept nevével — összehasonlítási szabály: [[Névegyediség]], **vagy**
2. a hozzávaló-halmaz megegyezik: ugyanazok az `foodId` + `amount` + `unit` párok, **sorrendtől függetlenül** (üres hozzávalós receptek: csak a név dönt; két üres-hozzávalós különböző nevű OK).

   Szándékos szabály: a cél a szó szerinti véletlen kétszer-bevitel elkerülése — ha két recept hozzávaló-halmaza (mennyiségre pontosan) megegyezik, az a gyakorlatban tipikusan elgépelt duplikátum, nem két legitim, eltérő recept. Ha a userben mégis szándékosan két, azonos hozzávalójú de eltérő elkészítésű recept van, egy tetszőleges hozzávaló mennyiségének 1 egységgel eltérő megadásával a szabály megkerülhető — ez tudatosan elfogadott korlát, nem hiba.

   A `unit` itt **szó szerinti** párként számít (nincs kereszt-egység kanonikalizálás): `2db` ≠ `2cs`
   akkor is, ha az adott élelmiszer darab-definíciója szerint egyenértékűek lennének. Ez összhangban
   van a fenti „szó szerinti kétszer-bevitel elkerülése" céllal.

Backend-offline: helyi ellenőrzés is.

#### CRUD / törlés

- Lista, részletek, létrehozás, szerkesztés, soft delete — mind offline-képes. Soha nem szinkronizált helyi draft → helyi hard remove + outbox tisztítás — [[Backend-offline first]].
- Törléskor a hivatkozó [[Étkezés]] / [[Recept forrású étkezés]] rekordok **cascade** soft delete-et kapnak (backend `MealCascade` + kliens drain/pull `mealItemCascadeTombstoneTasks`), shared katalógus → **minden user** érintett étkezésére. A megerősítő dialógus jelenleg egy sima név-alapú megerősítés; a hivatkozó rekordok tételes felsorolása és a több-felhasználós hatás jelzése tervezett: `backlog/009-katalogus-recept-etkezes-torles-megerosito-nem-sorolja-fel-a-cas.md`. Nincs undelete UI. Név-egyediség csak élő sorokra.

#### Kapcsolat étkezéssel

[[Recept forrású étkezés]]: a recept hozzávalói alapján készletlevonás ([[Élelmiszer tárolás]]); az elfogyasztott **hányad** (pl. fél recept) az étkezés spechében van, nem itt.

### UI/UX elvárások

- Kaja tab: recept lista + [[Szöveges keresés]].
- Külön read-only **Részletek** nézet (név, megjegyzés, hozzávalók `cs`/`db`-nél zárójeles átváltással, összegzett ár / kcal / fehérje / szénhidrát / zsír, hiányos adat jelzés) tervezett: `backlog/046-recept-read-only-reszletek-nezet.md`. Jelenleg a listából tap közvetlenül a szerkesztőbe visz, ami mutatja az összegzést.
- Szerkesztő: név, megjegyzés, hozzávaló lista (törlés, reorder, mennyiség — [[Mennyiség mező]] `unitChips`: `cs`/`db`/`g`/`dkg`/`ml`); multi-select élelmiszer felvevő.
- Mentés: fix alsó footer; iOS input min. `16px`.

### Megjegyzések

Külön „elkészítési lépések / idő” admin: a megjegyzésből választható le; tervezett — `backlog/053-recept-kulon-elkeszitesi-lepesek-ido-admin.md`.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Recept lista / részletek / szerkesztő; quantity parser; multi-select food picker; platformos reorder ([[Pakolás]] mintára).
- Összegzés pure utility (ár + tápanyagok) a katalógus snapshotja alapján; hiányos flag.

#### Backend-offline

- Lista, részletek, create / update / soft delete: helyi store + outbox; kliens UUID.
- Duplikáció-ellenőrzés és tápanyag / ár összegzés a helyi katalógus snapshotján (Backend-offline és Full-offline).
- Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

| Entitás | Fő mezők |
|---|---|
| `Recipe` | `id` (UUID, kliens); `name` (unique élő sorokra `name_normalized` szerint — [[Névegyediség]]); `note`; `deleted` / `deleted_at`; `createdAt`, `updatedAt` |
| `RecipeIngredient` | `id`; `recipeId`; `foodId`; `quantityAmount`; `quantityUnit` (`cs` / `db` / SI — [[Mennyiség mező]]); `sortOrder` |

- Unique: `name_normalized` **élő** sorokra ([[Névegyediség]]); alkalmazás-szintű / query ellenőrzés a hozzávaló-halmaz duplikációra — **globális** (shared, `deleted = false`).
- **Ownership:** shared — nincs `userId`; Auth: bármely autentikált `USER` CRUD ([[Bejelentkezés]]).
- CRUD + soft delete cascade az étkezés-hivatkozásokra **minden usernél** (`MealCascade`). `DELETE` idempotens; `POST` létező id-val idempotens upsert; `PUT` soft-deleted soron → 409 `ENTITY_DELETED`; törölt `GET` by id → 200 + `deleted`.
- Összegzett tápanyag / ár: **számított kliensen** (`recipe-summary.ts:computeRecipeSummary`), nincs denormalizált oszlop és nincs szerveroldali read-model.

### Nyitott kérdések

Nincs nyitott kérdés.

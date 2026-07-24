# Recept

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Mennyiség mező]], [[Szöveges keresés]], [[Recept forrású étkezés]], [[Étkezés]], [[Kaja statisztika]], [[Tápérték kalkulátor]], [[Élelmiszer tárolás]], [[Pakolás]], [[Backend-offline first]] |

### Célállapot

Receptek katalógusa: név, megjegyzés, hozzávalók ([[Élelmiszerek]] + mennyiség), automatikus összegzett tápanyag / ár a részleteken. Étkezéskor a recept forrásként használható ([[Recept forrású étkezés]]); adag / részfogyasztás **nem** receptmező — az étkezés spechéhez tartozik.

Az egész feature (lista, create, szerkesztés, törlés, kalkuláció, keresés) **backend-offline** állapotban is működik.

### Funkcionális leírás

#### Mezők

| Mező | Szabály |
|---|---|
| **Recept neve** | Kötelező (pl. Sajtos tejfölös tészta). |
| **Megjegyzés** | Opcionális, többsoros sima szöveg (pl. elkészítési lépések). **Nincs** markdown. Későbbi feature lehet külön lépéslista / elkészítési idő — most a megjegyzésben él. |
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

##### `db` megjelenítés és jelentés

- Tárolás: pl. `amount=2`, `unit=db`.
- UI: ha a katalógus nettó tartalma ismert → **`2db (1000g)`** formátum (nettó × darabszám, a nettó egységében). Ha nettó üres → csak `2db` (nincs zárójeles átváltás).

#### Automatikus összegzés (részletek + downstream)

A hozzávalók és az [[Élelmiszerek]] tápanyag / ár mezőiből **számított** (nem szerkeszthető) összesítők. Részleteken megjelenő, fontos értékek:

- összes **ár** (Ft)
- összes **kalória** (kcal)
- összes **fehérje** (g)
- összes **szénhidrát** (g)
- összes **zsír** (g)

Egyéb tápanyagok (só, rost, stb.) ugyanezzel a modellel számolhatók a kliensen / API-n — étkezés, fogyás, [[Tápérték kalkulátor]], [[Kaja statisztika]] számára; a részletek elsődleges sorában a fenti öt + hiányjelzés elég.

##### Mennyiség → tápanyag

Tápanyagok a katalógusban **100 g / 100 ml**-re vannak megadva.

1. Határozd meg a hozzávaló **gramm / ml ekvivalensét** (`baseAmount`), ha lehet:
   - `unit = db`: `baseAmount = darabszám × nettó tartalom` (ha nettó üres → `baseAmount = 0`)
   - tömeg / térfogat egység: `baseAmount =` a megadott mennyiség (kanonikus egységre hozva, ha kell)
2. Egy tápanyagra: `(baseAmount / 100) × (tápanyag / 100 g|ml)`.
3. Receptösszeg = hozzávalók összege.

Ha egy élelmiszeren a konkrét tápanyag mező üres → ahhoz a hozzávalóhoz **0** azzal a tápanyaggal, és a recept **hiányos adat** jelzést kap.

##### Ár

Katalógus ár = **Ft / csomag** (1 csomag = nettó tartalom).

- `N db` → `N × priceHuf`
- Egyéb mennyiség + ismert nettó (ugyanaz a dimenzió): `(felhasznált / nettó) × priceHuf`
- Nettó vagy ár üres → az adott hozzávaló ára **0**, hiányos jelzés ha az ár mező üres volt / nettó hiányzott a csomagaránynál

#### Duplikáció

Új / mentett recept **tiltott**, ha:

1. a **neve** megegyezik egy meglévő recept nevével (trim / case-szabály: implementációban egységes, ajánlott: trim + case-insensitive), **vagy**
2. a hozzávaló-halmaz megegyezik: ugyanazok az `foodId` + `amount` + `unit` párok, **sorrendtől függetlenül** (üres hozzávalós receptek: csak a név dönt; két üres-hozzávalós különböző nevű OK).

Backend-offline: helyi ellenőrzés is.

#### CRUD / törlés

- Lista, részletek, létrehozás, szerkesztés, hard delete — mind offline-képes.
- Törléskor ha vannak hivatkozó [[Étkezés]] / [[Recept forrású étkezés]] rekordok: megerősítő dialógus **felsorolja** őket, majd **cascade** törlés (mint [[Élelmiszerek]]).

#### Kapcsolat étkezéssel

[[Recept forrású étkezés]]: a recept hozzávalói alapján készletlevonás ([[Élelmiszer tárolás]]); az elfogyasztott **hányad** (pl. fél recept) az étkezés spechében van, nem itt.

### UI/UX elvárások

- Kaja tab: recept lista + [[Szöveges keresés]].
- Részletek: név, megjegyzés, hozzávalók (db-nél zárójeles nettó), összegzett ár / kcal / fehérje / szénhidrát / zsír; hiányos adat jelzés.
- Szerkesztő: név, megjegyzés, hozzávaló lista (törlés, reorder, mennyiség); multi-select élelmiszer felvevő.
- Mentés: fix alsó footer; iOS input min. `16px`.

### Megjegyzések

Későbbi külön „elkészítési lépések / idő” admin: a megjegyzésből választható le; most nem scope.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Recept lista / részletek / szerkesztő; quantity parser; multi-select food picker; platformos reorder ([[Pakolás]] mintára).
- Összegzés pure utility (ár + tápanyagok) a katalógus snapshotja alapján; hiányos flag.

#### Backend-offline

- Lista, részletek, create / update / hard delete: helyi store + outbox; kliens UUID.
- Duplikáció-ellenőrzés és tápanyag / ár összegzés a helyi katalógus snapshotján (Backend-offline és Full-offline).
- Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

| Entitás | Fő mezők |
|---|---|
| `Recipe` | `id` (UUID, kliens); `name` (unique, case-insensitive trim); `note`; `createdAt`, `updatedAt` |
| `RecipeIngredient` | `id`; `recipeId`; `foodId`; `quantityAmount`; `quantityUnit`; `sortOrder` |

- Unique: `name`; alkalmazás-szintű / query ellenőrzés a hozzávaló-halmaz duplikációra.
- CRUD + hard delete cascade az étkezés-hivatkozásokra (vagy az Étkezés spechel egyeztetett cascade).
- Összegzett tápanyag / ár: **számított** (kliens és/vagy read-model); nem kötelező denormalizált oszlop — ha cache kell, később.

### Nyitott kérdések

Nincs nyitott kérdés.

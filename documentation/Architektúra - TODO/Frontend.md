# Frontend

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Backend]], [[Backend-offline first]], [[Szinkronizációs központ]], [[Nyelv választás]], [[Dark&Light mode]], [[Mennyiség mező]], [[Szöveges keresés]], [[Névegyediség]], [[Bejelentkezés]] |

### Célállapot

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet: a tartalom az `## Architektúra` alatt van. A navigációs tabok product-döntések, de itt rögzítjük őket.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

#### Stack

- **Framework:** Ionic + Angular (hibrid: web + mobil)
- **API kliens:** OpenAPI (Swagger) specifikációból generált TypeScript / Angular kód (modellek + service-ek) — ugyanaz a szerződés, mint a [[Backend]] Spring Boot interface-einél
- **i18n:** ngx-translate — [[Nyelv választás]] (`hu.json`, `en.json`)
- **Téma:** [[Dark&Light mode]]

#### OpenAPI / kódgenerálás

- A backend felé menő HTTP hívások és DTO-k **nem** kézzel íródnak: az OpenAPI spec-ből generálódnak.
- A generált fájlok ne legyenek kézzel szerkesztve; változás → OpenAPI frissítés → újragenerálás.

#### Navigáció (alsó tab bar)

Alul **4 gomb** (Ionic tabs):

1. **Kaja** — [[Kaja]] (és kapcsolódó: kalória, stb.)
2. **Edzés** — [[Edzés]] (és kapcsolódó: [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]], stb.)
3. **Feladatok** — [[Tennivalók]] (és kapcsolódó: [[Naptár]], [[Események]], [[Élet tervek]])
4. **Menü** — a többi feature / beállítás belépője ([[Bevásárlás]], [[Profile]], [[Lépésszám követés]], [[Értesítések]], [[Pénzügyek]], [[GearCheck]], [[AYCM tracker]], [[Nyelv választás]], [[Dark&Light mode]], [[Szinkronizációs központ]], stb.) + **Kijelentkezés** ([[Bejelentkezés]]).

A tab lista **konfigurációból** (pl. tömb / feature-flagelt tab registry) jöjjön, ne legyen beégetve a template-be: a jövőben könnyen bővíthető legyen **5 gombosra** tab hozzáadásával / átrendezésével, layout-újraírással.

#### Kötelező elvek

- Minden feature **feature flag**-hez kötve (lásd [[Life Management 2.0]]).
- Platformfüggő input kontrollok (web vs mobil kényelem).
- Egyértelmű fókuszmező: ha a user egyértelműen gépelni fog, az input legyen auto-focus.
- Közös mennyiség input: [[Mennyiség mező]].
- Közös szöveges keresés viselkedés: [[Szöveges keresés]].
- Közös névegyediség / duplikáció-összehasonlítás: [[Névegyediség]] (figyelem: **más** normalizálás, mint a keresésé — az egyediségnél az ékezet **különbözik**).

#### Backend-offline

SSOT: [[Backend-offline first]]. Az itteni pontok csak a frontend architektúrába illesztést rögzítik.

- **Platform-hatókör:** az offline működés (SQLite + outbox + pull) **natív** platformon van; a **web build online-only**. Képesség-flag: `offlineCapable` — a feature kód erre ágazik, nem platform-stringre.
- **Lokális tárolás:** SQLite a `@capacitor-community/sqlite` pluginnal, userenként külön DB fájl; a UI **kizárólag** a helyi store-ból olvas. Séma-migráció a plugin beépített, verziózott upgrade-mechanizmusával; nincs ORM az első körben (a típusok a repository rétegben élnek). Részletek: [[Backend-offline first]].
- **Rétegzés (döntés):** a mutációk **repository rétegen** mennek (`<Entity>Repository`), ami egy helyi tranzakcióban ír a store-ba és az outboxba — **nem** HTTP interceptoron, mert local-first írás esetén a user-akció pillanatában nincs HTTP hívás. A generált OpenAPI klienst a `SyncEngine` használja (drain visszajátszás + `GET /api/sync/changes` pull).
- **Külső API-k** (pl. Open Food Facts, Health Connect) **közvetlenül a kliensről** hívódnak, nem a [[Backend]] proxyján át — [[Backend-offline first]].
- Kritikus számítási konstansok (pl. MET értékek) pure TypeScript utility-ként a frontenden is; így offline is teljes értékű a számítás (lásd [[Backend-offline first]], [[Tápérték kalkulátor]]).
- **`~` / homokóra** kizárólag „nem számolható, mert hiányzik bemenet” jelentésben; a hálózati állapotot a globális offline indikátor és a [[Szinkronizációs központ]] jelzi — [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (szerveroldali szerződés: [[Backend]])

### Nyitott kérdések

- State management megoldás (Signals / NgRx / egyéb)
- Capacitor plugin lista (barcode, health sync, local notifications, network, stb.) — az SQLite plugin **eldöntve**: [[Backend-offline first]]
- openapi-generator Angular generator verzió / output mappa konvenció
- Tab → feature hozzárendelés részletei (mi pontosan melyik tab alá kerül vs csak a Menüből érhető el)

Generált kliens illesztése az offline réteghez: lezárva (repository réteg, nem interceptor) — [[Backend-offline first]].

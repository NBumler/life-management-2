# Élelmiszer importálása clipboard-ról

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Élelmiszer hozzáadása]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer manuális bevitele]], [[Mennyiség mező]], [[Backend-offline first]] |

### Célállapot

Több [[Élelmiszerek]] tétel egyszerre történő felvétele táblázatból (pl. Excel / Sheets) **tab-szeparált (TSV)** szöveg beillesztésével egy nagy textboxba — előnézet (új / duplikátum / invalid), majd import.

### Funkcionális leírás

#### Felület

1. Nagy **textbox**: a felhasználó beilleszti a TSV szöveget (fejléccel vagy anélkül).
2. A komponens **felismeri / parse-olja** a sorokat (élőben vagy explicit „Elemzés” — ajánlott: a textbox változására).
3. Összesítő: hány **új** (importálható), hány **duplikátum**, hány **invalid**.
4. Mindhárom kategória **lenyitható szekcióban** megtekinthető (tételek listája / hiba oka).
5. **Import** gomb: csak az **új**, érvényes tételeket adja hozzá a katalógushoz. Duplikátumok és invalid sorok kimaradnak.

Backend-offline állapotban is működik (helyi katalógus + outbox), ugyanazzal a duplikáció-szabállyal, mint [[Élelmiszerek]].

#### Formátum

- Sorok: `\n` (és `\r\n`) szerint.
- Oszlopok: **tab** (`\t`) szerint.
- Üres sorok: kihagyva.
- Tizedes: **`.` és `,`** is elfogadott számoknál.
- Szöveges üres jelölő: `-` → üres mező (mintha nem lenne kitöltve). Valódi üres cella szintén üres.
- **Vonalkód** és **felbontás utáni** romlási idő: ebben a formátumban **nincs** oszlop → importált tételen üresen maradnak (később szerkeszthetők).

#### Oszlopok (rögzített sorrend, 22 db)

| # | Fejléc (kanonikus) | Célmező |
|---|---|---|
| 1 | Üzlet | üzlet |
| 2 | Termék | termék (név) — egyetlen kötelező mező |
| 3 | Márka | márka |
| 4 | Egyéb | egyéb |
| 5 | Ár (Ft / csomag) | ár (`priceHuf`) |
| 6 | 1 csomag nettó tartalma | nettó ([[Mennyiség mező]] `quantity` string, pl. `500g`, `1l`) |
| 7–19 | 100g / 100ml — tápanyagok | ugyanaz a sorrend, mint [[Élelmiszer manuális bevitele]] (energia → … → klorid) |
| 20 | Romlási idő - szabadon (nap) | kamra / szobahő; **csak nap**: `amount` + `unit = nap` |
| 21 | Romlási idő - hűtőben (nap) | hűtő; csak nap |
| 22 | Romlási idő - fagyasztva (nap) | fagyasztó; csak nap |

A fejlécben előforduló elírások / aliasok fejlécdetektáláskor elfogadottak, pl. `telítettlen` → telítetlen; `fagasztva` → fagyasztva; `szabadon` ≈ kamra / szobahőmérséklet.

#### Fejléc

A fejléc sor **opcionális**.

- Ha a beillesztett szöveg **tartalmazza** a fejlécet → a parser **felismeri és eldobja** (nem importál adatként).
- Felismerés: az első nemüres sor fejlécnek számít, ha a 2. oszlop (vagy a sor) egyezik a várt fejlécmintával (pl. első cella `Üzlet` **és** második `Termék`, vagy a sor tartalmazza a `100g / 100ml - energia` mintát).
- Fejléc nélkül: minden adatso közvetlenül a 22 oszlopos sémára mapelődik pozíció szerint.

#### Só → nátrium / klorid

Ha a só ki van töltve, és a nátrium / klorid a sorban **üres** → ugyanaz az auto-kalkuláció, mint [[Élelmiszer manuális bevitele]] (`nátrium = só / 2.5`, `klorid = só − nátrium`). Ha a TSV-ben ki vannak töltve → a beillesztett értékek maradnak.

#### Kategóriák

| Kategória | Szabály |
|---|---|
| **Új (importálható)** | Érvényes sor, és **nem** duplikátuma egy már létező (vagy ugyanebben a batchben már elfogadott) élelmiszernek. |
| **Duplikátum** | Minden mező megegyezik egy meglévő katalóguselemmel (szabály: [[Élelmiszerek]]), vagy a batchen belüli korábbi érvényes sorral. |
| **Invalid** | Pl. hiányzó **Termék**; nettó tartalom nem parse-olható ([[Mennyiség mező]]); számmező nem értelmezhető szám; oszlopszám eltérés (túl kevés / egyértelműen törött sor). A lenyitható szekcióban **ok** megjelenik. |

Az Import gomb csak az **Új** kategóriát menti. Sikeres import után: toast / visszajelzés a létrehozott darabszámmal; a textbox és az előnézet állapota frissíthető (üresre vagy az importáltak kikerülésével — ajánlott: textbox törlése + számlálók nullázása, lista frissül).

### UI/UX elvárások

- Dedikált import képernyő (nem az egyedi [[Élelmiszer manuális bevitele]] űrlap).
- Nagy textbox (többsoros); iOS: min. `16px` betűméret.
- Három lenyitható szekció fejlécben darabszámmal: Új / Duplikátum / Invalid.
- Import gomb: disabled, ha `új == 0`.
- Thumb-zone: Import a fix alsó footerben.

### Megjegyzések

A példaadat forrása táblázat export; a romlási oszlopok **napban** értendők (nem szabad `14hét` string). A manuális űrlapon továbbra is teljes `duration` [[Mennyiség mező]] van.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Parser utility: TSV split → sor DTO; fejléc detektálás; validáció; duplikáció-ellenőrzés a helyi katalógus + batch ellen.
- UI: textbox + collapsible preview + Import.
- Nettó: meglévő quantity parser; romlás: szám → `{ amount, unit: 'nap' }`.

#### Backend-offline

- Mentés: sorozatos vagy batch create az [[Élelmiszerek]] API / helyi store felé; outbox ([[Backend-offline first]]).

### Backend

_Nincs külön import végpont kötelező._ Ugyanaz a create, mint manuális / [[Élelmiszerek]] CRUD (opcionális későbbi `POST /foods:batch` optimalizálás).

### Nyitott kérdések

Nincs nyitott kérdés.

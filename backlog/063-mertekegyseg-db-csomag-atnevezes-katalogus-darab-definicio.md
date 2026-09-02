---
id: 063
type: feature                 # feature | change-request | bug
status: in-progress           # backlog | deferred | ready | in-progress | blocked | done | dropped
title: Mértékegység — »darab« → »csomag« átnevezés + katalógus darab-definíció (törtekkel)
specs:
  - "[[Mennyiség mező]]"
  - "[[Névegyediség]]"
  - "[[Élelmiszerek]]"
  - "[[Élelmiszer manuális bevitele]]"
  - "[[Élelmiszer tárolás]]"
  - "[[Recept]]"
  - "[[Étkezés]]"
  - "[[Élelmiszer forrású étkezés]]"
  - "[[Bevásárlólista írás]]"
  - "[[Bevásárlás teljesítve]]"
  - "[[Kaja statisztika]]"
  - "[[Élelmiszer importálása clipboard-ról]]"
flag:
created: 2026-09-02
closed:
---

# 063 — Mértékegység: »darab« → »csomag« átnevezés + katalógus darab-definíció (törtekkel)

## Motiváció / probléma

A katalógus fogalmilag **csomagokat** tárol — az ár `Ft / csomag`, a mennyiség „1 **csomag**
nettó tartalma" ([[Élelmiszerek]], [[Élelmiszer manuális bevitele]]) —, de a mennyiség-egység
ugyanezt a fogalmat `db`-nek („darab") hívja. Ez félrevezető: a `2db` liszt valójában „2 csomag
liszt", nem „2 szem".

Emiatt nagy kiszerelésű termékeknél nincs jó bevitel. Példa: veszek egy nagy csomag túró rudit,
abban **6 darab** rúd van. Ma ezt csak úgy tudom étkezésbe / receptbe vinni, hogy fejben elosztom
(`0.1666… csomag`), vagy grammra váltok, ha egyáltalán tudom a szemenkénti tömeget.

Két lépésben oldjuk meg:

1. **Átnevezés:** a `db` mennyiség-egység → `csomag` (`cs`) **mindenütt** (spec, paritás-fixture,
   backend + frontend kód, OpenAPI, i18n, meglévő adat).
2. **Felszabadított `darab` mint katalógus-definíció:** a `Food`-on opcionálisan megadható, hogy
   **1 darab mekkora** — vagy SI mennyiséggel (`1 db = 30 g`), vagy a csomag hányadaként
   (`0.25 cs`, és **tört alakban is**: `1/6 csomag`). Kitöltetlen darab-definíció → `1 darab =
   1 csomag`. A `darab` (`db`) így visszatér mennyiség-egységként, de **kontextuális**: mindig egy
   konkrét `Food`-hoz kötve értelmezhető (ahogy ma a `cs` a nettó tartalomhoz), és a
   darab-definíción keresztül old fel csomagra → g/ml-re → árra.

## Jelenlegi működés

- **Egységkészlet** ([[Mennyiség mező]] „Támogatott egységek — `quantity`"): `db, g, dkg, kg, l,
  dl, cl, ml`. A `db` a „darab" család egyetlen tagja, **nincs** átváltás más családba. Kanonikus
  bázisegység: `db` (`shared/fixtures/quantity-conversion.json` → `piece.baseUnit: "db"`).
- **Parser** (`frontend/src/app/shared/quantity.ts` `INPUT_PATTERN`): csak `szám([.,]szám)? +
  egység` alakot fogad. Tört (`N/M`) nincs.
- **Paritás-hármas:** `quantity-conversion.json` ↔ `hu.bumler.lm2.common.QuantityConverter`
  (`PIECE_MULTIPLIERS = {"db": 1}`) ↔ `quantity.ts` (`QUANTITY_PIECE_MULTIPLIERS`); a `Food`
  mezőhalmaz-duplikáció ([[Névegyediség]]) ezen a kanonikus konverzión hasonlít `amount + unit`
  párokat. `QuantityConverterTest` / `quantity.spec.ts` a fixture-höz méri magát.
- **`db` szemantika a kódban:**
  - `recipe-summary.ts` `baseAmountOf`: `unit === 'db'` → `amount × Food.netAmount` (a nettó
    tartalom kanonikus g/ml-je); `netUnit == null || netUnit === 'db'` → `baseAmount = 0` + hiányos.
  - `recipe-summary.ts` `priceContribution`: `N db` → `N × priceHuf`; egyéb egység → csomagarány.
  - `recipe-summary.ts` `formatIngredientQuantity`: `2db (1000g)` ha ismert a nettó, különben `2db`.
  - `stock-consumption.ts`: a kereslet `foodId`-nként kanonikus bázisegységben (`g/ml/db`).
  - [[Bevásárlás teljesítve]] / [[Élelmiszer tárolás]] „Darabolás": lista-tétel `db` + `amount = N`
    → **N külön** `StoredFood` sor (egyenként a katalógus 1 csomag nettó tartalmával, vagy `1 db`);
    egyéb egység → egy sor.
  - [[Étkezés]] tétel-szerkesztő FOOD `unitChips`: `g`/`dkg`/`db`/`ml`.
- **OpenAPI:** `Food.netUnit`, `MealItem.quantityUnit`, `ShoppingListItem.quantityUnit`,
  `StoredFood.quantityUnit` — szabad szöveg, leírásban `db, g, dkg, kg, l, dl, cl, ml`.
- **`Food`-on nincs** a csomagtól elkülönített darab-fogalom.

## Elfogadási kritériumok

### A. `db` → `cs` (csomag) átnevezés

- [ ] [[Mennyiség mező]] `quantity` egységkészlet: `cs, g, dkg, kg, l, dl, cl, ml`; a darab-család
      kanonikus bázisegysége `cs`. A `darab` család neve a specben `csomag`.
- [ ] Opcionális alias-map a parserben (a `duration` mintájára): `csomag` → `cs`. (Új: a
      `quantity` egységeknek eddig nem volt aliasa.)
- [ ] `shared/fixtures/quantity-conversion.json`: `piece` → `baseUnit: "cs"`, `multipliers:
      {"cs": 1}`. `QuantityConverter.java` `PIECE_MULTIPLIERS` és `quantity.ts`
      `QUANTITY_PIECE_MULTIPLIERS` ugyanígy; `QuantityConverterTest` + `quantity.spec.ts` zöld.
- [ ] OpenAPI séma-leírások (`Food`, `MealItem`, `ShoppingListItem`, `StoredFood` unit mezők) `cs`-t
      sorolnak; `npm run gen:api` újrafuttatva, generált modellek frissülve.
- [ ] Kódbeli `'db'` literálok → `'cs'`: `recipe-summary.ts`, `stock-consumption.ts`,
      `meal-item-summary.ts`, `meal-item-editor.component.ts` (`unitChips`), `shopping-list-complete.ts`,
      `catalog-ratios.ts`, `food.repository` / `recipe.repository` és a hozzájuk tartozó `.spec.ts`-ek,
      `outbox-entity-registry`, `local-database.service.ts`.
- [ ] i18n (`hu.json` / `en.json`): egység-címkék, `unitChips` feliratok, helper / placeholder
      szövegek és példák (`3db` → `3cs`, `120dkg` marad).
- [ ] Érintett specek átírva `db` → `csomag`/`cs`: [[Mennyiség mező]], [[Élelmiszerek]],
      [[Élelmiszer manuális bevitele]], [[Élelmiszer tárolás]], [[Recept]], [[Étkezés]],
      [[Élelmiszer forrású étkezés]], [[Bevásárlólista írás]], [[Bevásárlás teljesítve]],
      [[Kaja statisztika]], [[Névegyediség]], [[Élelmiszer importálása clipboard-ról]].

### B. Katalógus darab-definíció (`Food`)

- [ ] `Food` új opcionális mezőpár: `pieceAmount` (`number`, tört is) + `pieceUnit`
      (`g|dkg|kg|ml|cl|dl|l|cs` — a `db` **tiltott**, körkörös lenne). Jelentés: „1 darab =
      `pieceAmount` `pieceUnit`".
- [ ] Mindkettő `null` → `1 darab = 1 csomag` (alapértelmezett).
- [ ] Csak az egyik kitöltve → validációs hiba (kliens előre + szerver): vagy mindkettő, vagy egyik
      sem. Stabil `code` a hibaosztályhoz.
- [ ] [[Élelmiszer manuális bevitele]] űrlap: új **„1 darab"** mező a „1 csomag nettó tartalma"
      alatt — [[Mennyiség mező]] `quantity` módban, `unitChips`: `cs` + a gyakori SI egységek
      (`g`/`dkg`/`ml`). Törtes bevitel támogatott (lásd D).
- [ ] [[Névegyediség]] mezőhalmaz-duplikáció: `pieceAmount + pieceUnit` bekerül a kanonikus
      összehasonlításba (`0.25 cs` = `1/4 csomag`); fixture-sor hozzáadva, kliens–szerver paritás.
- [ ] `Food.netUnit === 'db'` (átnevezés után `'cs'`) sorok jelentése változatlan: „a csomagnak
      nincs megadott SI tartalma" — egybevág a `baseAmountOf` jelenlegi `netUnit === 'db' → 0 +
      hiányos" ágával.

### C. `darab` (`db`) mint kontextuális mennyiség-egység

- [ ] `db` visszakerül a `quantity` egységkészletbe, alias `darab` → `db`. **Kontextuális**: csak
      egy konkrét `Food`-hoz kötve oldható fel (mint ma a `cs` a nettó tartalomhoz).
- [ ] Közös feloldó utility (frontend: pl. `frontend/src/app/pages/food/food-quantity.ts`; backend
      párja a `food` feature-ben): `N db` --(darab-definíció)--> `cs` --(nettó / ár)--> `g|ml` /
      `Ft`. Darab-definíció nélkül `N db = N cs`. A `recipe-summary.ts`, `stock-consumption.ts`,
      `shopping-list-complete.ts`, meal-item kalkuláció mind ezt hívja (nincs szórt `unit === 'db'`
      ág többé).
- [ ] `db` egység elérhető és `unitChips`-ben megjelenik ott, ahol a sor egy `Food`-hoz kötött
      **és a mennyiség fogyasztás- / összetétel-jellegű**: recept-hozzávaló, [[Élelmiszer forrású
      étkezés]] tétel, [[Élelmiszer tárolás]] manuális felvétel. **Nem** a [[Bevásárlólista írás]]
      élelmiszer-tételnél — lásd a „Bevásárlólista + `db`" szakaszt.
- [ ] Megjelenítés (`formatIngredientQuantity` és társai): `3db (18dkg)` ha SI darab-definíció van;
      `3db (0.5cs)` ha csomag-hányad a definíció; `3db` ha nincs definíció (= `3cs`).
- [ ] [[Bevásárlás teljesítve]] „Darabolás" kiterjesztve: `cs` + `amount = N` (egész) → **N külön**
      `StoredFood` sor (egyenként 1 csomag nettóval — a mai `db`-szabály `cs`-re csúszik). `cs` +
      tört `amount` → **egy** sor a tört mennyiséggel. `db` a listán: lásd a „Bevásárlólista + `db`"
      szakaszt.
- [ ] `ShoppingListItem` élelmiszer-mennyiség `unitChips` / egységkészlet: `cs` + súly/térfogat,
      **`db` nélkül**. Ha egy legacy sor mégis `db` egységű, a teljesítés `cs`-re oldja fel a
      darab-definíción át, egész csomagra **felfelé** kerekítve, majd az egész-`cs` ág szerint
      darabol.

### D. Tört bevitel a Mennyiség mezőben

- [ ] A parser elfogad `N/M` alakot a szám pozícióban: `1/6 csomag`, `1/6cs`, `1/6 cs`. `M = 0` →
      hiba. Negatív / vegyes tört (`1 1/2`) **nem** támogatott (elfogadott korlát).
- [ ] Belső kanonikus érték decimális, rögzített **4 tizedes** kerekítéssel. Fixture-sorok a
      `quantity-conversion.json`-ban a tört-esetekre (`1/6` → `0.1667`, `1/3` → `0.3333`).
- [ ] Kanonikus egyenlőség-összehasonlítás ([[Névegyediség]], `quantitiesEqual` /
      `QuantityConverter`): a mai egész-alapú pontos egyezés helyett skálázott egész (`×10^4`),
      hogy a float-hiba ne adjon hamis „nem egyenlő"-t (`6 × 0.1667 cs` = `1.0002 cs` — a 4 tizedes
      kanonikus értékek skálázott egészként pontosan egyeznek, ha a bevitt tört ugyanaz).
- [ ] Formázás (`formatQuantityValue`): a tárolt decimális visszaírása. A tört alak visszaállítása
      **nem** cél (`0.166667cs`, nem `1/6cs`) — elfogadott korlát, `#### Tudatos korlát` a
      [[Mennyiség mező]] specben.

### E. Adatmigráció

- [ ] Flyway `V<n>__unit_db_to_cs_and_food_piece.sql`:
      `UPDATE`-ek `food.net_unit`, `recipe_ingredient.quantity_unit`, `meal_item.quantity_unit`,
      `stored_food.quantity_unit`, `shopping_list_item.quantity_unit`: `'db'` → `'cs'`; új oszlopok
      `food.piece_amount numeric null`, `food.piece_unit text null`.
- [ ] **`updated_at` trigger: hagyjuk tüzelni** a rename `UPDATE`-eken (ne `DISABLE TRIGGER`).
      Indoklás: lásd az „`updated_at` a tömeges rename-en" szakaszt. A `piece_*` oszlopok `NULL`-ként
      jönnek létre → az egyetlen `updated_at`-churn a ténylegesen `db → cs` sorokból van.
- [ ] Lokális SQLite: új `SCHEMA_Vn_STATEMENTS` blokk (`local-database.service.ts`) ugyanezekkel az
      `UPDATE`-ekkel + `ALTER TABLE food ADD COLUMN piece_amount` / `piece_unit`. Múltbeli
      `SCHEMA_Vn` blokk **nem** szerkesztve.
- [ ] Outbox payload-migráció (`OutboxMigrator`): a `PENDING` payloadokban `unit: 'db'` /
      `netUnit: 'db'` → `'cs'`. `OutboxMigrator` verzió-lépés + teszt.

### F. Tesztek

- [ ] `quantity-conversion.json` bővítve: `cs` bázis + tört-eset sorok; `QuantityConverterTest` +
      `quantity.spec.ts` zöld.
- [ ] Új darab-feloldó utility unit-tesztek mindkét oldalon: SI definíció, `cs`-tört definíció,
      nincs definíció (`1 db = 1 cs`).
- [ ] `recipe-summary.spec.ts`, `stock-consumption` teszt, `shopping-list-complete.spec.ts`,
      `catalog-ratios.spec.ts` frissítve `cs`-re + új `db` (kontextuális) esetek.
- [ ] Backend `FoodServiceTest` duplikáció: `pieceAmount` / `pieceUnit` beszámít; `RecipeServiceTest`
      / `ShoppingListCompleteServiceTest` a `cs` átnevezésre.
- [ ] `npm run lint` + `npm run test:ci` + `./gradlew test` zöld; `npm run build` zöld.

## Terv / döntési napló

1. **`darab` kontextuális, nem abszolút egység.** Egy „darab" jelentése termékenként más (30 g vs
   fél csomag), ezért `db` amount önmagában — `Food` nélkül — nem kanonikalizálható. Következmény:
   a **recept hozzávaló-halmaz** duplikáció-ellenőrzése ([[Recept]]) `db`-t továbbra is **exact
   `amount + unit` párként** kezeli (nem vált át `cs`/g-re); `2db` ≠ `2cs` ott akkor is, ha a
   darab-definíció szerint egyenlők lennének. Ez összhangban van a jelenlegi „szó szerinti
   kétszer-bevitel elkerülése" céllal.

2. **Egy `pieceAmount + pieceUnit` mezőpár** (a unit lehet `cs`), **nem** külön egész
   `piecesPerPackage`. Indok: a mezőpár lefedi az abszolút SI-t (`1 db = 30 g`) **és** a törtes
   csomag-hányadot (`1/6 cs`) is egy modellel. Egy egész `piecesPerPackage` nem tudná kezelni azt,
   hogy „1 db = 30 g, de a csomag 500 g" (nem osztható), és a nem-egész darabszámot sem.

3. **Tört tárolása: decimális, 4 tizedes kerekítéssel** — nem racionális (num/den) oszloppár.
   Egyszerűbb, illeszkedik a „no CRDT, egyszerű" ethoszhoz ([[Backend-offline first]] §9). Ár:
   `6 × 0.1667 cs = 1.0002 cs`, nem pontosan `1 cs` — a kerekítés apró csúszást visz. Ezt elnyeli
   (a) a kanonikus egyenlőség skálázott egész (`×10^4`) összehasonlítása (D): két érték akkor
   egyenlő, ha a bevitt tört (`1/6`) ugyanaz, nem ha 6 db 1/6 véletlenül kiad 1-et; (b) a
   készletlevonás `≤ 0 → törlés` vágása ([[Élelmiszer tárolás]]). `#### Tudatos korlát` a
   [[Mennyiség mező]] specbe.

4. **`db` a bevásárlólistán és a teljesítés „darabolásában"** — döntés: lásd a lenti
   „Bevásárlólista + `db`" szakaszt. Röviden: `db` **nem** választható egység a
   `ShoppingListItem` élelmiszer-mennyiségnél (a bevásárlás csomag-szintű); a `cs` darabolása a
   mai `db`-szabályt viszi tovább; legacy `db` sor a teljesítéskor `cs`-re old fel, egész csomagra
   felfelé kerekítve.

5. **Nincs feature flag.** Enum + séma + paritás-fixture + adatmigráció — all-or-nothing, nem
   kapcsolható félállapot. A `pieceUnit === 'db'` tiltása validációval, nem flaggel.

6. **`netUnit === 'db'` → `'cs'` migrálva.** Jelentése ezután „a csomagnak nincs megadott SI
   tartalma", ami pontosan a kód mai `netUnit === 'db' → nincs használható nettó` ága — nincs
   viselkedésváltozás, csak a címke lesz konzisztens.

7. **Sorrend a megvalósításban:** A (rename, mechanikus, nagy felület, önmagában zöldre vihető) →
   E (migráció) → D (tört-parser) → B (darab-definíció mező) → C (kontextuális `db` feloldás). Az
   A + E külön commit lehet (spec-rewrite + kód), utána a B–D funkcionális szeletek.

### Bevásárlólista + `db`

**Döntés (elfogadva):** a `db` **nem** választható a bevásárlólista élelmiszer-tételénél; legacy /
más eszközről jövő `db` sor a teljesítéskor `cs`-re old fel, egész csomagra felfelé kerekítve. Az
indoklás és a mérlegelt alternatívák alább.

**Miért volt kérdés:** a felszabaduló `darab` (`db`) egység legyen-e választható a bevásárlólista
élelmiszer-tételénél, és ha egy tétel mégis `db` egységű, a [[Bevásárlás teljesítve]] „darabolás"
mit hozzon létre a tárolásban?

**Miért kérdés.** Ma a szabály: lista-tétel `db` + `amount = N` → **N külön `StoredFood` sor**,
mert a `StoredFood` sor egy **fizikai csomagot** modellez (saját lejárat, felbontás-állapot) — két
hús külön romolhat. Az átnevezés után ez `cs` + `N` → N sor lesz, és a jelentés stimmel: N csomagot
hoztál haza. De az **új** `db` (darab) fogalmilag nem ehhez a granularitáshoz tartozik:

- Boltban **csomagot** veszel, nem szem-számra. A katalógus ára is `Ft / csomag` — per-darab ár
  nincs, tehát egy `db` listatétel önmagában **nem is árazható** a `cs`-re váltás nélkül.
- Ha a termék csak 6-os kiszerelésben létezik, akkor „3 db"-ot betárolni 3 sorként **hazudik** a
  hűtő tartalmáról: egy félig bontott 6-os csomagod van, nem 3 különálló egységed. A felbontás /
  lejárat modell csomag-szintű.

**Megfontolt opciók:**

| Opció | Teljesítéskor | Baj |
|---|---|---|
| 1. `db` + N → N „darab"-sor | 3 sor, egyenként `1 db` | fizikai csomag ≠ N szem; a felbontás-modell szétesik |
| 2. `db` → `cs`, **egész csomagra felfelé kerekít**, majd darabol | `3 db` (6-os) → `0.5 cs` → `1 cs` → 1 sor | a lista „3 db"-ot mondott, a tárolás „1 cs (6 db)" — meglepő, de fizikailag igaz |
| 3. `db` → `cs` **tört** mennyiségként, 1 sor, nincs darabolás | `3 db` → `0.5 cs` → 1 sor `0.5 cs` | „fél csomag túró rudi a hűtőben" — de valójában 1 fizikai csomag |
| 4. **`db` nem választható a `ShoppingListItem`-nél** | — | +1 kontextuális egység-korlát (kicsi, lokális szabály) |

**Elfogadva: 4. opció** (elsődleges) **+ 2. opció** (fallback legacy / edge adatra).

- A `ShoppingListItem` élelmiszer-mennyiség `unitChips` / egységkészlete: `cs` + súly/térfogat,
  **`db` nélkül**. A `db` ott marad elérhető, ahol tényleg dolgozik: recept-hozzávaló, étkezés-tétel,
  tárolás manuális felvétel, fogyasztás („megettem 2 túró rudit" → g/ml a darab-definíción át, sor
  nélkül).
- A `unitChips` már ma is kontextusonként más egységhalmazt ad — ez csak egy „itt nincs `db`"
  szabály, nem új fogalom.
- Ha egy **legacy** (vagy más eszközről szinkronizált, régi kliensről származó) sor mégis `db`:
  a teljesítés a darab-definíción keresztül `cs`-re old fel, **egész csomagra felfelé kerekít**
  (2. opció), majd az egész-`cs` ág szerint darabol. Így a régi adat sem törik.
- A `cs` teljesítés-darabolás egyébként a mai `db`-szabályt viszi tovább: `cs` + egész `N` → N sor;
  `cs` + tört `amount` (ha a user pl. `0.5 cs`-t vitt fel) → 1 sor a tört mennyiséggel.

### `updated_at` a tömeges rename-en

**Kérdés:** a Flyway migráció `UPDATE ... SET net_unit='cs' WHERE net_unit='db'` (5 táblán) hatására
a `BEFORE INSERT OR UPDATE` trigger minden érintett sor `updated_at`-jét migráció-időre állítja. A
`GET /api/sync/changes` delta-pull `updated_at` szerint rendez, tehát minden ilyen sor **újra
letöltődik** a kliensekre a frissítés utáni első pullnál.

**Döntés (elfogadva): hagyjuk tüzelni a triggert** (ne `ALTER TABLE ... DISABLE TRIGGER` a migráció
idejére).

- **Egyszeri, korlátos költség.** A frissítés utáni első delta-pull kövérebb: a `food` /
  `recipe_ingredient` shared katalógusnál akár a teljes katalógus. De egyszeri, lapozott, és
  tartalmilag **no-op merge**: a kliens a saját lokális SQLite-migrációjában (`SCHEMA_Vn`) már
  `cs`-re állította ugyanezeket a sorokat, a sor-szintű last-write-wins alatt ugyanaz a tartalom
  jön vissza → nincs konfliktus, nincs adatkockázat, csak bájt.
- **Megőrzi az invariánst**, hogy „a szerver állapota és a delta-stream egyezik", külön
  special-case nélkül — pontosan a [[Backend-offline first]] / [[Backend]] jegyzet szerint, ami a
  „bulk cascade update-ek is bumpolják az `updated_at`-et, ez load-bearing a delta-pullnak"
  szabályt rögzíti.
- **A trigger tiltása kockázatot cserél költségre.** Ha nem megy ki a delta-streamen, minden
  meglévő kliens kizárólag a **saját** lokális migrációjára támaszkodik. Ha az bármelyik platformon
  hibás / kimarad, az a kliens csendben divergens marad, amíg a sort más okból újra nem szerkesztik.
  A kövér pull viszont determinisztikusan helyrehozza.
- **A `piece_*` oszlopok `NULL`-ként jönnek létre** → az `ADD COLUMN` önmagában nem bumpolja az
  `updated_at`-et; a churn kizárólag a ténylegesen `db → cs` sorokra korlátozódik, ami az a
  részhalmaz, ami valóban változott.

**Ha a katalógus mérete miatt a kövér pull mégis gond:** a pull már lapozott (lassabb, nem törik);
opcionálisan a rename-t egy amúgy is elkerülhetetlen sémaváltás mellé időzítve a „nagy pull
frissítés után" egyszer történik meg. Alapértelmezésben viszont: hagyjuk tüzelni.

## Lezáráskor (on-done)

- Frissített specek: [[Mennyiség mező]] (egységkészlet `cs`, `darab` család, tört-bevitel,
  `#### Tudatos korlát` a kerekítésről) · [[Névegyediség]] (mezőhalmaz: `pieceAmount/pieceUnit`,
  skálázott-egész összehasonlítás) · [[Élelmiszerek]] + [[Élelmiszer manuális bevitele]] (új „1
  darab" mező, `Food` entitás oszlopok) · [[Élelmiszer tárolás]] + [[Bevásárlás teljesítve]]
  (darabolás `cs`/`db`) · [[Recept]] + [[Élelmiszer forrású étkezés]] + [[Kaja statisztika]] +
  [[Étkezés]] (`db` → `cs` megjelenítés/kalkuláció, kontextuális `db` feloldás) ·
  [[Bevásárlólista írás]] + [[Élelmiszer importálása clipboard-ról]] (egység-nevek).
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — `db` → `csomag` egység-átnevezés + katalógus
  darab-definíció törtekkel (#063)
- Kód: `frontend/src/app/shared/quantity*`, `frontend/src/app/pages/food/**`,
  `frontend/src/app/core/storage/**` + `core/sync/**` (migráció),
  `backend/.../common/QuantityConverter.java`, `backend/.../food/**`,
  `backend/src/main/resources/db/migration/V<n>__*.sql`, `backend/src/main/resources/openapi/**`,
  `shared/fixtures/quantity-conversion.json`, `frontend/src/assets/i18n/*.json`.

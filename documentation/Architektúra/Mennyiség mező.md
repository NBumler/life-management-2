---
verifikalva: 2026-09-03
verifikalt_commit: b9d7577
---

# Mennyiség mező

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Frontend]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Bevásárlólista írás]], [[Élelmiszerek]], [[Élelmiszer manuális bevitele]], [[Recept]], [[Élelmiszer tárolás]], [[Backend-offline first]] |

### Jelenlegi működés

Egységes beviteli UI komponens saját parserrel: a felhasználó egy szöveges mezőbe ír (összeragasztva vagy opcionális szóközzel), a komponens pedig külön **szám** + **egység** értéket ad ki. Ugyanez a komponens szolgál mennyiségre (`quantity`) és időtartamra (`duration`) — a fogyasztó feature átadja a módot.

### Funkcionális leírás

#### Mód (`mode`)

| Érték | Jelentés |
|---|---|
| `quantity` | Mennyiség (tömeg, térfogat, darab) — alapértelmezett |
| `duration` | Időtartam (romlási idő, stb.) |

A `mode` **input** a komponensnek; ettől függ a támogatott egységkészlet és a helper szöveg.

#### Input / megjelenítés

- Egy szöveges input; a felhasználó gépel (nincs külön szám és egység mező a UI-n).
- **Opcionális szóköz** a szám és az egység között: `100g` = `100 g` = `0.4 ml` = `0,4ml`.
- Tizedes elválasztó: **`.` és `,` is** elfogadott; a belső számérték kanonikus (pl. `1.5`).
- **Tört** a szám pozíciójában: `N/M` alak elfogadott (`1/6 csomag`, `1/6cs`, `1/6 cs`). `M = 0` →
  hiba. Vegyes tört (`1 1/2`) és negatív tört **nem** támogatott. A tört belső értéke decimális,
  **4 tizedesre kerekítve** (`1/6` → `0.1667`).
- Érvényes `quantity` példák: `120dkg`, `3cs`, `4db`, `1/6 csomag`, `2l`, `1.5kg`, `5cl`, `100 g`.
- Érvényes `duration` példák: `14nap`, `2 hét`, `3hó`, `1év`, `48óra`.

#### Parser kimenet

Két külön mező / érték:

| Mező | Jelentés |
|---|---|
| `amount` | Szám — decimális (`.` vagy `,`) **vagy** `N/M` tört, amit a parser azonnal decimálisra vált, 4 tizedesre kerekítve |
| `unit` | Egység enum (a `mode` szerinti készletből; aliasok — `csomag`→`cs`, `darab`→`db` — a kanonikus értékre normalizálva) |

A megjelenítés / újraszerkesztés az `amount` + `unit` összeragasztott formája. Formázáskor a szóköz **nem** kötelező (kanonikus kijelzés: szóköz nélkül, pl. `120dkg`, `14nap`) — beolvasáskor a szóköz opcionális. A **tört alak visszaállítása nem cél**: egy `1/6 csomag` bevitel újraszerkesztéskor `0.1667cs` alakban jelenik meg (lásd `#### Tudatos korlát`).

#### Támogatott egységek — `quantity`

`cs`, `db`, `g`, `dkg`, `kg`, `l`, `dl`, `cl`, `ml`

| Egység | Jelentés |
|---|---|
| `cs` | **csomag** — a katalógus alapegysége (ár `Ft / csomag`, „1 csomag nettó tartalma"). Alias: `csomag`. |
| `db` | **darab** — **kontextuális**: csak egy konkrét [[Élelmiszerek]] darab-definícióján (`pieceAmount` + `pieceUnit`) keresztül oldható fel csomagra → g/ml-re → árra, ahogy a `cs` a nettó tartalmon át. Darab-definíció nélkül `1 db = 1 csomag`. Alias: `darab`. A feloldó utility: `frontend/src/app/pages/food/food-quantity.ts` (`resolveFoodQuantity`). |

Más egység (`szelet`, `evőkanál`, stb.) **nincs**.

#### Kanonikus egység és konverzió (egyenlőség-összehasonlításhoz)

A [[Névegyediség]] mezőhalmaz-egyediség ellenőrzése (`Food` duplikáció) `amount` + `unit` párokat hasonlít össze **eltérő egységben is** (pl. `1l` = `100cl`) — ehhez minden egységcsalád egy **kanonikus bázisegységre** vált:

| Mód | Egységcsalád | Bázisegység | Szorzók a bázisra |
|---|---|---|---|
| `quantity` | tömeg | `g` | `dkg` × 10, `kg` × 1000 |
| `quantity` | térfogat | `ml` | `cl` × 10, `dl` × 100, `l` × 1000 |
| `quantity` | darab | `cs` | `cs` × 1, `db` × 1 |
| `duration` | idő | `perc` | `óra` × 60, `nap` × 1440, `hét` × 10080, `hó` × 43200 (30 nap), `év` × 525600 (365 nap) |

A darab-család bázisegysége `cs`; a `db` szorzója szintén `1`, mert **darab-definíció hiányában
`1 db = 1 cs`** — így egy `Food`-kontextus nélküli `db` érték is kanonikalizálható (csomagként).
Amikor van darab-definíció, a feloldás (`resolveFoodQuantity`) **a kanonikalizálás előtt** átváltja
a `db`-t (→ csomag / g / ml), tehát ez a tábla csak a kontextus nélküli összehasonlítás alapja.

**Skálázott-egész egyenlőség:** a kanonikus `amount` összehasonlítása **10^4-gyel skálázott egész**
összevetéssel történik (`EQUALITY_DECIMAL_SCALE = 4`, HALF_UP), nem lebegőpontos `===`-szel — így a
tört bevitel kerekítéséből (`6 × 0.1667 cs = 1.0002 cs`) származó float-zaj nem ad hamis „nem
egyenlő"-t. Két érték akkor egyenlő, ha a 4 tizedesre kerekített kanonikus alakjuk skálázott
egészként egyezik.

**Egységcsaládok közt nincs konverzió és nincs egyenlőség:** egy `3cs` és egy `3g` érték **soha nem** tekinthető egyenlőnek, még numerikusan egyező `amount` esetén sem — az összehasonlítás első lépése mindig a család (tömeg / térfogat / darab) egyezésének ellenőrzése, csak utána jön a bázisegységre váltott `amount` összevetése. `db` és `cs` **azonos családba** (`darab`) esik, tehát kontextus nélkül egyenértékűként hasonlíthatók.

**`hó` / `év` kizárólag egyenlőség-összehasonlításhoz** rögzített, fix napszámú közelítés (30, ill. 365 nap) — ez **nem** használható tényleges dátumszámításra (pl. lejárati dátum = rögzítés dátuma + `duration`). Dátumhoz a fogyasztó feature (pl. [[Élelmiszer tárolás]]) **naptári** hónap/év-hozzáadást használ (a használt DateTime modul `addMonths` / `addYears` jellegű függvénye), hogy a hónapok eltérő hossza ne okozzon csúszást; a fix percérték csak a Mennyiség mező komponens saját egyenlőség-logikájának belső részlete.

#### Támogatott egységek — `duration`

| Egység (kanonikus) | Elfogadott aliasok (példa) |
|---|---|
| `perc` | `p`, `min` |
| `óra` | `ora`, `h` |
| `nap` | `n`, `d` |
| `hét` | `het`, `w` |
| `hó` | `ho`, `honap`, `hónap`, `m` |
| `év` | `ev`, `y` |

Az egység felismerése kis/nagybetű-független. Aliasok a parserben a kanonikus értékre normalizálódnak.

#### Validáció

- Érvénytelen / nem felismerhető input: a komponens hibát jelez (nem küld részleges értéket a szülő formnak commitra).
- A `mode`-tól idegen egység (pl. `duration` módban `kg`) → hiba.
- Tört `N/M` **`M = 0` nevezővel** → hiba. Vegyes / negatív tört → nem illeszkedik a mintára → hiba.
- Üres input: érvényes „nincs érték” (`amount` / `unit` = `null`), ha a szülő mező opcionális.

#### Helper ikon

Az input végén (jelszó-mező „megjelenítés” gombjának mintájára) egy **helper** ikon gomb. Megnyomásra rövid magyarázat (tooltip / popover / dialógus — platformnak megfelelő):

- `quantity`: pl. „Írj számot és egységet, szóköz opcionális. Példa: `120dkg`, `3 cs`, `2l`, `5cl`.”
- `duration`: pl. „Írj számot és időegységet. Példa: `14nap`, `2 hét`, `3hó`.”

#### Gyors egység-választó (`unitChips`) — opcionális

A fogyasztó feature átadhat egy `unitChips` egységlistát; ekkor a mező alatt (a `HelpInputComponent`
`[chips]` slotján) egy chip-sor jelenik meg. Egy chipre koppintva a komponens a **már beírt számot
megtartja** (vagy `1`-et használ, ha nincs / értelmezhetetlen), és arra az egységre vált — ez csak
gyorsítás, a szabadszöveges bevitel változatlanul minden egységet elfogad. Üres `unitChips` (alap)
esetén nincs chip-sor. Az éppen kiválasztott egység chipje kiemelt (nem `outline`).

Jelenlegi használók: az étkezés tétel-szerkesztő FOOD mennyisége (`g`/`dkg`/`db`/`ml`), a
recept-hozzávaló mennyisége (`cs`/`db`/`g`/`dkg`/`ml`), és a katalógus „1 darab" mezője
(`cs`/`g`/`dkg`/`ml` — `db` szándékosan **nincs**, körkörös lenne). A [[Bevásárlólista írás]]
élelmiszer-tételénél nincs chip-sor, és `db` ott nem is választható (a bevásárlás csomag-szintű).

### UI/UX elvárások

- Egy input mező; platformnak megfelelő billentyűzet (ahol lehet, számozós / text).
- Ha a felületen egyértelmű, hogy ide fog gépelni a user: auto-focus ([[Life Management 2.0]] elv).
- Hibaállapot: rövid, érthető üzenet (pl. ismeretlen egység / hiányzó szám).
- Helper ikon mindig elérhető a mező végén.
- Ha a fogyasztó `unitChips`-et ad: gyors egység-választó chip-sor a mező alatt (fent).

### Megjegyzések

Közös frontend komponens — nem feature-specifikus. A fogyasztó feature-ök hivatkozzák ezt a specre, és átadják a `mode`-ot.

#### Tudatos korlát

A **tört bevitel decimálisan tárolódik**, 4 tizedesre kerekítve (`1/6` → `0.1667`), nem racionális
(számláló/nevező) párként. Következmények:

- A parser sosem állítja vissza a tört alakot: `1/6 csomag` újraszerkesztéskor `0.1667cs`.
- `6 × 0.1667 cs = 1.0002 cs`, nem pontosan `1 cs` — a kerekítés apró csúszást visz. Ezt elnyeli
  (a) a skálázott-egész egyenlőség (két érték akkor egyenlő, ha a bevitt tört ugyanaz, nem ha 6 db
  1/6 véletlenül kiad 1-et), és (b) a készletlevonás `≤ 0 → törlés` vágása ([[Élelmiszer tárolás]]).

Ez a „no CRDT, egyszerű" ethoszt követi ([[Backend-offline first]] §9) — elfogadott, nem hiba.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Megosztott Angular / Ionic komponens (`QuantityInputComponent`, `shared/quantity-input/`) + pure TypeScript parser utility (`shared/quantity.ts` — egységlista mode szerint + parse / format + tört `N/M` → 4 tizedes decimális) + kanonikus egységre váltó / skálázott-egész egyenlőség utility (fent, a [[Névegyediség]] egyenlőség-összehasonlításhoz).
- A **kontextuális `db` feloldás** külön utility: `pages/food/food-quantity.ts` (`resolveFoodQuantity` → `{ packages, baseAmount }`, `formatFoodQuantity`). Ezt hívja a recept-összegzés, az étkezés-tétel kalkuláció, a készletlevonás és a bevásárlás-teljesítés — nincs szórt `unit === 'db'` ág.
- A **helper ikon gomb + inline hiba-note** nem itt él, hanem a közös `HelpInputComponent`-ben (`shared/help-input/`, `app-help-input`): buta prezentációs héj — `ion-input` + záró badge + súgó gomb (`AlertController`, i18n kulccsal) + hiba-`ion-note`, `[value]` / `(valueChange)` be/ki. A `QuantityInputComponent` és a [[Nehézségi szint skálája]] `GradeInputComponent` egyaránt ezt komponálja, saját parserrel + `ControlValueAccessor`-ral — kompozíció, nem ősosztály.
- Public API:
  - `@Input() mode: 'quantity' | 'duration'` (default: `quantity`)
  - `amount: number | null`, `unit: QuantityUnit | DurationUnit | null` (vagy együttes value object)
  - `valueChange` / form control (`ControlValueAccessor`) ajánlott
- Egység enum / union típusok a támogatott listákkal; OpenAPI / backend DTO-k ugyanazt az egységkészletet használják, ahol mennyiség vagy időtartam utazik.
- A parser a frontenden él; a backend a már szétbontott `amount` + `unit` párost fogadja (ne a nyers stringet — kivéve ha később explicit másképp döntünk).

#### Backend-offline

Pure client komponens / utility; Backend-offline és Full-offline állapotban is ugyanúgy működik (helyi adat / form state). Nincs saját outbox. Lásd [[Backend-offline first]].

### Backend

A mennyiség / időtartam mezők a fogyasztó entitások DTO-iban jelennek meg; egység enum egyeztetés OpenAPI-ban.

**Kivétel — kanonikus konverzió paritás:** a `Food` mezőhalmaz-duplikáció ([[Névegyediség]]) **alkalmazás-szintű** ellenőrzése ([[Backend]]) a fenti bázisegység-táblát **és a skálázott-egész (`10^4`) egyenlőséget** a szerveren (`hu.bumler.lm2.common.QuantityConverter`) is futtatja, ugyanazokkal a szorzókkal / skálával, mint a kliens TS parser — így a kliensoldali előzetes ellenőrzés és a szerveroldali `409` döntés bitre ugyanazt az eredményt adja. Paritás-teszt fixture: `shared/fixtures/quantity-conversion.json` (`multipliers` + `equalityDecimalScale: 4` + `fractionExamples`), mindkét oldalon futtatva (`QuantityConverterTest` / `quantity.spec.ts`) — nem külön Java + TS konstans-lista.

A `db` **kontextuális feloldásának** nincs szerveroldali párja: a recept / étkezés tápanyag- és
árszámítás teljesen kliensoldali („client rolls forward" — [[Recept]], [[Étkezés]]), a szerver csak
tárolja az `amount` + `unit` párt. A `ShoppingListService` „darabolása" (`splitCountFor`) a `cs`
egész / tört és a legacy `db` → felfelé kerekítés szabályt a klienssel bitre azonosan futtatja.

### Nyitott kérdések

Nincs nyitott kérdés.

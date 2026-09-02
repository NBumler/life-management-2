---
verifikalva: 2026-09-02
verifikalt_commit: 4fe11e1
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
- Érvényes `quantity` példák: `120dkg`, `3db`, `2l`, `1.5kg`, `5cl`, `100 g`.
- Érvényes `duration` példák: `14nap`, `2 hét`, `3hó`, `1év`, `48óra`.

#### Parser kimenet

Két külön mező / érték:

| Mező | Jelentés |
|---|---|
| `amount` | Szám (tizedes megengedett, ahol az egység értelmes) |
| `unit` | Egység enum (a `mode` szerinti készletből) |

A megjelenítés / újraszerkesztés az `amount` + `unit` összeragasztott formája. Formázáskor a szóköz **nem** kötelező (kanonikus kijelzés: szóköz nélkül, pl. `120dkg`, `14nap`) — beolvasáskor a szóköz opcionális.

#### Támogatott egységek — `quantity`

`db`, `g`, `dkg`, `kg`, `l`, `dl`, `cl`, `ml`

Más egység (`csomag`, `szelet`, stb.) az első verzióban **nincs**.

#### Kanonikus egység és konverzió (egyenlőség-összehasonlításhoz)

A [[Névegyediség]] mezőhalmaz-egyediség ellenőrzése (`Food` duplikáció) `amount` + `unit` párokat hasonlít össze **eltérő egységben is** (pl. `1l` = `100cl`) — ehhez minden egységcsalád egy **kanonikus bázisegységre** vált, egész számként, kerekítési hiba nélkül:

| Mód | Egységcsalád | Bázisegység | Szorzók a bázisra |
|---|---|---|---|
| `quantity` | tömeg | `g` | `dkg` × 10, `kg` × 1000 |
| `quantity` | térfogat | `ml` | `cl` × 10, `dl` × 100, `l` × 1000 |
| `quantity` | darab | `db` | (nincs konverzió; csak `db` ↔ `db` hasonlítható) |
| `duration` | idő | `perc` | `óra` × 60, `nap` × 1440, `hét` × 10080, `hó` × 43200 (30 nap), `év` × 525600 (365 nap) |

**Egységcsaládok közt nincs konverzió és nincs egyenlőség:** egy `3db` és egy `3g` érték **soha nem** tekinthető egyenlőnek, még numerikusan egyező `amount` esetén sem — az összehasonlítás első lépése mindig a család (tömeg / térfogat / darab) egyezésének ellenőrzése, csak utána jön a bázisegységre váltott `amount` összevetése.

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
- Üres input: érvényes „nincs érték” (`amount` / `unit` = `null`), ha a szülő mező opcionális.

#### Helper ikon

Az input végén (jelszó-mező „megjelenítés” gombjának mintájára) egy **helper** ikon gomb. Megnyomásra rövid magyarázat (tooltip / popover / dialógus — platformnak megfelelő):

- `quantity`: pl. „Írj számot és egységet, szóköz opcionális. Példa: `120dkg`, `3 db`, `2l`, `5cl`.”
- `duration`: pl. „Írj számot és időegységet. Példa: `14nap`, `2 hét`, `3hó`.”

#### Gyors egység-választó (`unitChips`) — opcionális

A fogyasztó feature átadhat egy `unitChips` egységlistát; ekkor a mező alatt (a `HelpInputComponent`
`[chips]` slotján) egy chip-sor jelenik meg. Egy chipre koppintva a komponens a **már beírt számot
megtartja** (vagy `1`-et használ, ha nincs / értelmezhetetlen), és arra az egységre vált — ez csak
gyorsítás, a szabadszöveges bevitel változatlanul minden egységet elfogad. Üres `unitChips` (alap)
esetén nincs chip-sor. Az éppen kiválasztott egység chipje kiemelt (nem `outline`).

Első használó: az étkezés tétel-szerkesztő FOOD mennyisége (`g`, `dkg`, `db`, `ml`).

### UI/UX elvárások

- Egy input mező; platformnak megfelelő billentyűzet (ahol lehet, számozós / text).
- Ha a felületen egyértelmű, hogy ide fog gépelni a user: auto-focus ([[Life Management 2.0]] elv).
- Hibaállapot: rövid, érthető üzenet (pl. ismeretlen egység / hiányzó szám).
- Helper ikon mindig elérhető a mező végén.
- Ha a fogyasztó `unitChips`-et ad: gyors egység-választó chip-sor a mező alatt (fent).

### Megjegyzések

Közös frontend komponens — nem feature-specifikus. A fogyasztó feature-ök hivatkozzák ezt a specre, és átadják a `mode`-ot.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Megosztott Angular / Ionic komponens (`QuantityInputComponent`, `shared/quantity-input/`) + pure TypeScript parser utility (egységlista mode szerint + parse / format) + kanonikus egységre váltó utility (fent, a [[Névegyediség]] egyenlőség-összehasonlításhoz).
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

**Kivétel — kanonikus konverzió paritás:** a `Food` mezőhalmaz-duplikáció ([[Névegyediség]]) **alkalmazás-szintű** ellenőrzése ([[Backend]]) a fenti bázisegység-táblát a szerveren (Java) is futtatja, ugyanazokkal a szorzókkal, mint a kliens TS parser — így a kliensoldali előzetes ellenőrzés és a szerveroldali `409` döntés bitre ugyanazt az eredményt adja. Paritás-teszt fixture: [[Backend]] névnormalizálási fixture-mintájára, a mennyiség-konverzió is egy közös, mindkét oldalon futtatott táblán él (nem külön Java + TS konstans-lista).

### Nyitott kérdések

Nincs nyitott kérdés.

# Mennyiség mező

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Frontend]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Bevásárlólista írás]], [[Élelmiszerek]], [[Élelmiszer manuális bevitele]], [[Recept]], [[Élelmiszer tárolás]], [[Backend-offline first]] |

### Célállapot

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

### UI/UX elvárások

- Egy input mező; platformnak megfelelő billentyűzet (ahol lehet, számozós / text).
- Ha a felületen egyértelmű, hogy ide fog gépelni a user: auto-focus ([[Life Management 2.0]] elv).
- Hibaállapot: rövid, érthető üzenet (pl. ismeretlen egység / hiányzó szám).
- Helper ikon mindig elérhető a mező végén.

### Megjegyzések

Közös frontend komponens — nem feature-specifikus. A fogyasztó feature-ök hivatkozzák ezt a specre, és átadják a `mode`-ot.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Megosztott Angular / Ionic komponens (pl. `QuantityInputComponent`) + pure TypeScript parser utility (egységlista mode szerint + parse / format).
- Public API:
  - `@Input() mode: 'quantity' | 'duration'` (default: `quantity`)
  - `amount: number | null`, `unit: QuantityUnit | DurationUnit | null` (vagy együttes value object)
  - `valueChange` / form control (`ControlValueAccessor`) ajánlott
- Egység enum / union típusok a támogatott listákkal; OpenAPI / backend DTO-k ugyanazt az egységkészletet használják, ahol mennyiség vagy időtartam utazik.
- A parser a frontenden él; a backend a már szétbontott `amount` + `unit` párost fogadja (ne a nyers stringet — kivéve ha később explicit másképp döntünk).

#### Backend-offline

Pure client komponens / utility; Backend-offline és Full-offline állapotban is ugyanúgy működik (helyi adat / form state). Nincs saját outbox. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (a mennyiség / időtartam mezők a fogyasztó entitások DTO-iban jelennek meg; egység enum egyeztetés OpenAPI-ban)

### Nyitott kérdések

Nincs nyitott kérdés.

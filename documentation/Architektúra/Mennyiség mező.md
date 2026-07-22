# Mennyiség mező

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Frontend]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Bevásárlólista írás]], [[Élelmiszerek]], [[Recept]], [[Élelmiszer tárolás]] |

### Célállapot

Egységes mennyiség-beviteli UI komponens saját parserrel: a felhasználó egy összeragasztott szöveges mezőbe ír (pl. `120dkg`, `3db`, `2l`), a komponens pedig külön **szám** + **egység** értéket ad ki. Ugyanez a komponens szolgál a Bevásárlás, élelmiszer, recept és egyéb mennyiséget kérő felületeken.

### Funkcionális leírás

#### Input / megjelenítés

- Egy szöveges input; a felhasználó „összeragasztva” gépel (nincs külön szám és egység mező a UI-n).
- Érvényes példaformátumok: `120dkg`, `3db`, `2l`, `1.5kg`, `1,5kg`.
- Tizedes elválasztó: **`.` és `,` is** elfogadott; a belső számérték kanonikus (pl. `1.5`).

#### Parser kimenet

Két külön mező / érték:

| Mező | Jelentés |
|---|---|
| `amount` | Szám (tizedes megengedett, ahol az egység értelmes) |
| `unit` | Egység enum (lásd lent) |

A megjelenítés / újraszerkesztés az `amount` + `unit` összeragasztott formája (pl. `120` + `dkg` → `120dkg`).

#### Támogatott egységek (első kör)

`db`, `g`, `dkg`, `kg`, `l`, `dl`, `ml`

Más egység (`csomag`, `szelet`, stb.) az első verzióban **nincs**.

#### Validáció

- Érvénytelen / nem felismerhető input: a komponens hibát jelez (nem küld részleges értéket a szülő formnak commitra).
- Az egység felismerése kis/nagybetű-független legyen (`3DB` → `db`).

### UI/UX elvárások

- Egy input mező; platformnak megfelelő billentyűzet (ahol lehet, számozós / text).
- Ha a felületen egyértelmű, hogy ide fog gépelni a user: auto-focus ([[Life Management 2.0]] elv).
- Hibaállapot: rövid, érthető üzenet (pl. ismeretlen egység / hiányzó szám).

### Megjegyzések

Közös frontend komponens — nem Bevásárlás-specifikus. A fogyasztó feature-ök hivatkozzák ezt a specre.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Megosztott Angular / Ionic komponens (pl. `QuantityInputComponent`) + pure TypeScript parser utility (egységlista + parse / format).
- Public API: `amount: number | null`, `unit: QuantityUnit | null` (vagy együttes value object); `valueChange` / form control (`ControlValueAccessor`) ajánlott.
- Egység enum / union típus a támogatott listával; OpenAPI / backend DTO-k ugyanazt az egységkészletet használják, ahol mennyiség utazik.
- A parser a frontenden él; a backend a már szétbontott `amount` + `unit` párost fogadja (ne a nyers stringet — kivéve ha később explicit másképp döntünk).

### Backend

_Nincs backend érintettség._ (a mennyiség mezők a fogyasztó entitások DTO-iban jelennek meg; egység enum egyeztetés OpenAPI-ban)

### Nyitott kérdések

Nincs nyitott kérdés.

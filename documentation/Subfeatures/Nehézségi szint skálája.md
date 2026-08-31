# Nehézségi szint skálája

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája (konverziós mátrix)]], [[Indoor boulder napló]], [[Backend-offline first]] |

### Célállapot

Egységes nehézség-beviteli komponens: skála felismerés, validáció, pre-parsing. **Minden** mászó kontextusban elérhető (fallback / ad-hoc); indoor bouldernél a szín-sáv a gyors út, a szöveges parser mellette él.

Input: `discipline` = Boulder \| Köteles (a dashboard kontextusból — nem user-váltós mező a komponensen belül opcionálisan, de a parent átadja).

### Funkcionális leírás

#### Köteles skálák

- **Francia (French):** szám + `a`/`b`/`c` + opcionális `+` (pl. `6a`, `6a+`, `6b`)
- **YDS:** `5.` + fok; `5.10` felett `a`–`d` (pl. `5.8`, `5.10a`)
- **UIAA:** római + opcionális `+`/`−` (pl. `VI-`, `VII`, `VII+`)

#### Boulder skálák

- **Fontainebleau (Font):** mint francia, de betű **NAGY** (pl. `6A`, `6B+`); ugyanaz a jelölés nehezebb, mint a köteles francia
- **V-skála (Hueco):** `V` + szám (`V0`…`V17`)

#### Regex (kontextus + string)

**Boulder:**

- `^V\d+$` → V
- `^\d[A-C]\+?$` → Font

**Köteles:**

- `^5\.\d+[a-d]?$` → YDS
- `^\d[a-c]\+?$` → Francia
- `^[IVXLCDM]+[-+]?$` → UIAA

Sikeres egyértelmű parse → `absoluteDifficultyIndex` a [[Nehézségi szint skálája (konverziós mátrix)]] JSON-ból (kliens + szerver paritás).

### UI/UX elvárások

1. `ion-input` (text); jobb szélen postfix (`slot="end"`); alatta suggestion `ion-chip`-ek.
2. Állapotgép (**250 ms** debounce):
   - **Üres:** nincs postfix; INVALID
   - **Egyértelmű** (pontosan egy regex): postfix = FRA / YDS / UIAA / V / FONT; popover; VALID
   - **Kétértelmű** (tiszta szám, pl. `4`/`6`): chipek + fallback modal; köteles `6` → VI és 6a; `4` → IV és 4. Fallback: `3`/`4`/`5` VALID Francia default (ezeken a fokokon francia/Font betű nélkül is érvényes grade — a `3` a mátrix `FRENCH '3'` / `FONT '3'` sora; `1`/`2` mátrixsor nélkül marad kétértelmű); **`6`-tól felfelé minden csupasz szám** (`6`, `7`, `8`, `9`, …) INVALID amíg nincs chip-választás — francia/Font jelölésben 6-tól kötelező a betű (`6a`/`6A` stb.), tehát a betű nélküli forma önmagában hiányos, ugyanúgy, mint a `6` esetén
   - **Ismeretlen:** kérdőjel; súgó modal példákkal; INVALID
3. **Mobil pre-parsing:** Boulder → NAGYBETŰ; Köteles → kisbetű (kivéve I,V,X UIAA karakterek); `trim()`

### Megjegyzések

Gördülő `ion-select` kiegészítő: [[Nehézségi szint skálája (konverziós mátrix)]] / kontextus-specifikus listák (pl. szín-sáv).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Megvalósítva:

- **Pure TS parser** — `shared/climbing/grade-scale.ts` (`parseGrade`, `normalizeGradeInput`, `scalePostfix`, a négyállapotú `EMPTY`/`VALID`/`AMBIGUOUS`/`UNKNOWN` gép) + `shared/climbing/climbing-grade-matrix.ts` (a [[Nehézségi szint skálája (konverziós mátrix)]] SSOT tábla, `gradeToIndex` / `colorBandMidIndex`). Se DOM, se Angular.
- **Shared komponens** — `shared/grade-input/` (`app-grade-input`), a közös `shared/help-input/` (`app-help-input`: `ion-input` + záró súgó-ikon gomb + opcionális badge + inline hiba-note) fölé építve, ugyanúgy, mint a [[Mennyiség mező]] `app-quantity-input`. Kettős API: `ControlValueAccessor` a reaktív-formos hívóknak (`formControlName`), és sima `[value]` / `(valueChange)` a signal-alapú napló-soroknak. `@Input() discipline` = `BOULDER` \| `ROPE` (a parent adja át a dashboard kontextusból).
  - Záró **badge**: `VALID` → `FRA` / `YDS` / `UIAA` / `FONT` / `V`; `UNKNOWN` → `?`.
  - **Chip-sor** kétértelműségre (`AMBIGUOUS`, ill. bare `4`/`5` az alternatívákkal): a `candidates` lista `ion-chip`-ként; koppintásra a mező a `candidate.label`-re áll és újraparse-ol.
  - **Súgó modal** (`SHARED.GRADE_INPUT.HELP_*`, `AlertController`) a skálákkal + példákkal; az `UNKNOWN` / `AMBIGUOUS` állapot inline hibaüzenetet is ad (`SHARED.GRADE_INPUT.ERROR_*`).
  - **250 ms debounce** csak a vizuális deriváción (badge / chip / hiba / `parseChange`); a form-érték minden leütésre propagál, így a szülő `save()` gate szinkron `parseGrade`-je pontos marad.
- **Hívási helyek**: `admin/gym-color-band-edit` (alsó/felső fokozat), `admin/indoor-route-edit` (ágazatfüggő), és mind a 4 kontextus-napló szerkesztő (`naplo/*-session-edit`, kísérletenkénti + outdoor köteles per-pitch grade).

Offline mindig (pure client).

#### Backend-offline

Pure client; nincs outbox. Index mapping: [[Nehézségi szint skálája (konverziós mátrix)]]. Lásd [[Backend-offline first]].

### Backend

Mentéskor raw grade → `absoluteDifficultyIndex` újraszámolás / validáció ugyanezzel a mátrix JSON-nal.

### Nyitott kérdések

Nincs nyitott kérdés.

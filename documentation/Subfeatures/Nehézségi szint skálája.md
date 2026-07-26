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
   - **Kétértelmű** (tiszta szám, pl. `4`/`6`): chipek + fallback modal; köteles `6` → VI és 6a; `4` → IV és 4. Fallback: `6` INVALID amíg nincs chip; `4`/`5` VALID Francia default
   - **Ismeretlen:** kérdőjel; súgó modal példákkal; INVALID
3. **Mobil pre-parsing:** Boulder → NAGYBETŰ; Köteles → kisbetű (kivéve I,V,X UIAA karakterek); `trim()`

### Megjegyzések

Gördülő `ion-select` kiegészítő: [[Nehézségi szint skálája (konverziós mátrix)]] / kontextus-specifikus listák (pl. szín-sáv).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Shared Angular/Ionic komponens + pure TS parser utility; offline mindig.

#### Backend-offline

Pure client; nincs outbox. Index mapping: [[Nehézségi szint skálája (konverziós mátrix)]]. Lásd [[Backend-offline first]].

### Backend

Mentéskor raw grade → `absoluteDifficultyIndex` újraszámolás / validáció ugyanezzel a mátrix JSON-nal.

### Nyitott kérdések

Nincs nyitott kérdés.

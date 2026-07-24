# Nehézségi szint skálája

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája (konverziós mátrix)]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Backend-offline first]] |

### Célállapot

Egységes nehézség-beviteli komponens boulder / köteles kontextushoz; skálák felismerése és validálása.

### Funkcionális leírás

#### Köteles mászás (Sport és Trad)

- Francia skála (French)
	- Számokból, betűkből (a, b, c) és egy opcionális plusz (+) jelből áll (pl. 6a, 6a+, 6b)
- YDS (Yosemite Decimal System)
	- 5-össel kezdődik (az 1–4-ig terjedő skála az max túra), amit egy pont és a nehézségi fok követ (pl. 5.8, 5.9). 5.10 felett betűk: 5.10a, 5.10b, 5.10c, 5.10d.
- UIAA skála
	- Római számokkal és + / − jelekkel (pl. VI-, VII, VII+)

#### Boulder skálák

- Fontainebleau (Font) skála
	- Hasonlít a francia sportskálára, de a boulder betűit mindig **NAGYBETŰVEL** írják (pl. 6A, 6B, 7A); egy 6A boulder nehezebb, mint egy 6a köteles út
- V-Skála (Hueco)
	- V + szám (V0 … V17)

### UI/UX elvárások

1. **Komponensek:** Inputként megkapja: Köteles vagy Boulder. `ion-input` (type="text"); jobb szélen `slot="end"` postfix gomb. Alatta suggestion container `ion-chip` javaslatokkal.
2. **Állapotgép** (250 ms `debounceTime`):
	- **A) Üres:** nincs postfix / javaslat; VALIDATION INVALID
	- **B) Egyértelmű** (pontosan egy regex): postfix = skála rövidítés (FRA, YDS, UIAA, V, FONT); popover leírással; VALID
	- **C) Kétértelmű** (tiszta szám, pl. "4"/"6"): postfix pl. UIAA / FRA; modal a fallbackről; chipek (köteles "6" → VI és 6a; "4" → IV és 4); chip → Egyértelmű. Fallback: "6" INVALID; "4"/"5" VALID (Francia default)
	- **D) Ismeretlen:** kérdőjel ikon; súgó modal példákkal; INVALID
3. **Mobil pre-parsing:** Boulder → NAGYBETŰ; Köteles → kisbetű (kivéve I,V,X UIAA); trim()

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Regex pattern matching a mászás típusa + string alapján:

**Boulder:**

- `^V\d+$` → V-Skála
- `^\d[A-C]\+?$` → Font

**Köteles:**

- `^5\.\d+[a-d]?$` → YDS
- `^\d[a-c]\+?$` → Francia
- `^[IVXLCDM]+[-+]?$` → UIAA

#### Backend-offline

Számítás / illesztés pure TypeScript utility-ként a kliensen — Backend-offline és Full-offline is. Ha van becsült / csak-online adat, jelöld (`~` / homokóra). Lásd [[Backend-offline first]].

### Backend

Konverzió / index: [[Nehézségi szint skálája (konverziós mátrix)]].

### Nyitott kérdések

Nincs nyitott kérdés.

# Tápérték kalkulátor

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Profile]], [[Edzés]], [[Edzésnapló]], [[Mászónapló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Úszás napló]], [[Étkezés]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Korábbi név: **Kalóriakalkulátor**. A [[Profile]] és a napi aktivitás alapján kiszámítja a szintentartást, az aznapi kalória-/makrócélokat és az `activityExtraKcal` értéket. Az [[Étkezés]] dashboard progress barjai és az [[Értesítések]] kalória-túllépés szabálya ebből az SSOT-ból olvas. Nincs külön energiaegyenleg-feature.

**Jövőbeli:** célok intervallumra váltása (zöld sáv = intervallum); most: egy szám + ±5%.

### Funkcionális leírás

#### Bemenetek ([[Profile]] + naplók)

- Testsúly `m` (kg), magasság `h` (cm), nem, születési dátum → életkor
- Cél enum: `FAT_LOSS` \| `MAINTENANCE` \| `WEIGHT_GAIN`
- `kgPerWeek` > 0 (csak fogyás/tömegnél; megtartásnál figyelmen kívül)
- Aznapi lépésszám ([[Lépésszám követés]]; hiányzó nap = 0), edzésnaplók MET szerint

Életkor: teljes évek, **kliens TZ** szerinti mai dátum vs születési dátum (`floor` period).

Nincs Profile aktivitási szint / lépéskövetés ki-be: a PAL **mindig 1.2**.

#### BMR — Mifflin–St Jeor

- Férfi: \(BMR = 10m + 6.25h - 5a + 5\)
- Nő: \(BMR = 10m + 6.25h - 5a - 161\)

#### PAL

`PAL = 1.2` (fix). A könnyű napi mozgás ebben van; a lépéskalória csak a baseline felett ad `activityExtraKcal`-t. Feature flag off a [[Lépésszám követés]]nél: lépéság = 0, PAL továbbra is 1.2.

#### Kanonikus napi mezők

| Mező | Képlet |
|---|---|
| `maintenanceKcal` | \(BMR \times 1.2\) — edzés és \(\Delta\) nélkül |
| \(\Delta_{\text{cél}}\) | `FAT_LOSS`: \(-\lvert kgPerWeek\rvert \times 1100\); `MAINTENANCE`: \(0\); `WEIGHT_GAIN`: \(+\lvert kgPerWeek\rvert \times 1100\) (1 kg ≈ 7700 kcal → /7 = 1100) |
| `baseDailyCalorieGoal` (nyers) | `maintenanceKcal + Δ` |
| `baseDailyCalorieGoal` (érvényes) | \(\max(\text{nyers},\;\text{floor})\); floor: férfi **1500**, nő **1200** kcal |
| `activityExtraKcal` | lásd lent |
| `dailyAllowanceKcal` | `baseDailyCalorieGoal` (clampelt) `+ activityExtraKcal` |

A clampelt `base` / `dailyAllowance` hajtja a makrókat, az [[Étkezés]] progress barokat és az [[Értesítések]] túllépés-szabályát.

\(M_{\text{day}} = maintenanceKcal + activityExtraKcal\) — az aznapi súlytartó TDEE (edzéssel); kcal szín narancs/piros határához (lásd [[Étkezés]]).

#### Lépéskalória

Konstans: `STEP_BASELINE = 3000` (nem konfigurálható). Szabályok: [[Lépésszám követés]].

\[\text{Kalória}_{\text{lépés}} = \max(0,\;\text{lépésszám} - 3000) \times m \times 0.00045\]

#### Edzéskalória — univerzális MET

\[\text{kcal} = \text{MET} \times m \times \frac{\text{durationMinutes}}{60}\]

MET táblák (részletek a napló specekben is):

**Úszás** ([[Úszás napló]]): egy `intensity` enum — `CASUAL`/`BREASTSTROKE`/`MIXED` 5.5; `BACKSTROKE` 7.0; `CRAWL_FREESTYLE` 8.0; `OPEN_WATER` 9.5; `BUTTERFLY`/`VIGOROUS` 11.0.

**Bicikli** ([[Biciklizés napló]]): `CITY` 4.0; `STATIONARY` 6.0; `ROAD_LEISURE` 6.8; `MOUNTAIN_TRAIL` 8.5; `ROAD_VIGOROUS` 10.0.

**Mászás** ([[Mászónapló]]): **aktív/passzív MET modell** (nem teljes session-idő × egy MET). Aktív bázis: boulder **8.0**, kötél **7.0** (másodmászó: ×0.8); rest **2.0**; `pumpRating` az aktív MET-et módosítja; TRAD: testsúly +6 kg az aktív ágon. Aktív idő: boulder 60 s/kísérlet; kötél m × (25/45/60 s) safety szerint. Részletek és fallback: [[Mászónapló]].

**Erőedzés** ([[Edzésnapló]]): `GENERAL_WEIGHTS` 5.0; `HIIT_CIRCUIT` 8.0.

`activityExtraKcal` = lépéskalória + Σ edzéskalóriák az napra.

#### Makrók (g/nap)

1. Fehérje cél (nyers): \(2.0 \times m\) g (4 kcal/g)
2. Zsír cél (nyers): \(0.9 \times m\) g (9 kcal/g)
3. Szénhidrát: \(\dfrac{dailyAllowanceKcal - (P\times4 + F\times9)}{4}\)

**Carb cycling:** az `activityExtraKcal` növeli a keretet → a többlet a szénhidrátba megy; P/F g/kg fix (amíg a negatív-szénhidrát mentés nem nyúl hozzájuk).

**Ha \(P\times4 + F\times9 > dailyAllowanceKcal\):**

1. Szénhidrát = **20 g** minimum
2. Zsír csökkent **0.6 g/kg**-ig
3. Ha még mindig nem fér: fehérje csökkent **1.5 g/kg**-ig
4. Szénhidrát újraszámol / 20 g floor

Kimenet: `proteinGoalG`, `fatGoalG`, `carbsGoalG` (clampelt allowance alapján).

#### Reaktivitás

Profilsúly / cél / edzés / lépés változás → pure TS utility azonnal újraszámol (Signal / store); offline is ([[Backend-offline first]]).

### UI/UX elvárások

- Napi progress barok: [[Étkezés]] dashboard (elsődleges).
- Saját magyarázó / debug UI később opcionális.
- Offline: becsült jelölés csak ha adat hiányzik (~ / homokóra).

### Megjegyzések

Makró progress barnál **nincs piros** (lásd [[Étkezés]]). Kcal barnál a Q11 prioritás érvényes.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `TdeeCalculatorUtil` (vagy ekvivalens) pure TypeScript: BMR, PAL=1.2, Δ, floor, lépés, MET, makró + mentés-sorrend.
- MET konstansok egy shared modulban; napló feature-ök hivatkoznak.
- Store: aznapi `maintenanceKcal`, `baseDailyCalorieGoal`, `activityExtraKcal`, `dailyAllowanceKcal`, makró célok.

#### Backend-offline

Számítás kliensen Backend-offline / Full-offline. Mentett napló/profil outbox; keret újraszámolás helyi. Lásd [[Backend-offline first]].

### Backend

Ugyanazok a képletek szerveroldali validációhoz / read-modelhez (OpenAPI); kanonikus konstanslista szinkronban a frontendel.

### Nyitott kérdések

Nincs nyitott kérdés.

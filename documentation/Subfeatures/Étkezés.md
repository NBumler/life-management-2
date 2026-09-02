---
verifikalva: 2026-09-02
verifikalt_commit: d67c348
---

# Étkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszer tárolás]], [[Tápérték kalkulátor]], [[Értesítések]], [[Recept forrású étkezés]], [[Élelmiszer forrású étkezés]], [[Egyéni forrású étkezés]], [[Recept]], [[Élelmiszerek]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Napi étkezés-dashboard (egy nap, nincs többnapos történet / diagram) és étkezések CRUD-ja három tételtípussal. Bevitt tápanyag az aznapi tételekből; célok / szintentartás / aktivitás a [[Tápérték kalkulátor]] SSOT-jából. Készletlevonás recept- és élelmiszer-tételeknél ([[Élelmiszer tárolás]]).

### Funkcionális leírás

#### Forrás gyerekek

- [[Recept forrású étkezés]]
- [[Élelmiszer forrású étkezés]]
- [[Egyéni forrású étkezés]]

#### Dashboard (vékony)

1. **Dátumválasztó** — mai nap default (kliens TZ); bal/jobb ±1 nap; **Mai nap** gomb.
2. **4 progress bar** (bevitt az aznapi étkezésekből; célok a [[Tápérték kalkulátor]]ból):
   - Kalória (kcal) — cél nevező: `dailyAllowanceKcal`
   - Fehérje (g) — `proteinGoalG`
   - Szénhidrát (g) — `carbsGoalG`
   - Zsír (g) — `fatGoalG`
3. Minden barnál: `bevitt / cél` (pl. `1200 / 2242 kcal`) + állapot szöveg:
   - ha bevitt ≤ cél: **hátralévő** (pl. `1042 kcal hátra`, `40 g hátra`);
   - ha bevitt > cél: **túllépés** (pl. `200 kcal túllépés`, `40 g túllépés`).
4. **Kalória bar alatt** (másodlagos): opcionális aktivitás többlet, pl. `+242 kcal aktivitás` (`activityExtraKcal`) — magyarázza, mennyi többlet vihető be aznap a mozgás miatt.
5. **Napi ár** (összeg az aznapi tételekből) — a progress barok mellett / alatt, egy sorban.
6. **Étkezések listája** az adott napra.

Nincs: külön makró összesítő sor; külön „cél + aktivitás” kártya; diagram; többnapos történet; Energiaegyenleg.

##### Progress bar színek — kalória

\(A = dailyAllowanceKcal\), \(M = maintenanceKcal + activityExtraKcal\) ([[Tápérték kalkulátor]]).  
`lo = 0.95 × A`, `hi = 1.05 × A`.

Kiértékelési sorrend:

1. **Sárga:** `bevitt < lo`
2. **Zöld:** `lo ≤ bevitt ≤ hi`
3. Ha `bevitt > hi`:
   - **Fogyás** (\(A < M\)): **narancs** ha `bevitt ≤ M`; **piros** ha `bevitt > M`
   - **Megtartás / tömegelés** (\(A ≥ M\)): **nincs narancs** → **piros** (azonnal, ha `bevitt > hi`)

##### Progress bar színek — fehérje / szénhidrát / zsír

Ugyanaz a ±5% zöld a saját célra; **piros nincs**:

| Szín | Feltétel |
|---|---|
| **Sárga** | `bevitt < 0.95 × cél` |
| **Zöld** | `0.95 × cél ≤ bevitt ≤ 1.05 × cél` |
| **Narancs** | `bevitt > 1.05 × cél` |

Állapot szöveg (minden bar): cél alatt → „hátra”; cél felett → „túllépés”.

#### Étkezés entitás

| Mező | Szabály |
|---|---|
| **Időpont** | Kötelező; default = most (készülék / böngésző TZ). Lásd Időzóna. |
| **Megjegyzés** | Opcionális. |
| **Tételek** | ≥1 kötelező; vegyes forrástípusok megengedettek. |

- Szerkeszthető, soft delete (`deleted`), megerősítéssel; backend-offline. Szinkronizálatlan helyi only → hard remove. Lásd [[Backend-offline first]].

#### Tétel — közös

- **Forrás típusa:** `RECIPE` \| `FOOD` \| `CUSTOM` — gyerek specek.
- **Adagszorzó (`servings`):** `> 0` (pl. `0.8`, `2`, `4.5`). **`0` tilos.**
- Napi összeg: tételek effektív értékeinek összege (élő katalógus ahol ID van).

#### Élő hivatkozás (recept / élelmiszer)

ID + mennyiség/szorzó; tápanyag az aktuális katalógusból. Katalógus-tétel törlésekor a hivatkozó étkezés-tételek **cascade** soft delete-et kapnak, és a most üressé vált étkezés is soft delete-elődik ([[Recept]], [[Élelmiszerek]]). A törlés-megerősítő jelenleg nem sorolja fel a hivatkozó étkezéseket — tervezett: `backlog/009-katalogus-recept-etkezes-torles-megerosito-nem-sorolja-fel-a-cas.md`.

#### Készlet

- Create mentéskor: recept / élelmiszer levonás ([[Élelmiszer tárolás]]); egyéni nem.
- Szerkesztés / törlés: nincs visszapótlás.
- A levonás **kliens-oldali** (`meal.repository.ts:consumeStock` → `stock-consumption.ts`); a szerver nem von le. **Tudatos korlát:** két offline eszközön naplózott étkezés esetén a `stored_food` relatív csökkentése elveszhet a sor-szintű last-write-wins alatt ([[Backend-offline first]] §17).

#### Időzóna

1. Időpont: kliens TZ.
2. DB: `eatenAt` UTC timestamptz + `timeZoneId` (IANA).
3. Dashboard nap: megjelenítő kliens TZ naptári napja.
4. Megosztott, tesztelt DateTime modul (DST, TZ váltás, „melyik nap” edge case-ek).

### UI/UX elvárások

- Kaja: Étkezés dashboard (fenti vékony layout).
- Fejléc: **Étkezés rögzítése**.
- Űrlap: időpont, megjegyzés, tételek; mentés footer; iOS `16px`.
- Tétellista: kompakt, csak-olvasható összegző sorok (cím + „mennyiség · adagszorzó · effektív kcal/ár"). A sorra koppintva teljes képernyős tétel-szerkesztő modal nyílik; átrendezés fel/le nyíllal (natív, egymás alatt) vagy fogantyúval (web), törlés a soron. Hiányos tétel a mentés blokkolásakor jelölést kap.
- Tétel-szerkesztő modal: soronként egy mező (a mennyiség mező teljes szélességű), `servings` lépegetővel (± 0,5, kézzel is írható), élő effektív kcal/ár előnézet. „Kész" gomb csak érvényes soron aktív; háttérre koppintva a sor „hiányos" marad. Picker-megerősítés / egyéni tétel hozzáadása után a modal automatikusan felnyílik az első kitöltésre váró új tételre (FOOD → mennyiség, CUSTOM → név + kalória; RECIPE nem, mert `servings` = 1 alapból).

### Megjegyzések

Értesítés kalória túllépésre: [[Értesítések]] (nem kell külön egyenleg-feature).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Dashboard: dátum + 4 progress bar + ár + lista; színlogika pure TS.
- Cél / maintenance / activity: [[Tápérték kalkulátor]] utility / store.
- Élő tételösszegzés; DateTime modul.
- Étkezés szerkesztő: a tétel-sor modell (`meal-item-row.ts` — RECIPE/FOOD/CUSTOM signal-mezőkkel, `toSaveItem` / `buildRowFromDto` / factory-k / `isRowComplete` / `rowNeedsInput`) megosztva a `reorder-list` összegző lista és a `MealItemEditorComponent` modal között; a modal ugyanazt a sor-objektumot mutálja, amit a lista mutat.

#### Backend-offline

Dashboard és CRUD helyi store; mutációk outboxba, kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

| Entitás | Fő mezők |
|---|---|
| `Meal` | `id` (UUID); `eatenAt` (timestamptz); `timeZoneId`; `note`; `deleted`; timestamps |
| `MealItem` | `id`; `mealId`; `type`; `servings`; típusmezők; `sortOrder` |

Cascade: `Food` / `Recipe` delete → itemek (`MealCascade`), majd üres meal soft delete. `MealItem`-nek nincs saját `user_id`; a delta pull a szülő `Meal`-en át vetíti. `POST` létező id-val idempotens upsert; `PUT` deleted meal → 409 `ENTITY_DELETED`; a Meal + tételei egy nested tree-ként mentődnek (`MealService.saveTree`).

### Nyitott kérdések

Nincs nyitott kérdés.

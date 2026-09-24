---
verifikalva: 2026-09-24
verifikalt_commit: c3d8708
---

# Indoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Mászónapló]], [[Tápérték kalkulátor]], [[Profile]], [[Backend-offline first]] |

### Jelenlegi működés

Beltéri boulder sessionök és kísérletek naplózása. Dashboard belépő: **Indoor Boulder** → ez a form (nincs location/discipline választó).

Közös session modell: [[Mászónapló]] (`locationType=INDOOR`, `discipline=BOULDER`). Ez a **reference napló-spec**; a többi kontextus innen ágazik el.

### Funkcionális leírás

#### Session mezők (e kontextus)

| Mező | Szabály |
|---|---|
| `date`, `totalSessionDurationMinutes` | [[Mászónapló]]; fallback: kísérletek × 5 perc |
| `gymId` | Kötelező választás [[Indoor boulder admin]] teremből (legutóbbi terem előtöltés). A picker csak azokat a termeket listázza, amelyek `Gym.disciplines`-e tartalmazza a boulder jelölést. |
| `gymName` | Snapshot |
| `pumpRating` / `headspaceRating` / `notes` | [[Mászónapló]] — pump ajánlott, többi opcionális |
| `climbingPartners` | Opcionális; **combobox** (`app-partner-combobox`) — korábbi társak chip-választóból vagy gépelve, új név is felvehető. Forrás: `ClimbingSessionRepository.partnerSuggestions`. Lásd [[Mászónapló]]. |
| `attempts` | ≥0; élő pipálás vagy utólag |

`weatherConditions` **nincs** (indoor).

#### Attempt mezők (indoor boulder)

| Mező | Szabály |
|---|---|
| `colorBandId` | Opcionális; ha van → elsődleges gyorsválasztás |
| `bandModifier` | Opcionális `MINUS` \| `NEUTRAL` \| `PLUS` (`backlog/122`) — a sávon belüli rész; a kártyán `− / = / +` gombokkal állítható, az index `MINUS →` alsó, `PLUS →` felső, egyébként közép ([[Mászónapló]]) |
| Snapshot | `colorName`, `hexColor`, `gradeRange` szöveg (pl. `6A–6B`). A numerikus index-tartomány (`Lower`/`Upper`) snapshotolása tervezett — `backlog/023-climbing-a-kiserlet-snapshot-tarolja-a-szin-sav-numerikus-index-.md` |
| `userRawInput` | Opcionális / alternatív: [[Nehézségi szint skálája]] Font/V parser |
| `absoluteDifficultyIndex` | Szín-sávból: a `[Lower, Upper]` index **lefelé kerekített** közepe (`resolveIndex()` → `colorBandMidIndex`, `floor` — determinisztikus, klienst és szervert egyaránt köti); parser esetén a parsed grade indexe. |
| `isSuccess` | Boolean |
| `attemptCount` | Opcionális `≥ 1` — próbák (gólok) száma **ebben a sessionben** ezen a problémán (napló-form címke: „Próbák (ebben a sessionben)"). Tájékoztató; a képletek nem szoroznak vele. Lásd [[Mászónapló]]. |
| `ascentStyle` | Ha siker: `FLASH` \| `REDPOINT` \| `ONSIGHT` (ONSIGHT megengedett fallback) |
| `notes` | Opcionális, többsoros szabad szöveg (pl. top fogás). Sikertelennél ugyanez a mező a „hol akadt el" jegyzet — **nincs külön `failurePoint`** ([[Mászónapló]], `backlog/archive/077`). |

Nincs `safetyStyle`, `lengthInMeters`, `PitchLog`.

Kalória / volumen: [[Mászónapló]] (boulder 60 s/kísérlet; volume = sikeres × 4 m × \(I\)).

CRUD: nested session mentés; soft delete; draft élő sessionhez.

### UI/UX elvárások

- **Élő session gyors-rögzítő rács** (`backlog/122`, csak élő módban): a kiválasztott terem élő színsávjai nehézség szerint, soronként `−` / sáv (színnel + a sessionbeli darabszámmal) / `+` gomb. Egy koppintás = egy **sikeres** kísérlet az adott sávval és módosítóval (stílus üres), rövid haptika. Terem nélkül / sáv nélküli teremnél figyelmeztetés. A rögzített kísérletek alatta kártyaként szerkeszthetők (pl. sikertelenre állítás). Élő / összegző folyamat: [[Mászónapló]].
- „Új kísérlet" gomb a lista tetején és (≥1 kísérletnél) alján is, görgetés az új kártyához — [[Mászónapló]] `### UI/UX elvárások`.
- Flow: Hub → Indoor Boulder csempe → Active session (vagy utólagos) → kísérlet hozzáadás (szín chip / parser) → pipa → Befejezés.
- Szín-sáv **chip-sor** a kiválasztott terem élő sávjaiból (nehézség szerint; chipenként sáv-színű pötty + név + fokozat-tartomány); koppintás választ, a kiválasztott chip újrakoppintása törli. Színsávos teremben a szöveges grade másodlagos: „vagy fokozat megadása” gomb mögött van (meglévő, grade-es kísérletnél nyitva); sáv nélküli teremben a grade-mező közvetlenül látszik.
- Sikeres kísérletnél a **Stílus** választó mellett súgó (ⓘ) gomb (`app-help-button`) — onsight / flash / redpoint magyarázat; részletek: [[Mászónapló]] „Kísérlet stílus súgó”. A [[Mászónapló]] `ascentStyle` korábbi-megmászás figyelmeztetése **indoor bouldernél nincs**: a kísérlet csak `colorBandId` szín-sávra linkel, ami nem azonosít konkrét problémát, így nincs mihez hasonlítani.
- **Mászótársak** combobox (`app-partner-combobox`): korábbi társak tap-elhető chip-ként, gépelve szűrhető + új név felvehető; részletek: [[Mászónapló]].
- Minden kísérlet önálló kártya (keret + térköz, bal élen zöld/piros színsáv a sikerállapothoz) — [[Mászónapló]] `### UI/UX elvárások`.
- Thumb-zone: új kísérlet / siker toggle / session vége.
- Lista: közös Mászónapló lista, szűrő: Indoor Boulder.
- Admin: jobb felső → [[Indoor boulder admin]].

### Megjegyzések

1.0 fájdalom: túl sok kötelező mező — itt minimális kötelező: dátum + terem + legalább idő vagy kísérletek (duration fallback).

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kontextus-fix; shared session store; grade + calorie utilities; draft storage.

#### Backend-offline

Helyi store + outbox; nested PUT/POST; soft delete; draft nem outbox amíg nincs mentés. Lásd [[Backend-offline first]], [[Mászónapló]].

### Backend

`ClimbingSession` + `AscentAttempt` discriminator `INDOOR`+`BOULDER`; opcionális `colorBandId` + snapshot JSON/oszlopok. Közös API: [[Mászónapló]].

### Nyitott kérdések

Nincs nyitott kérdés.

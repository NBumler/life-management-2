# Mászónapló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Edzés]], [[Tápérték kalkulátor]], [[Profile]], [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Indoor mászónapló]], [[Outdoor mászónapló]], [[Szinkronizációs központ]], [[Backend-offline first]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]] |

### Célállapot

Mászóedzések naplózása **4 külön dashboard-belépővel** (Indoor/Outdoor × Boulder/Kötél). A kontextus a belépőgombból jön — **nincs** egy közös form, ahol a user indoor/outdoor vagy boulder/kötél mezőt választana.

Egy naplóegység = egy `ClimbingSession` + alatta `AscentAttempt` lista. A kalória a [[Tápérték kalkulátor]] `activityExtraKcal` összegébe megy (aktív/passzív MET modell — lásd lent).

### Funkcionális leírás

#### Dashboard (Hub)

- **4 csempe:** Indoor Boulder · Indoor Kötél · Outdoor Boulder · Outdoor Kötél — mindegyik a saját specifikus napló-flow-ját nyitja.
- **Mászó Statisztikák** (fejléc / külön kártya).
- **Terem / Helyszín Admin** (fejléc fogaskerék); kontextus-napló képernyőn is gyors admin belépő.
- **Közös session lista** szűrő-tabokkal / badge-ekkel a 4 kontextusra.

Kontextus váltás **aktív session közben tilos** — lezárás / mentés, majd új session másik belépőből.

#### Subfeature fa

- [[Indoor mászónapló]] → [[Indoor - boulder]] (admin + napló reference), [[Indoor - köteles]]
- [[Outdoor mászónapló]] → [[Outdoor - boulder]], [[Outdoor - köteles]]
- Közös: [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]]

Fejlesztési / spech sorrend: hub+kalória → skála+mátrix → Indoor boulder (reference) → többi kontextus eltérésekkel.

#### Entitás — `ClimbingSession` (közös)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `date` | Naptári dátum (kliens TZ) |
| `locationType` | `INDOOR` \| `OUTDOOR` — **dashboard discriminator**, nem form-választó |
| `discipline` | `BOULDER` \| `ROPE` — **dashboard discriminator** |
| `totalSessionDurationMinutes` | Egész `> 0` ha van; hiányzik → fallback (lásd Kalória) |
| `pumpRating` | Opcionális 1–5; kalória módosító |
| `headspaceRating` | Opcionális 1–5; csak statisztika |
| `notes` | Opcionális |
| `climbingPartners` | Opcionális string lista |
| `weatherConditions` | Opcionális enum; **csak outdoor** sessionön (`COLD_DRY`, `HOT_HUMID`, `WINDY`, `WET`, …) |
| `gymId` / crag–sector hivatkozások | Kontextus szerint — gyerek specek |
| `attempts` | `AscentAttempt[]` |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

Egy napon **több** session megengedett (akár ugyanarra a kontextusra is). Egy sessionben **nem** keverhető boulder + kötél / indoor + outdoor.

#### Entitás — `AscentAttempt` (közös váz)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `isSuccess` | Boolean |
| `userRawInput` / `rawGrade` | Szöveges grade (parser) |
| `absoluteDifficultyIndex` | Integer; mátrixból ([[Nehézségi szint skálája (konverziós mátrix)]]) |
| `ascentStyle` | Opcionális, ha `isSuccess`: `ONSIGHT` \| `FLASH` \| `REDPOINT` (kontextus szerinti whitelist) |
| `safetyStyle` | Csak kötél: `TOPROPE` \| `LEAD` \| `TRAD` (indoor: TRAD rejtve) |
| `failurePoint` | Opcionális; sikertelennél |
| `attemptCount` | Opcionális egész `≥ 1` (pl. indoor boulder próbálkozások) |
| `colorBandId` / `routeId` / `boulderProblemId` | Opcionális FK + **snapshot** mezők (gyerek specek) |
| `lengthInMeters` | Kötél; opcionális (default: terem / route) |
| `pitches` | `PitchLog[]` — csak outdoor multi-pitch |
| `orderIndex` | Sorrend |
| `deleted` | Soft delete (vagy parent cascade soft) |

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

**Nem** egyszerű `duration × MET` a teljes időre. Aktív + passzív (rest) zóna:

**Aktív idő (másodperc), kísérletenként összegezve:**

| Szabály | Aktív idő |
|---|---|
| Boulder (minden naplózott kísérlet) | fix **60 s** |
| Kötél TOPROPE | `lengthInMeters × 25` s |
| Kötél LEAD | `lengthInMeters × 45` s |
| Kötél TRAD | `lengthInMeters × 60` s |
| Másodmászó (`isLead = false` pitch / attempt) | az elölmászó aktív idejének **80%-a** (MET hatás: lásd lent) |

\(t_{\text{activeMin}} = \sum \text{aktív s} / 60\);  
\(t_{\text{restMin}} = \max(0,\; \text{totalSessionDurationMinutes} - t_{\text{activeMin}})\).

**MET:**

| | MET |
|---|---|
| Aktív boulder | 8.0 |
| Aktív kötél (elöl) | 7.0 |
| Aktív kötél másod | \(7.0 \times 0.8\) |
| Rest / üresjárat / biztosítás a földön | **2.0** |

`pumpRating` szorzó az **aktív** MET-re (lineáris a megadott pontok között):

| Rating | Szorzó |
|---|---|
| 1 | 0.8 |
| 3 | 1.0 |
| 5 | 1.3 |

Hiányzó `pumpRating` → szorzó **1.0**.

Testsúly \(m\): [[Profile]] aktuális kg — **nem** fagyasztódik. TRAD: \(m_{\text{eff}} = m + 6\) (hardver) az **aktív** kötél ágon; rest ágon marad \(m\).

\[\text{kcal} = (\text{MET}_{\text{active}} \times \text{pump}) \times m_{\text{eff}} \times \frac{t_{\text{activeMin}}}{60} + 2.0 \times m \times \frac{t_{\text{restMin}}}{60}\]

- A session **nem tárol** SSOT `calculatedCalories` mezőt (mint [[Úszás napló]] / [[Edzésnapló]]); a [[Tápérték kalkulátor]] utility számol.
- UI élő előnézet ugyanazzal a pure TS képlettel; szerver opcionális paritás.

**Duration fallback** (ha hiányzik / érvénytelen `totalSessionDurationMinutes`):

- Boulder: \(\text{kísérletek száma} \times 5\) perc  
- Kötél: \(\text{utak / kísérletek száma} \times 15\) perc  

#### Volumen (statisztika)

- Kötél: \(\text{Volume} = \text{mászott méter} \times I_{\text{grade}}\)
- Boulder: 1 sikeres kísérlet ≡ **4 m**; \(\text{Volume} = (\text{sikeres kísérletek} \times 4) \times I_{\text{grade}}\)

#### Statisztikák (2.0 scope)

Max grade kontextusonként; összes Volume; sikerarány (Flash / Redpoint / sikertelen); grade piramis (30 / 90 / 365 nap).

#### Soft delete / offline

Minden mászó entitás: soft delete ([[Backend-offline first]]). Nested session + attempts **egy** POST/PUT. Élő pipálás + utólagos mentés; draft app-kill után helyreáll.

**Nem scope (2.0):** gear wear / kötél-leltár; mikro pihenő-stopper; térképnézet / fotó (Crag/Sector opcionális GPS mező OK; UI 2.1).

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Mászónapló hub → 4 csempe.
- 1-tap chip-ek, grade pre-parser, legutóbbi terem/helyszín előtöltés (1.0 fájdalompont ellensúlya).
- Közös lista + kontextus szűrők.

### Megjegyzések

Korábbi összevont szöveg: [[Giga feature napló specifikáció (Ideiglenes specifikáció)]] — pointer; tartalom a moduláris specekbe került.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Hub dashboard; közös session lista; 4 kontextus route → gyerek napló screenek.
- Shared grade parser komponens; climbing calorie + volume pure TS ([[Tápérték kalkulátor]] / shared modul).
- Draft: Ionic Storage / SQLite.

#### Backend-offline

Olvasás/írás helyi store; mutációk outbox + kliens UUID; soft delete synchelhető; draft helyi. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

- OpenAPI: `POST/PUT/GET/DELETE /api/climbing/sessions` — polymorphic DTO (`locationType` + `discipline` discriminator).
- Master külön: `Gym` + `GymColorBand`; `Crag` + `Sector` + `Route` / `BoulderProblem` (gyerek specek).
- UUID kliens; soft delete; nested session body.
- Opcionális szerveroldali grade index + kcal paritás.

### Nyitott kérdések

Nincs nyitott kérdés.

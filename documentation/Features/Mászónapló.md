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

„Aktív session" = **kliens-lokális draft állapot** (a Frontend `pages/` szintjén tartott UI-state / draft storage — [[Backend-offline first]] §15 „draft"), **nem** perzisztált `ClimbingSession` mező; a `ClimbingSession` entitásnak nincs saját `isActive` / státusz mezője.

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
| `attemptCount` | Opcionális egész `≥ 1` — próbák száma az adott mászáson / úton, **kontextustól függetlenül** (indoor/outdoor, boulder/kötél egyaránt; pl. redpoint próbák száma egy köteles úton). Tájékoztató mező: a Volumen- és a sikerarány-képlet **attempt-soronként** számol, egyikük sem szoroz vele; a statisztikai nézetek megjeleníthetik |
| `colorBandId` / `routeId` / `boulderProblemId` | Opcionális FK + **snapshot** mezők (gyerek specek) |
| `lengthInMeters` | Kötél; opcionális (default: terem / route) |
| `pitches` | `PitchLog[]` — csak outdoor multi-pitch |
| `orderIndex` | Sorrend |
| `deleted` | Soft delete (parent cascade soft) |

`AscentAttempt.deleted` **kizárólag** a szülő `ClimbingSession` cascade soft delete-jéhez kell (ha a teljes sessiont törlik, az attempt-jei is tombstone-osak lesznek — [[Backend-offline first]] §9 cascade). A **nested PUT** (teljes fa cseréje egy body-ban — lásd „Soft delete / offline" lent) miatt egy session szerkesztésekor egy-egy kísérlet **eltávolítása** nem külön `deleted = true` írás, hanem egyszerűen kimarad a mentett `attempts` tömbből; a szerver a hiányzó gyerekeket állítja `deleted = true`-ra a nested-write feldolgozásakor (nem a kliens jelöli meg egyenként).

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

**Nem** egyszerű `duration × MET` a teljes időre. Aktív + passzív (rest) zóna:

**Aktív idő (másodperc), kísérletenként összegezve:**

| Szabály | Aktív idő |
|---|---|
| Boulder (minden naplózott kísérlet) | fix **60 s** |
| Kötél TOPROPE | `lengthInMeters × 25` s |
| Kötél LEAD | `lengthInMeters × 45` s |
| Kötél TRAD | `lengthInMeters × 60` s |
| Másodmászó (`isLead = false` a `PitchLog`-on — **csak** outdoor multi-pitch, [[Outdoor köteles napló]]) | az elölmászó aktív idejének **80%-a** (MET hatás: lásd lent) |

\(t_{\text{activeMin}} = \sum \text{aktív s} / 60\);  
\(t_{\text{restMin}} = \max(0,\; \text{totalSessionDurationMinutes} - t_{\text{activeMin}})\).

**MET:**

| | MET |
|---|---|
| Aktív boulder | 8.0 |
| Aktív kötél (elöl) | 7.0 |
| Aktív kötél másod | \(7.0 \times 0.8\) |
| Rest / üresjárat / biztosítás a földön | **2.0** |

**Szándékos kettős szorzás másodmászónál:** a 80%-os aktív idő **és** a 80%-os MET **egyszerre** érvényesül (≈0.64× a vezető energiaköltségéhez képest). Ez **nem** hiba: a két tényező két különböző hatást fejez ki — az aktív idő csökkenése azt modellezi, hogy a másodmászó nem rak/tisztít biztosítást (gyorsabban halad), a MET csökkenése pedig azt, hogy a mozgás per-másodperc kevésbé megterhelő (nincs anyag cipelése / helyezése közben). A két tényező összeszorzása szándékos modellezési döntés, nem ugyanannak a jelenségnek a duplikált leszámítolása.

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

**Duration fallback** (ha hiányzik / érvénytelen `totalSessionDurationMinutes`). A „kísérletek száma" itt a **naplózott `AscentAttempt` sorok darabszáma** a sessionben (**nem** a `Σ attemptCount`, ami az egyes problémákon/utakon belüli próbákat számolja). Az `attemptCount` önálló, tájékoztató mező az attempt-soron: a Volumen- és a sikerarány-statisztika is **attempt-soronként** számol és **nem szoroz** vele, és a duration fallbackba sem megy — de a statisztikai nézetek megjeleníthetik (pl. „N redpoint-próba"):

- Boulder: \(\text{naplózott attempt sorok száma} \times 5\) perc  
- Kötél: \(\text{naplózott attempt sorok száma} \times 15\) perc  

#### Volumen (statisztika)

\(I_{\text{grade}}\) itt **kísérletenkénti** érték (minden `AscentAttempt` a saját `absoluteDifficultyIndex`-ét viszi), tehát a session-szintű Volume a kísérletek feletti **összeg**, nem egyetlen session-szintű grade-del szorzás:

- Kötél: \(\text{Volume} = \sum_{\text{sikeres kísérletek}} \text{mászott méter}_i \times I_{\text{grade},i}\) (a „mászott méter” kísérletenként: `lengthInMeters`, vagy a pitch-ek összege multi-pitchnél)
- Boulder: 1 sikeres kísérlet ≡ **4 m**; \(\text{Volume} = \sum_{\text{sikeres kísérletek}} 4 \times I_{\text{grade},i}\)

#### Statisztikák (2.0 scope)

Max grade kontextusonként; összes Volume; sikerarány-bontás (Onsight / Flash / Redpoint / sikertelen — a rögzített `ascentStyle` nélküli sikeres kísérlet redpointként számít); grade piramis (30 / 90 / 365 nap).

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

---
verifikalva: 2026-09-24
verifikalt_commit: 3aee8a9
---

# Mászónapló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Edzés]], [[Tápérték kalkulátor]], [[Profile]], [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Indoor mászónapló]], [[Outdoor mászónapló]], [[Kezdőlap]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Mászóedzések naplózása **4 külön dashboard-belépővel** (Indoor/Outdoor × Boulder/Kötél). A kontextus a belépőgombból jön — **nincs** egy közös form, ahol a user indoor/outdoor vagy boulder/kötél mezőt választana.

Egy naplóegység = egy `ClimbingSession` + alatta `AscentAttempt` lista. A kalória a [[Tápérték kalkulátor]] `activityExtraKcal` összegébe megy (aktív/passzív MET modell — lásd lent).

### Funkcionális leírás

#### Dashboard (Hub)

- **4 csempe:** Indoor Boulder · Indoor Kötél · Outdoor Boulder · Outdoor Kötél — mindegyik a saját specifikus napló-flow-ját nyitja.
- **Mászó Statisztikák** (fejléc / külön kártya).
- **Terem / Helyszín Admin** (fejléc fogaskerék); kontextus-napló képernyőn is gyors admin belépő.
- **Per-kontextus session lista:** a `ClimbingSessionListPage` a `route.data.contextKey` alapján a 4 kontextushoz külön listát ad. Egy közös lista váltható szűrő-tabokkal / badge-ekkel tervezett: `backlog/022-climbing-kozos-session-lista-4-kontextusu-szuro-tabbal-a-4-kulon.md`.

Kontextus váltás **aktív session közben tilos** — lezárás / mentés, majd új session másik belépőből.

„Aktív session" = **kliens-lokális draft állapot**, **nem** perzisztált `ClimbingSession` mező; a `ClimbingSession` entitásnak nincs saját `isActive` / státusz mezője. A draft jelenleg csak memóriában él — folyamatban lévő session app-kill után elveszik; a draft-perzisztálás / helyreállítás tervezett: `backlog/021-climbing-folyamatban-levo-session-draft-perzisztalasa-app-kill-t.md`.

#### Subfeature fa

- [[Indoor mászónapló]] → [[Indoor - boulder]] (admin + napló reference), [[Indoor - köteles]]
- [[Outdoor mászónapló]] → [[Outdoor - boulder]], [[Outdoor - köteles]]
- Közös: [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]]

#### Entitás — `ClimbingSession` (közös)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `date` | Naptári dátum (kliens TZ) |
| `locationType` | `INDOOR` \| `OUTDOOR` — **dashboard discriminator**, nem form-választó |
| `discipline` | `BOULDER` \| `ROPE` — **dashboard discriminator** |
| `totalSessionDurationMinutes` | Egész `> 0` ha van; hiányzik → fallback (lásd Kalória) |
| `pumpRating` | Opcionális 1–5; kalória módosító |
| `headspaceRating` | Opcionális 1–5; rögzítve, de jelenleg egyetlen statisztikai nézet sem olvassa — megjelenítés tervezett: `backlog/025-climbing-headspacerating-megjelenitese-valamelyik-statisztikaban.md` |
| `notes` | Opcionális |
| `climbingPartners` | Opcionális string lista. A napló-formon **combobox** (`app-partner-combobox`): a felvett nevek chip-ként; a beviteli mező a user korábbi társait (az összes élő `ClimbingSession.climbingPartners` értékéből, gyakoriság szerint, [[Szöveges keresés]] normalizálással) szűri **és** enged új nevet felvenni („+ Hozzáadás: …"). Nincs külön `Partner` entitás — tisztán kliens-oldali aggregáció a helyi `climbing_session` táblából (`ClimbingSessionRepository.partnerSuggestions`), így Full-offline is működik. |
| `weatherConditions` | Opcionális enum (`COLD_DRY`, `HOT_HUMID`, `WINDY`, `WET`); a „csak outdoor" korlát **kliens-oldalon** kényszerített (az indoor form fixen `null`-t küld), a szerver laza (mint `workout_session`) |
| `gymId` / `cragId` hivatkozás | Kontextus szerint — gyerek specek. Kültéri: **egy session = egy `Crag`**; a szektor a kísérlet (`AscentAttempt`) szintjén (`backlog/084`). Nincs session-szintű `rockType` / `aspect` — ezek a törzsadat (út / szektor / szikla) tulajdonságai, a napló megjelenítésre a `Route` → `Sector` → `Crag` láncból származtatja őket, nem tárol saját másolatot. |
| `attempts` | `AscentAttempt[]` |
| `deleted` | Soft delete |
| `createdAt` / `updatedAt` | Audit |

Egy napon **több** session megengedett (akár ugyanarra a kontextusra is). Egy sessionben **nem** keverhető boulder + kötél / indoor + outdoor.

#### Entitás — `AscentAttempt` (közös váz)

| Mező | Típus / szabály |
|---|---|
| `id` | UUID |
| `isSuccess` | Boolean |
| `userRawInput` / `rawGrade` | Szöveges grade (parser). Egy `Route` / `BoulderProblem` / `IndoorRoute` kiválasztásakor a mező a kiválasztott út fokozatával töltődik; **másik útra váltáskor újratöltődik** az új út fokozatával (és vele az `absoluteDifficultyIndex` is), kivéve ha a user közben kézzel átírta — a kézzel megadott érték megmarad. Ha az előtöltött kalauz-fokozat **„/"-elválasztott tartomány** (`VIII/VIII+`, `6c/6c+`, `7a/+`), a parser nem dobja `UNKNOWN`-ba: a levezetett index a két végpont közepe (`floor`), a nyers szöveg megmarad — [[Nehézségi szint skálája]] „/"-elválasztott kalauz-tartomány. |
| `absoluteDifficultyIndex` | Integer; mátrixból ([[Nehézségi szint skálája (konverziós mátrix)]]). Kliens-oldalon mindig a `userRawInput` (ha van) vagy a kiválasztott út fokozatából számítva — lásd fent az útváltás-szabályt. |
| `ascentStyle` | Opcionális, ha `isSuccess`: `ONSIGHT` \| `FLASH` \| `REDPOINT` (kontextus szerinti whitelist). A választó mellett súgó (ⓘ) gomb: a három stílus definíciója + miért zárják ki egymást (`WORKOUT.CLIMBING.ASCENT_STYLE.HELP_*`). **Korábbi-megmászás figyelmeztetés:** ha a sor sikeres `ONSIGHT` / `FLASH`, **és** ugyanarra a linkelt útra (`indoorRouteId` / `routeId` / `boulderProblemId`) van korábbi, nem törölt, **sikeres** kísérlet egy korábbi dátumú sessionben, a stílus-választó alatt **nem blokkoló** figyelmeztető `ion-note` jelenik meg a legutóbbi megmászás dátumával (`WORKOUT.CLIMBING.SESSION.PRIOR_ASCENT_WARNING`) — a mentés engedélyezett marad (a user tudhatja jobban: elírt linkelés, más út). Tisztán kliensoldali, származtatott (`ClimbingSessionRepository.priorSuccessfulAscentDate`), Full-offline is fut. Ad-hoc (link nélküli) kísérletnél nincs mihez hasonlítani → nincs figyelmeztetés. Indoor bouldernél nincs (a `colorBandId` szín-sáv nem azonosít konkrét problémát). |
| `safetyStyle` | Csak kötél: `TOPROPE` \| `LEAD` \| `TRAD` (indoor: TRAD rejtve) |
| `attemptCount` | Opcionális egész `≥ 1` — **próbák (gólok) száma ebben a sessionben ezen az úton**, kontextustól függetlenül (pl. redpoint-próbák egy köteles úton). A napló-form címkéje: „Próbák (ebben a sessionben)"; új kísérlet-sor felvételekor a mező **alapból `1`** (a leggyakoribb eset egy próba), így ha a user nem módosítja, `1` mentődik. Tájékoztató mező: a Volumen-, a sikerarány- és a duration-fallback képlet is **kísérlet-soronként** (nem `Σ attemptCount`) számol, egyikük sem szoroz vele; a statisztikai nézetek megjeleníthetik. |
| `colorBandId` / `routeId` / `boulderProblemId` | Opcionális FK + **snapshot** mezők (gyerek specek) |
| `sectorId` / `sectorName` | **Kültéri**, opcionális FK + snapshot: a **kísérlet szektora** (`backlog/084`). Egy alkalom (session) több szektort is érinthet, ezért a szektor kísérletenként választható — a `Crag` marad session-szintű. Új kísérlet-sor felvételekor a szektor **előtöltődik az előző kísérletéből** (első sornál az utolsó ilyen kontextusú session utolsó kísérletének szektorából); a `Crag` váltása minden sor szektorát törli. Indoor kontextusban `null`. |
| `lengthInMeters` | Kötél; opcionális. Öröklés: indoor a terem falmagasságából; outdoor `Route.lengthInMeters` → a kísérlet szektorának `Sector.defaultLengthInMeters`-e (`backlog/088`) → kézi. Provenance-jelölt (`lengthAutoFilled`): út- vagy szektorváltáskor az örökölt érték újratöltődik, kézi felülírásig. |
| `notes` | Opcionális szabad szöveg, többsoros (auto-grow). **Nincs külön `failurePoint` mező** — sikertelen kísérletnél ugyanez a `notes` mező kapja a „Jegyzet / hol akadt el?" címkét és a „Hol akadt el? Mi ment / nem ment?" promptot. A régi `failurePoint` szöveg a `V31` migrációval (backend) + a helyi `SCHEMA_V30` upgrade-del (natív) a `notes`-ba olvadt. |
| `pitches` | `PitchLog[]` — csak outdoor multi-pitch |
| `orderIndex` | Sorrend |
| `deleted` | Soft delete (parent cascade soft) |

**Egy `AscentAttempt` sor = egy út / probléma ebben a sessionben** (nem egy-egy „go"). Aki ugyanazt
az utat egy alkalommal többször mászta, **egy** sort vesz fel, és az `attemptCount`-tal jelzi a
próbák számát — nem több közel azonos sort. Ez a felhasználói workflow-döntés (a per-go modell
elvetve: telefonon, a szikla alatt egy projektútra 6 sort felvenni kezelhetetlen).

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

**MET (bruttó, a [Compendium of Physical Activities](https://pacompendium.com) — Ainsworth et al. 2011 — sziklamászás-kódjaihoz igazítva: „ascending, high difficulty" ≈ 7.5; „low-to-moderate" ≈ 5.8; „rappelling" 5.0; állás / biztosítás ≈ 2.0):**

| | Bruttó MET |
|---|---|
| Aktív boulder | 8.0 |
| Aktív kötél (elöl) | 7.0 |
| Aktív kötél másod | \(7.0 \times 0.8\) |
| Rest / üresjárat / biztosítás a földön | **2.0** |

**Nettó MET-számítás:** minden zóna `(bruttó MET − 1)` értéken számol (`RESTING_MET = 1.0`, az ACSM
nettó-energia konvenció). Ez azért kell, mert a mászás-kcal a [[Tápérték kalkulátor]]
`activityExtraKcal` összegébe megy, ami a napi **TDEE fölé adódik** — a TDEE viszont a 24 órás
nyugalmi anyagcserét (RMR ≈ 1 MET) már tartalmazza. Bruttó MET-tel egy hosszú, sok
biztosítással / szikla alatti pihenéssel töltött session ~1 MET-nyit dupláz a teljes hosszán; a
rest zóna (bruttó 2.0 → **nettó 1.0**) az, ami eddig meglepően nagynak tűnt.

**Szándékos kettős szorzás másodmászónál:** a 80%-os aktív idő **és** a 80%-os MET **egyszerre** érvényesül (≈0.64× a vezető energiaköltségéhez képest). Ez **nem** hiba: a két tényező két különböző hatást fejez ki — az aktív idő csökkenése azt modellezi, hogy a másodmászó nem rak/tisztít biztosítást (gyorsabban halad), a MET csökkenése pedig azt, hogy a mozgás per-másodperc kevésbé megterhelő (nincs anyag cipelése / helyezése közben). A két tényező összeszorzása szándékos modellezési döntés, nem ugyanannak a jelenségnek a duplikált leszámítolása.

`pumpRating` szorzó az **aktív** MET-re (lineáris a megadott pontok között):

| Rating | Szorzó |
|---|---|
| 1 | 0.8 |
| 3 | 1.0 |
| 5 | 1.3 |

Hiányzó `pumpRating` → szorzó **1.0**.

Testsúly \(m\): [[Profile]] aktuális kg — **nem** fagyasztódik. TRAD: \(m_{\text{eff}} = m + 6\) (hardver) az **aktív** kötél ágon; rest ágon marad \(m\).

\[\text{kcal} = \max(0,\; \text{MET}_{\text{active}} \times \text{pump} - 1) \times m_{\text{eff}} \times \frac{t_{\text{activeMin}}}{60} + (2.0 - 1) \times m \times \frac{t_{\text{restMin}}}{60}\]

- A session **nem tárol** SSOT `calculatedCalories` mezőt (mint [[Úszás napló]] / [[Edzésnapló]]); a [[Tápérték kalkulátor]] utility számol.
- UI élő előnézet ugyanazzal a pure TS képlettel; szerver opcionális paritás.

**Duration fallback** (ha hiányzik / érvénytelen `totalSessionDurationMinutes`). A „kísérletek száma" itt a **naplózott `AscentAttempt` sorok darabszáma** a sessionben (**nem** a `Σ attemptCount`, ami az egyes problémákon/utakon belüli próbákat számolja). Az `attemptCount` önálló, tájékoztató mező az attempt-soron: a Volumen- és a sikerarány-statisztika is **attempt-soronként** számol és **nem szoroz** vele, és a duration fallbackba sem megy — de a statisztikai nézetek megjeleníthetik (pl. „N redpoint-próba"):

- Boulder: \(\text{naplózott attempt sorok száma} \times 5\) perc  
- Kötél: \(\text{naplózott attempt sorok száma} \times 15\) perc  

#### Volumen (statisztika)

\(I_{\text{grade}}\) itt **kísérletenkénti** érték (minden `AscentAttempt` a saját `absoluteDifficultyIndex`-ét viszi), tehát a session-szintű Volume a kísérletek feletti **összeg**, nem egyetlen session-szintű grade-del szorzás:

- Kötél: \(\text{Volume} = \sum_{\text{sikeres kísérletek}} \text{mászott méter}_i \times I_{\text{grade},i}\) (a „mászott méter” kísérletenként: `lengthInMeters`, vagy a pitch-ek összege multi-pitchnél)
- Boulder: 1 sikeres kísérlet ≡ **4 m**; \(\text{Volume} = \sum_{\text{sikeres kísérletek}} 4 \times I_{\text{grade},i}\)

A Volumen **edzésterhelési mutató, nem kalória és nem megmászott méter**; nincs mértékegysége (relatív pontszám), ezért nagy számok is normálisak. A felületen „Mászási volumen" címkével jelenik meg (nem csak „V" / „volumen"), és a Statisztika képernyőn egy súgó (ⓘ) gomb elmondja, mit jelent (`WORKOUT.CLIMBING.STATS_PAGE.VOLUME_HELP_*`). A session-szerkesztő élő előnézetében `~kcal · volumen N` formában (a „volumen" szó kiírva, nem „V").

#### Statisztikák

Max grade kontextusonként (a legnehezebb **sikeres** kísérlet); összes Volume; sikerarány-bontás (Onsight / Flash / Redpoint / sikertelen — a rögzített `ascentStyle` nélküli sikeres kísérlet redpointként számít); grade piramis (30 / 90 / 365 nap ablak; a többi mutató all-time). `computeClimbingStats` (`climbing-stats.ts`). A „Mászási volumen · mind a 4 kontextus" összesített sor mellett súgó (ⓘ) gomb (`app-help-button`).

#### Soft delete / offline

Minden mászó entitás: soft delete ([[Backend-offline first]]). Nested session + attempts **egy** POST/PUT. Élő pipálás + utólagos mentés; a draft-perzisztálás (app-kill utáni helyreállítás) tervezett — `backlog/021-climbing-folyamatban-levo-session-draft-perzisztalasa-app-kill-t.md`.

**Nincs:** gear wear / kötél-leltár; mikro pihenő-stopper; térképnézet / fotó (a `crag.latitude` / `longitude` oszlop létezik, a térkép-UI nincs).

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Mászónapló hub → 4 csempe. A [[Kezdőlap]] „Új mászás" gyorsgombja
  (`edzes.maszonaplo`) is ide, a hubra visz (a kontextust ott választja a user).
- 1-tap chip-ek, grade pre-parser, legutóbbi terem/helyszín előtöltés.
- Sikeres kísérletnél a **Stílus** választó mellett súgó (ⓘ) gomb — felugró magyarázat az onsight / flash / redpoint jelentéséről és arról, miért választható egyszerre csak egy (mind a 4 kontextus napló-formban, `app-help-button`).
- **Mászótársak** combobox (mind a 4 kontextus napló-formban, `app-partner-combobox`): üres mezőnél a korábbi társak tap-elhető chip-ként; gépelésre szűrt lista + „+ Hozzáadás: »…«" új névhez; a felvett társak chip-jei törölhetők.
- Kísérlet-jegyzet: egyetlen **többsoros, auto-grow** mező. Sikernél „Jegyzet"; sikertelennél „Jegyzet / hol akadt el?" címkével + promttal (nincs külön „Hol akadt el" input).
- „Kísérlet hozzáadása" út / probléma **select**: a `Route` / `BoulderProblem` / `IndoorRoute` opciók a `topoNumber` (topó-sorszám) szerint, **természetes alfanumerikus** rendezésben (`2` < `5/a` < `5/b` < `10`); sorszám nélküli utak a lista végén, név szerint. A meglévő sorszám az opció-címke elé kerül (`12 · Sárga áthajlás (6b)`). Kliensoldali rendezés (`shared/natural-sort.ts`); részletek: [[Outdoor köteles admin]] / [[Outdoor boulder admin]] / [[Indoor köteles admin]].
- Minden kísérlet **önálló kártya** (`.attempt-card`, mind a 4 kontextus napló-formban): térköz + keret + lekerekítés, a bal élen **színsáv** a sikerállapothoz (zöld = sikeres, piros = sikertelen), kiemelt kártyafejléc („N. kísérlet" + siker-toggle).
- **„Új kísérlet" gomb** a kísérlet-szakasz fejlécében és — ha már van legalább 1 kísérlet — **a lista alján is** (mind a 4 kontextus); hozzáadás után a nézet az új kártyához görget (`naplo/scroll-to-last-attempt.ts`).
- **Fekvés (`aspect`)** — a szektor / út égtáj-orientációja **8 irányú égtáj-enum** (`N`/`NE`/`E`/`SE`/`S`/`SW`/`W`/`NW`; üres = ismeretlen), **vizuális választóval** (`app-aspect-picker`): négyzet kerületén a 8 irány, É felül, egy tap; a kijelölt irányra újra tap → törlés. Felmászókönyv-fokból (iránytű) a `degreesToAspect` binnel (`shared/aspect.ts`, fixture: `shared/fixtures/aspect-degrees.json`, backend-paritás: `hu.bumler.lm2.common.AspectDirection`). Használat: **kizárólag a törzsadaton** — [[Outdoor boulder admin]] `Sector`, [[Outdoor köteles admin]] `Route`. A napló-form nem szerkeszti (a session-szintű `aspect` / `rockType` felülírás megszűnt — `backlog/084`); ha megjeleníti, a kísérlet szektorából / útjából / sziklájából származtatja.
- Per-kontextus session lista (a közös, szűrő-tabos listát a `backlog/022-...` jegy fedi).

### Megjegyzések

#### Tudatos korlát — egy ascent-style / sikeres kísérlet

Az `ascentStyle` **egyválasztós** (`ONSIGHT` \| `FLASH` \| `REDPOINT`), nem egymásra rakható
címkék halmaza. A három érték definíció szerint kizárja egymást: onsight = nulla előzetes infó,
flash = volt béta, redpoint = korábbi próbák után. Egy sikeres kísérletnek pontosan egy
minősítése van. Ha később a stílustól **független** „clean / no falls" jelzés kell, az önálló
mező lesz, nem az `ascentStyle` set-esítése. (Háttér: `backlog/archive/075-...`, súgószöveg: #071.)

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Hub dashboard; per-kontextus session listák; 4 kontextus route → gyerek napló screenek.
- Shared grade parser komponens (`shared/grade-input/`); climbing calorie + volume pure TS (`shared/climbing/` + `pages/workout/climbing/climbing-metrics.ts` / `climbing-stats.ts`).
- Mászótárs combobox: `shared/partner-combobox/` (presentational, nincs injektált repo); a javaslatlista a `ClimbingSessionRepository.partnerSuggestions` derived signal (élő sessionök `climbingPartners` értékei, gyakoriság + recency szerint).
- Draft: jelenleg csak in-memory form-state; perzisztálás tervezett (`backlog/021-...`).

#### Backend-offline

Olvasás/írás helyi store; mutációk outbox + kliens UUID; soft delete synchelhető; draft helyi. A mászótárs-javaslatok forrása a helyi `climbing_session` tábla, így a combobox Full-offline is teljes értékű. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

A `#77` (`AscentAttempt.failurePoint` → `notes` beolvasztás) egy még nem frissített telefonon beragaszthatott egy `ClimbingSession` POST-ot (a payload a törölt mezőt hordozta). `backlog/080`: `OUTBOX_PAYLOAD_SCHEMA_VERSION` v2 → v3 `ClimbingSession:2` migrátor-lépéssel kiszedi a `failurePoint`-ot minden `attempt`-ből (nem üres szöveget a `#77` szabálya szerint a `notes`-ba forgatva), a backend pedig az ismeretlen mezőt már úgyis eldobná (`FAIL_ON_UNKNOWN_PROPERTIES` off) — lásd [[Backend-offline first]] §7.

### Backend

- OpenAPI: `POST` / `PUT` / `GET` / `DELETE /api/climbing/sessions` (+ `-item`). **Egy flat `climbing_session` tábla** nullable kontextus-mezőkkel; a diszkriminátor a `locationType` + `discipline` pár.
- Master külön, per-entitás endpoint: `/api/climbing/{gyms,gym-color-bands,indoor-routes,crags,sectors,routes,boulder-problems}` — `Gym` + `GymColorBand` + `IndoorRoute` (`V22`), `Crag` + `Sector` + `Route` + `BoulderProblem` (`V23`). A `route` / `boulder_problem` / `indoor_route` táblákon opcionális `topo_number text CHECK (char_length ≤ 32)` (`V33`) — a szerver tárolja, de **soha nem rendez rá** (a lista-végpontok név szerint maradnak); a topó szerinti rendezés kliensoldali (`shared/natural-sort.ts`, `shared/fixtures/natural-sort.json`).
- `sector.default_aspect` / `route.aspect`: 8 irányú égtáj-token (`N`,`NE`,`E`,`SE`,`S`,`SW`,`W`,`NW`; `NULL` = ismeretlen), OpenAPI `enum` + DB CHECK a `V34__climbing_aspect_compass_enum.sql`-ből (a korábbi szabad szöveget best-effort megfeleltette, a felismerhetetlent NULL-ra állította — lossy, elfogadott). A token szövegoszlopban marad, a `sync_changes` view érintetlen. A `climbing_session.aspect` / `rock_type` oszlop a `V37__climbing_sector_to_attempt.sql`-lel **megszűnt** (`backlog/084`) — a `sector_id` / `sector_name` az `ascent_attempt`-re költözött (valós FK + snapshot), a meglévő session-szintű szektor minden kísérletére lement.
- `sector.default_length_in_meters double precision CHECK (> 0 vagy NULL)` a `V38__sector_default_length.sql`-ből (`backlog/088`) — a köteles napló úthossz-fallbackja (`Route.lengthInMeters` → ez → kézi). `sync_changes` érintetlen. Outbox payload-séma `v5 → v6` (`Sector` mezőalak; identity).
- UUID kliens; soft delete; nested session body (`ClimbingSessionService.saveTree`, `NestedChildResolver`).
- A szerver **sosem** számol / validál grade indexet vagy kcal-t: az `absoluteDifficultyIndex` és a `guidebookGrade` verbatim tárolódik. Szerveroldali paritás tervezett — `backlog/024-climbing-grade-matrix-kozos-generalt-json-asset-backend-index-uj.md`.

### Nyitott kérdések

Nincs nyitott kérdés.

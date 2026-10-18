---
verifikalva: 2026-10-18
verifikalt_commit: 88d246b
---

# Edzésnapló

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Edzés]] |
| **Kapcsolódó** | [[Gyakorlat]], [[Heti terv]], [[Nyújtás]], [[Tápérték kalkulátor]], [[Profile]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Jelenlegi működés

Elvégzett konditermi / súlyzós / HIIT / mászó-kiegészítő (hangboard, pinch, campus, izometrikus) sessionök rögzítése és élő követése az [[Edzés]] tab alatt. Egy naplóbejegyzés = egy komplett session. A nap `activityExtraKcal` hozzájárulása a [[Tápérték kalkulátor]] univerzális MET képletével számolódik.

**Nem ide tartozik:** fal-/sziklamászás ([[Mászónapló]]), [[Úszás napló]], [[Biciklizés napló]], [[Lépésszám követés]] — külön modulok. A gyakorlat törzsadat: [[Gyakorlat]]; a tervezett rutinok: [[Heti terv]].

Feature flag: az Edzésnapló **önállóan** is működik [[Heti terv]] nélkül (ad-hoc indítás, utólagos rögzítés).

### Funkcionális leírás

#### Határok

| Modul | Szerep |
|---|---|
| [[Gyakorlat]] | Mit csinálhatsz? (katalógus / törzsadat) |
| [[Heti terv]] | Mit kéne csinálnod? (sablon / heti rutin) |
| **Edzésnapló** | Mit csináltál ténylegesen? (élő + utólagos session) |

Egy napon **több** session engedélyezett (pl. reggel hangboard, este súlyzós); mindegyik külön beleszámít az aznapi `activityExtraKcal`-ba.

Fejlesztési sorrend (függőség): [[Gyakorlat]] → **Edzésnapló** → [[Heti terv]].

#### Entitás — `WorkoutSession`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens generálja létrehozáskor |
| `date` | Naptári dátum (kliens TZ); aznapi `activityExtraKcal` összegzéshez |
| `startTime` | Opcionális `LocalTime`; élő / ismert kezdés |
| `endTime` | Opcionális `LocalTime` |
| `durationMinutes` | Egész, `> 0` ha van kalóriaág. Alapértelmezés: `endTime − startTime` (perc), vagy stopper; **manuálisan felülírható**. Ha hiányzik: becslés — lásd Kalória. |
| `workoutType` | Kötelező enum: `GENERAL_WEIGHTS` \| `HIIT_CIRCUIT`. Alapértelmezett: `GENERAL_WEIGHTS`. Session létrehozásakor választott; **mentés után is módosítható**. |
| `title` | Opcionális szöveg |
| `notes` | Opcionális szöveg |
| `location` | Opcionális enum: `HOME_GYM` \| `COMMERCIAL_GYM` \| `OUTDOOR_PARK` |
| `planId` | Opcionális UUID → [[Heti terv]] **`WorkoutPlan.id`** (statikus sablon; nullable = ad-hoc) |
| `roundsCount` | Opcionális; `HIIT_CIRCUIT` UI körök száma (`≥ 1`) |
| `deleted` | Soft delete (`false` default) |
| `exercises` | `WorkoutExerciseEntry[]` (nested) |
| `createdAt` / `updatedAt` | Audit |

**Egy napló = egy session.** A sessionnek **egy** fő `workoutType`-ja van; vegyes blokkok (pl. súlyzós végén HIIT-szerű kör) `supersetGroup`-pal csoportosíthatók, nem külön session-típusként.

CRUD: lista (`deleted = false`), létrehozás, szerkesztés, törlés (megerősítéssel). **Törlés:** szerver / szinkronizált entitás → **soft delete** (`deleted`); multi-device synchez. Ha a session még sosem szinkronizált (helyi draft / pending outbox) → helyi **hard remove** + outbox tisztítás. Múltbeli sessionök teljes terjedelmükben szerkeszthetők.

#### Entitás — `WorkoutExerciseEntry`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `exerciseId` | Opcionális UUID → [[Gyakorlat]] master (ad-hoc esetén null) |
| `exerciseName` | **Snapshot** — kötelező; a mentéskori név (master átnevezés / törlés nem írja felül) |
| `exerciseCategory` | **Snapshot** — `ExerciseCategory` enum ([[Gyakorlat]]). `text` + `workout_exercise_entry_exercise_category_check` CHECK a 11 értékre. A `V35` (backlog/065) a régi snapshot-értékeket megfeleltette: `ARMS` → `BICEPS`, `CORE` → `ABS` (lossy — [[Gyakorlat]] migrációs jegyzet). |
| `exerciseKind` | **Snapshot** — `ExerciseKind` enum ([[Gyakorlat]]); szett UI mezők ehhez igazodnak |
| `orderIndex` | Egész; drag & drop sorrend |
| `supersetGroup` | Opcionális egész; azonos érték = vizuális szuperszett / kör-csoport (nincs bonyolult per-szett szuperszett UI) |
| `sets` | `WorkoutSetEntry[]` |

Egy master gyakorlat **többször** szerepelhet egy sessionben (külön entry-k, pl. bemelegítő húzódzkodás + munka húzódzkodás).

**Ad-hoc:** a pickerben új név → azonnali entry snapshot névvel; opcionálisan mentés a [[Gyakorlat]] katalógusba.

#### Entitás — `WorkoutSetEntry`

| Mező | Típus / szabály |
|---|---|
| `id` | UUID, kliens |
| `setNumber` | Egész (`≥ 1`) |
| `setType` | Enum: `WARMUP` \| `WORKING` \| `DROPSET` \| `REST_PAUSE` \| `FAILURE` |
| `reps` | Opcionális egész; ismétléses gyakorlatoknál |
| `weightKg` | Opcionális szám; **csak kg**. Saját testsúly: `0`; súlyozott: `+kg`; rásegítés (gumi/csiga): **negatív** kg |
| `holdTimeSeconds` | Opcionális egész; izometrikus / hangboard / időalapú / kardió idő |
| `edgeSizeMm` | Opcionális egész; fogásméret mm (pl. 20 mm léc, pinch) |
| `distanceMeters` | Opcionális egész `≥ 0`; kardió táv méterben (pl. 1000 m evezés) |
| `restTimeSeconds` | Opcionális egész; pihenő cél / utolsó mért pihenő |
| `side` | Opcionális enum `LEFT` \| `RIGHT` (`backlog/134`) — egyoldali szett (egykezes húzódzkodás negatív, lock-off, egykezes evezés); `null` = mindkét kéz / nem releváns. `text` + CHECK (`V49`). |
| `rpe` | Opcionális szám **6–10, 0,5-ös lépésben** (`backlog/135`) — a szett tényleges megerőltetése. `numeric(3,1)` + CHECK (`V49`); a szerver a lépésközön kívüli / tartományon kívüli értéket 400 `VALIDATION`-nel utasítja el (`WorkoutSetRules.validRpe`). |
| `isCompleted` | Boolean; élő módban pipa; kihagyott: `false` vagy törlés |
| `orderIndex` | Egész (szettek sorrendje) |

**Mértékegység:** kizárólag kg, mm, m (nincs lb / mérföld). Százalékos 1RM-mátrix **nincs** a naplóban — mindig abszolút kg mentődik.

**Mezőválasztás `exerciseKind` szerint** (snapshot / [[Gyakorlat]]):

| `ExerciseKind` | Látható szett-mezők |
|---|---|
| `WEIGHTED_REPS` | `reps`, `weightKg` |
| `BODYWEIGHT_REPS` | `reps`, opcionális `weightKg` |
| `ISOMETRIC_TIME` | `holdTimeSeconds`, opcionális `weightKg` |
| `HANGBOARD_PINCH` | `edgeSizeMm`, `holdTimeSeconds`, opcionális `weightKg` |
| `CARDIO_TIME_DIST` | `holdTimeSeconds`, `distanceMeters` |

`distanceMeters` / `edgeSizeMm` **nem** része a kalóriának; a `reps` / `holdTimeSeconds` / `rpe` és a gyakorlat `exerciseCategory` / `exerciseKind`-ja igen (`backlog/173`, lásd „Kalória”).

#### Volumen és PR

\[\text{Volume}_{\text{exercise}} = \sum (\text{reps} \times \text{weightKg})\]

csak `WORKING`, `DROPSET`, `FAILURE` szettekre. **`WARMUP` és `REST_PAUSE` kizárva** a volumemből és a PR-detektálásból. Warmup beleszámít a session időtartamába és kalóriájába (terhelési időként és regenerációs ablakként; RPE-szorzót nem kap).

**1RM becslés (Epley)** — csak UI / PR, nem tárolt kötelező mező:

\[1RM = w \times \left(1 + \frac{r}{30}\right)\]

érvényes, ha \(r \in [1, 12]\).

PR típusok (badge a szett mellett): számított **1RM** megdöntés; **max súly**; **max volumen** (szett vagy gyakorlat aggregát).

#### Kalória (kanonikus — [[Tápérték kalkulátor]])

Minden MET **bruttó**, és **nettóként** (`MET − 1`, `shared/net-met.ts`, `backlog/164`) számolódik; \(T\) = `durationMinutes` (lásd lent), \(m\) = testsúly.

**`HIIT_CIRCUIT`**, valamint **szett nélküli `GENERAL_WEIGHTS`** session — fix MET a teljes időre:

\[\text{kcal} = (\text{MET}(\text{workoutType}) - 1) \times m \times \frac{T}{60}\]

| `workoutType` | MET (bruttó) |
|---|---|
| `GENERAL_WEIGHTS` (szett nélkül) | 4.0 |
| `HIIT_CIRCUIT` | 8.0 (definíció szerint sűrű — a rövid pihenők benne vannak) |

**Szettes `GENERAL_WEIGHTS` session** (`backlog/173`, `workout-metrics.ts`: `sessionKcal`) — terhelési idő + pihenő, a [[Mászónapló]] pihenő-modelljével (`backlog/171`) azonos szerkezetben:

1. **Terhelési idő / szett** (`setLoadSeconds`): `holdTimeSeconds` (× `reps`, ha az is van — repeaterek), különben `reps × 3 s` (≈ 1 s koncentrikus + 2 s excentrikus), különben 30 s (hangboardon 10 s). Σ terhelés legfeljebb \(T\).
2. **Szett alatti MET** a gyakorlat izomtömeg-osztálya szerint (`muscleClass`), szorozva az **RPE-szorzóval** (`rpeFactor`): \(1 + (\text{RPE} - 8) \times 0.05\) (RPE 6 → 0.9, 10 → 1.1); RPE nélkül és `WARMUP` szettnél 1.
3. **Pihenő** \(= T - \Sigma\text{terhelés}\). Minden szett egy **2,5 perces regenerációs ablakot** nyit a saját osztálya emelt MET-jén; az ablakokon túli pihenő **tétlen 1.5 MET** (állás / beszélgetés a teremben). Ha az ablakok összege a pihenőnél nagyobb, arányosan rövidülnek.

| Osztály | `exerciseCategory` / `exerciseKind` | Szett alatt | Regenerációs ablak |
|---|---|---|---|
| Nagy | `LEGS`, `BACK`, `FULL_BODY`, `HIPS` | 8.0 | 3.0 |
| Közepes | `CHEST`, `SHOULDERS`, `LOWER_BACK` | 6.0 | 2.5 |
| Kicsi | `BICEPS`, `TRICEPS`, `ABS`, `OBLIQUES`, `NECK`, `FOREARM_FINGERS`; **minden `HANGBOARD_PINCH`** | 5.0 | 2.5 |
| Kardió | `CARDIO_TIME_DIST` | 7.0 | 3.0 |
| Tétlen (ablakon túl) | — | — | 1.5 |

\[\text{kcal} = \frac{m}{60}\Big[\sum_{\text{szett}} t_{\text{terh}} \cdot (\text{MET}_{\text{szett}} \cdot \text{RPE-szorzó} - 1) + t_{\text{pihenő}} \cdot 0.5 + \sum_{\text{szett}} 2.5 \cdot s \cdot (\text{MET}_{\text{ablak}} - 1.5)\Big],\quad s = \min\Big(1, \frac{t_{\text{pihenő}}}{2.5 \cdot \text{szettszám}}\Big)\]

**Források / indoklás:** az O₂-fogyasztás az aktív izomtömeggel és a mechanikai munkával skálázódik (az erőedzés-EE legerősebb prediktora a testtömeg és a megmozgatott volumen — Lytle et al., MSSE 2019); rövidebb pihenő → magasabb percenkénti EE (Ratamess et al. 2007), a pulzus / VO₂ egy szett után ~2–3 perc alatt visszaáll. A tiszta VO₂-mérés alulbecsüli a szett anaerob részét (C. Scott), ezért bőkezű a szett alatti MET; a session-átlag így a Compendium (Ainsworth 2011 / Herrmann 2024) 3.5 („multiple exercises, 8–15 reps”) – 6.0 („vigorous”) sávjába esik (plauzibilitási teszt). Az RPE itt RIR-alapú (Zourdos 2016), a kudarchoz közelséget méri — ezért csak kis szorzó. Az EPOC (Schuenke 2002; LaForgia 2006) a session-EE ~5–15%-a, nem modellezett.

**Példák (70 kg):** 60 perc, 18 × 10 ismétléses lábszett: 9 perc × nettó 7 + 51 perc × 0.5 + 45 perc × 1.5 = 156 nettó MET-perc → **≈ 182 kcal** (≈ 3.6 bruttó MET-átlag; a régi fix 5.0-val 280). Ugyanez bicepszre ≈ 124 kcal; 45 perc hangboard (10 × 10 s függés) ≈ 62 kcal (régen 210); 90 perc / 12 szett beszélgetős ≈ 151 kcal (régen 420) — kevesebb, mint egy 45 perces / 25 szettes sűrű session (≈ 178 kcal).

- \(m\): aktuális testsúly kg a [[Profile]]-ból — **nem** fagyasztódik a sessionbe; a kcal élőben számolódik, így a modellváltás a múltbeli napokra is érvényes.
- A session **nem tárol** `activityExtraKcal` / testsúly mezőt.
- **Nettó MET** (`backlog/164`): a bruttó (Compendium-)értékekből a nyugalmi 1 MET levonódik, mert azt a `maintenanceKcal = BMR × 1.2` már fedezi — így edzésóránként ~`1 × m` kcal nem számolódik kétszer. Lásd [[Tápérték kalkulátor]].
- **Hiányzó időtartam fallback:** ha nincs megadható / számítható `durationMinutes`, becslés: \(\text{szettek száma} \times 3\) perc (kcal / előnézet); a mentett `durationMinutes` felülírható kézzel. A 2,5 perces ablak + egy tipikus szett ≈ 3 perc, így fallback-időnél a pihenő nem ritkul.
- Az élő (`active-workout`) és az utólagos form előnézete, valamint a lista ugyanazt a `sessionKcal`-t hívja; minden élő (nem törölt) szett számít, a pipától függetlenül.

#### Élő vs utólagos mód

- **Élő:** Active Workout View stopperrel; szett pipa → Rest Timer indul; haptic + hang a lejáratkor. Default pihenő: [[Gyakorlat]] katalógus (`restTimeSeconds` default), UI-n felülírható.
- **Draft:** aktív session állapota helyi store-ban (app kill / váltás után helyreáll).
- **Utólagos:** ugyanaz a nested modell; tetszőleges múltbeli `date` / idő.

#### Kapcsolat [[Heti terv]]

- „Edzés indítása a tervből”: új session a `WorkoutPlan` sablonból; előtöltés (`rowsFromPlan`); `planId = WorkoutPlan.id`. Tartományos cél-ismétlés (`8–12`, [[Heti terv]]) a határok átlagával, felfelé kerekítve töltődik; a tartomány display-only `repsTarget`-ként a helyi draftban is megmarad és „cél: …” segédszövegként látszik (a session szettjén nincs tartomány-mező). Belépői (mind `?planId=`-vel nyitják az élő nézetet): a [[Heti terv]] mai napsorának „Edzés indítása” gombja (a mára előrejelzett sablonnal), és az Edzésnapló dashboard **terv-gyorsindítója** (lásd lent).
- **Terv-gyorsindító (`backlog/054`, `backlog/144`, `plan-quick-start.component.ts`):** az Edzésnapló lista tetején, ha van aktív sablon **és nincs** folyamatban lévő piszkozat (akkor a „Folytatás” gomb látszik helyette — piszkozat mellett a `planId` úgysem érvényesülne). A [[Heti terv]] **rotációs előrejelzéséből** (`training-forecast.ts`) számol, így ugyanazt mondja, mint a Heti terv mai sora. Tartalma felülről:
  1. **A mai nap** — az előrejelzés mai napja szerint egy sor:
     - **„Mai javaslat”** + sablonnév + egy tapos „Indítás”; alatta „kézi beállítás” (a napot kézzel felülírtad), különben „utoljára: <dátum>” / „még nem volt”. Ha a javasolt sablon ujjgyakorlatos és holnapra mászás van tervezve: rotációs javaslatnál (minden aktív sablon ujjas) „Holnap mászás, de minden aktív sablonban van ujjgyakorlat — ma inkább könnyebben.”, kézi felülírásnál „Ez a sablon ujjgyakorlatot tartalmaz — a holnapi mászás miatt nem javasolt.”
     - **„Mai edzés kész”** (+ a sablon neve) — ma már van rögzített edzés; aznapra nincs újabb javaslat.
     - **„Mászónap”** — ma rögzített vagy tervezett mászás; „legfeljebb rövid törzs / prehab edzés javasolt”.
     - **„Pihenőnap”** — „N terhelő nap után” (a terhelő blokk elérte a limitet), „kézi beállítás”, vagy „nincs rotációban lévő aktív sablon” (minden aktív sablon rotáción kívüli, `backlog/165`).
  2. **„Következő”** — ha ma nincs indítható javaslat: a következő előrejelzett edzés sablonja, napja és dátuma (14 napon belül).
  3. **„Terv indítása…”** — action sheet minden aktív sablonnal, a rotáción kívüliekkel is ([[Heti terv]] `inRotation`, `backlog/165`) (`goalLabel`-csoportok ábécérendben „Csoport · Név” formában, a címke nélküliek a végén); tapra indul — az előrejelzéstől függetlenül bármelyik sablon indítható. Utánuk az aktív nyújtó sablonok „Nyújtás · <név>” formában ([[Nyújtás]], `backlog/169`) — ezek a nyújtó élő nézetet nyitják. Ha a mai nap nyújtó felülírás ([[Heti terv]] `STRETCH`), a mai sor „Nyújtás: <sablon>” és egy „Nyújtás indítása” gomb.

  A „ma” a `CurrentDayService` jelzése (`core/config/current-day.service.ts`): előtérbe kerüléskor és percenként újraolvasva, így a nyitva hagyott gyorsindító éjfélkor az új napra vált.

#### Statisztika

Jelenleg él:

- **Ghost values** az utólagos szerkesztőben (`workout-session-edit`) — legutóbbi alkalom ugyanarra a gyakorlatra, a csúcs-szettel (pl. „80 kg × 8”).
- **„Legutóbb” sor az élő `active-workout` nézetben** (`backlog/131`) — a gyakorlat neve alatt a legutóbbi alkalom dátuma és **összes** számolt (WORKING / DROPSET / FAILURE) szettje: azonos szettek összevonva („Legutóbb (2026-09-28): 3 × 5 @ 22.5 kg”), eltérőek ` · `-tal felsorolva („5 @ 22.5 kg · 4 @ 22.5 kg”); tartásidő „10 s”, 0 kg nem jelenik meg, rásegítés negatív kg-ként, egyoldali szett ◀ / ▶ előtaggal („◀ 2 @ -15 kg · ▶ 2 @ -15 kg”, `backlog/134`) (`workout-metrics.ts`: `lastPerformance`, `formatSetSummary`). Mellette a **PR badge** (1RM / max súly / max volumen megdöntés).
- **Progresszió-javaslat („double progression”, `backlog/131`)** az élő nézetben: ha a gyakorlat WORKING szettjeinek a sablonból tartomány-célja van (pl. „3–5”), és legutóbb **minden** WORKING szett elérte a tartomány felső határát, súllyal, akkor a gyakorlat alatt egy „Javaslat: <legutóbbi legnagyobb munkasúly + 2,5> kg” gomb jelenik meg (`progressionSuggestion`, lépés `PROGRESSION_STEP_KG = 2.5`). Rásegítésnél (negatív kg) ez 2,5 kg-mal kevesebb rásegítés, legfeljebb 0-ig. Tapra a még nem kipipált WORKING szettek súlyát erre állítja; ha már mind ezen áll, a gomb eltűnik. Tartomány-cél nélkül (ad-hoc / fix cél), WORKING szett nélkül, ha egy szett alulmaradt, vagy ha egy munkaszett **RPE 10**-zel lett rögzítve (`backlog/135`, `PROGRESSION_MAX_RPE`), nincs javaslat. Csak súlyt mutató kindnál (`weightKg` mező). **Oldalanként** (`backlog/134`): a mai munkaszettek kéz-csoportjai (mindkét kéz / bal / jobb) külön kapnak javaslatot a legutóbbi alkalom ugyanazon kezes munkaszettjei alapján („◀ Javaslat: -17.5 kg”), és a gomb csak az adott kéz nyitott munkaszettjeit állítja.
- Session-szintű **volumen-előnézet** (`Σ reps × weightKg` a WORKING/DROPSET/FAILURE szetteken).

Tervezett (`backlog/055-edzesnaplo-statisztika-felulet-1rm-max-suly-gorbe-heti-volumen-i.md`): per-gyakorlat 1RM / max súly fejlődési görbe, heti volumen aggregát, izomcsoport-eloszlás.

### UI/UX elvárások

- Belépés: [[Edzés]] tab → Edzésnapló (dashboard / lista).
- Flow: Dashboard → Új edzés / Mai javaslat / Terv indítása → Active Workout (vagy utólagos form) → gyakorlat modal → szettek → Befejezés → summary / dashboard frissülés.
- **Csatolt nyújtás (`backlog/170`):** ha az edzés sablonjának van élő csatolt nyújtó sablonja ([[Heti terv]] `stretchPlanId`), a „Befejezés” **mentése után** felugrik: „Nyújtás: <név>” / „Az edzés elmentve. Indulhat a nyújtás (~N perc)?” — **Indítás** / **Később**. Indításkor a lista oldalra lép vissza, onnan nyílik a [[Nyújtás]] élő nézete a sablonnal és ezzel az edzéssel (`workoutSessionId`), így a vissza gomb nem a befejezett edzésre visz; ha van félbehagyott nyújtás, előbb az elvetésére kérdez. Az edzés mindkét esetben mentve van. Ad-hoc edzés után nincs felajánlás.
- **„Nyújtás az edzés után” kártya (`backlog/170`):** a lista tetején mindaddig, amíg egy mai, sablonos edzéshez tartozó csatolt nyújtásból nincs hozzá kötött nyújtó session: „Nyújtás az edzés után: <név>” + **Indítás** + ×. Az × az adott edzés kártyáját aznapra elrejti (eszköz-lokális, `StretchOfferDismissalsService`); hogy van-e még teendő, azt a `StretchSession.workoutSessionId` dönti el (`pages/workout/stretch/linked-stretch.ts`).
- **Lista:** időrend (újabb nap elöl); soron: dátum, cím vagy típus, időtartam, megjelenített kcal (utility). A nyújtó sessionök ([[Nyújtás]], `backlog/169`) ugyanebben a listában, „Nyújtás · <sablon>” sorral; a lista CTA-i között „Új nyújtás” (félbehagyott nyújtásnál „Nyújtás folytatása”). A lista tetején a [[Heti terv]] **terhelés-figyelmeztetései** (`backlog/138`: nincs pihenőnap / sok ujjterhelés / ma már másztál / sok mászás a héten) nem blokkoló sávként — az edzés indítása ettől függetlenül szabad.
- **Gyakorlat picker:** `ion-searchbar` + `ExerciseCategory` chipek + Kedvencek; ad-hoc létrehozás. A `<ion-modal>`-ben megjelenő `app-exercise-picker` a modal **teljes magasságát** kitölti (`:host` a megosztott `ion-modal-host-fill` mixin — `shared/styles/_ion-modal-host.scss`, `backlog/117` — flex-oszlop, `position: absolute; inset: 0`), így a találati lista a teljes rendelkezésre álló teret használja, nem egy-két sorra zsugorodik. Ugyanezt a mintát használja az [[Étkezés]] tétel-szerkesztő modalja is.
- **Szettek:** gyakorlatonként egy szett-táblázat; `+ Új szett`; előző szett másolása; numerikus billentyűzet autofókusz. Az Active Workout gyors-növelő gombjai (`+2.5 kg` / `+5 kg` súlyos, `+1 ism.` repses gyakorlatnál) **szettenként egy kompakt sorban, a szett mezői alatt** vannak, így a megnövelt érték mindig látszik; a szett törlés (✕) a sor jobb szélén. Az utólagos formban nincsenek gyors-növelő gombok (az értéket úgyis begépeli a felhasználó).
- **Szett-táblázat elrendezése** (sablon-szerkesztő, utólagos form és Active Workout egyaránt, közös `shared/styles/_set-row.scss` mixin + `setGridColumns()` a `workout-fields.ts`-ben): gyakorlatonként **egyszer** egy oszlopfejléc (rövid mezőnév + mértékegység, pl. „Súly / kg”), alatta szettenként **egy sor** keretes, label nélküli inputokkal pontosan a saját oszlopuk alatt — a `kind` szerint 1–4 számoszlop, így ~360 px-en sem tördel. Az első oszlop a sorszám + a szett **jelvénye**: a szett-típus rövid betűje (M = Munka, B = Bemelegítő, D = Dropset, R = Rest-pause, K = Kifáradásig), egyoldali szettnél mellette ◀ (bal) / ▶ (jobb), és ha van RPE, alatta kicsiben a szám (pl. „M◀” / „8.5”). A jelvény tapja a **szett-beállítások popovert** nyitja (`set-options-popover.component.ts`, mindhárom szerkesztőben közös): teljes nevű típus (rádiógombok), Oldal (Mindkettő / Bal / Jobb szegmens), RPE (– / 6 … 10, 0,5-ös lépés; a sablon-szerkesztőben „Cél RPE”). Minden választás azonnal érvényesül; a popover érintésre a háttérben zárul. Szett-oszlop az oldalnak és az RPE-nek nincs (a ~360 px-es táblázat nem bírná).
- **Egyoldali szettek (`backlog/134`):** „+ Új szett” és „Előző másolása” egy egyoldali szett után **váltogatja** a kezet (bal → jobb → bal …), a mindkét kezes szett mindkét kezes marad; az új / másolt szett RPE-je üres (azt aznap kell rögzíteni). A meglévő session szerkesztése az oldalt és az RPE-t is megőrzi.
- **Sablonból indítva (`backlog/133`–`135`):** a sablon-gyakorlat megjegyzése (pl. „szék: 5”, „3–5 mp leengedés”) az Active Workout gyakorlat-neve alatt dőlt segédszövegként látszik (display-only, a draftban `planNotes`, a session nem tárolja); a cél-szettek oldala és cél-RPE-je a session szettjébe másolódik (a cél-RPE a tényleges RPE kezdőértéke). Active Workoutban a sor elején a „kész” pipa oszlop; ha a szett a sablonból tartomány-célt kapott, az ismétlés mező placeholdere a cél (pl. „8-12”).
- **Összecsukható gyakorlatok + kész-jelölés (`backlog/154`):** az Active Workoutban a gyakorlat-kártya fejlécére (név) tappolva a kártya törzse (szett-táblázat, javaslat, „+ Új szett”) összecsukódik / kinyílik; a fejléc elején chevron jelzi az állapotot, összecsukva a név alatt „3 / 4 szett” összesítő látszik a fajta / megjegyzés / „Legutóbb” sor helyett. Edzés indításakor minden gyakorlat nyitva van; a gyakorlat **utolsó nyitott szettjének** kipipálásakor automatikusan összecsukódik (pipa visszavétele nem nyitja ki). A kártya bal oldali színsávja a kész-állapotot mutatja (`workout-fields.ts`: `exerciseStatus`): **zöld** = minden szett kipipálva (a név mellett ✓ ikon is), **piros** = van még nyitott szett, **szürke** = nincs szett. Az összecsukott állapot a helyi piszkozatban (`collapsed`, display-only) megmarad, így „Folytatás” / app-újraindítás után visszaáll; a session payloadba nem kerül. Az utólagos formban és a sablon-szerkesztőben nincs (ott nincs kész-pipa).
- **Gyakorlat műveletei:** a gyakorlat-fejléc jobb szélén egy ⋮ gomb action sheetet nyit (Mozgatás felfelé / lefelé — az első/utolsó gyakorlatnál a nem értelmezett irány hiányzik —, `WEIGHTED_REPS` / `BODYWEIGHT_REPS` kindnál „Bemelegítés generálása”, Eltávolítás), hogy a gyakorlatnév ne törjön két sorba.
- **Bemelegítés generálása (`backlog/132`, ramping warm-up):** a gyakorlat **első WORKING szettjének** súlyából 3 `WARMUP` szettet szúr a szettlista elejére: 5 ism. × ~30%, 3 ism. × ~65%, 1 ism. × ~87%, 2,5 kg-ra kerekítve, 60 / 90 / 120 mp cél-pihenővel (`warmup-ramp.ts`: `rampWarmupSets`). A meglévő `WARMUP` szettek helyére kerülnek; az élő nézetben a már kipipált bemelegítők megmaradnak. **Rásegített (negatív kg) munkasúlynál** a mozgatott teher `testsúly + munkasúly` ([[Profile]] aktuális testsúly), a bemelegítők ennek hányadai, így nagyobb rásegítésként (negatívabb kg) mentődnek. Munkasúly nélkül (nincs / 0 kg) vagy rásegítésnél testsúly nélkül nem generál, hanem figyelmeztető toastot ad. Mindig abszolút kg mentődik — nincs %-mező. Mindhárom szerkesztőben (élő, utólagos, sablon) elérhető.
- Az utólagos form láblécében az időtartam / volumen / kcal előnézet külön, térközzel elválasztott tételek.
- **Thumb-zone:** szett-pipa és „Edzés befejezése” a képernyő alsó harmadában.
- **HIIT:** körök (`roundsCount`); kör másolás gombokkal.
- **Törlés:** megerősítő dialógus.
- Élő kcal előnézet (Profile `m` + szettek / MET + `durationMinutes` / becslés).

### Megjegyzések

- Nincs edzés közbeni %-os 1RM mátrix és nincs komplex per-szett szuperszett UI — a csoportosítás egyetlen `supersetGroup` egész.
- A szett-modell tartalmazza az `edgeSizeMm` + `holdTimeSeconds` (hangboard) és a `distanceMeters` (kardió) mezőket — az `edgeSizeMm` és a `distanceMeters` nem része a kalóriának, a `holdTimeSeconds` terhelési időként igen (`backlog/173`).

#### Tudatos korlát — becsült kalória, naplózott szettekből

- Az erőedzés-kalória becslés (~±30%): a szett alatti MET-re kevés a mért adat, a konstansok a Compendium session-sávjához vannak kalibrálva. A súly / volumen (`weightKg`) szándékosan nem tényező — a mozgatási táv (ROM) gyakorlatonként ismeretlen, és a testsúlyos / rásegített (negatív kg) szettek torzítanának.
- Csak a naplózott szett nyit regenerációs ablakot: egy hosszú sessionben a nem rögzített bemelegítés / gyakorlat kiesik, a pihenője tétlen szinten számolódik.
- Az izomtömeg-osztály a gyakorlat `exerciseCategory` snapshotjából jön; egy kategória nélküli / rosszul kategorizált gyakorlat a kategóriája szerinti osztályt kapja.
- Seed gyakorlatok: [[Gyakorlat]].
- Naplózható entitások törlése: egységes **soft delete** ([[Backend-offline first]]); nested mentés: egy session = egy payload.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyők: session lista/dashboard, élő Active Workout, utólagos create/edit, gyakorlat picker modal, delete confirm, summary.
- Nested model a store-ban; draft session SQLite / Ionic Storage.
- Rest timer + haptic; PR / volume / Epley pure TS utility.
- Shared MET / kcal: [[Tápérték kalkulátor]]; testsúly: [[Profile]].
- Ghost values (`workout-metrics.ts:ghostForExercise`): előző session ugyanarra `exerciseId` / név egyezésre — a `workout-session-edit` képernyőn jelenik meg.
- OpenAPI generált kliens; mutációk offline rétegen.
- Atomi mentés: teljes session + exercises + sets **egy** POST/PUT body.

#### Backend-offline

- Olvasás / írás helyi store-ból Backend-offline és Full-offline esetén is (élő edzés net nélkül is).
- Az élő nézet összecsukott / kész-állapota tisztán kliensoldali (helyi piszkozat + a szettek `isCompleted` pipája), net nélkül is ugyanígy működik; nincs outbox- vagy API-hatása.
- A lista terhelés-figyelmeztetései a helyi mászó- és edzésnapló-store-ból számolnak, Full-offline is.
- Create / update / delete → outbox (`OfflineQueueService`) + kliens UUID v4; sync: [[Szinkronizációs központ]].
- Kcal: mindig kliensoldali pure számítás; nincs kcal mező az entitáson; Étkezés / Tápérték store optimista frissítés.
- Draft aktív session nem feltétlenül outbox — helyi draft; „Befejezés” / mentés után outbox.
- Lásd [[Backend-offline first]].

### Backend

- Táblák (Liquibase): `workout_session`, `workout_exercise_entry`, `workout_set_entry` (+ katalógus: [[Gyakorlat]] / `exercise_catalog`).
- OpenAPI: nested CRUD `POST` / `PUT /api/workout-sessions` (kötőjeles, mint a `swim-logs` / `bike-ride-logs` / `workout-plans`) — teljes fa egy kérésben; lista / get / delete.
- Validáció: `workoutType` enum; szett mezők `exerciseKind` szerint (szerver oldalon laza vagy típus-szabály).
- Soft delete: `deleted` / `deleted_at` a sessionön; listák szűrnek.
- Update: **teljes nested fa cseréje** egy PUT body-ban (nincs részleges PATCH); a child-diff a `common/NestedChildResolver` (create / undelete / reject).
- Nincs szerveroldali kcal tárolás; opcionális MET-paritás a [[Tápérték kalkulátor]]ssal.
- Auth / user scope: a bejelentkezett user saját sessionjei.
- Konfliktus: kliens UUID; idempotens upsert + sor-szintű last-write-wins ([[Backend-offline first]]).

### Nyitott kérdések

Nincs nyitott kérdés.

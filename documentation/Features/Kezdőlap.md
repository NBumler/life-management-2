---
verifikalva: 2026-10-21
verifikalt_commit: 9ba92f9
---

# Kezdőlap

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]], [[Szinkronizációs központ]], [[Étkezés]], [[Tápérték kalkulátor]], [[Mászónapló]], [[Edzésnapló]], [[Úszás napló]], [[Biciklizés napló]], [[Lépésszám követés]], [[Profile]], [[Android kezdőképernyő widget]], [[Heti adatok]] |

### Jelenlegi működés

A **Kezdőlap** az alsó tab-sor **első** eleme (`/tabs/home`), és — ha a `tab.kezdolap` flag be van
kapcsolva — a login utáni alapértelmezett nézet. Tartalma egy **config-vezérelt widget-verem**:
a mai étkezés állása + a mai edzések. A fejléc naptár-ikonja a [[Heti adatok]] nézetre visz
(ugyanezek a widgetek heti összesítésben, `backlog/233`). Gyorsgombok (Új étkezés / Új mászás) az appon belüli
Kezdőlapon nincsenek (`backlog/232`) — azok az [[Android kezdőképernyő widget]] „Gyorsgombok” és
„Napi összegző” widgetjén élnek.

### Funkcionális leírás

- **Tab-regisztráció:** a `tab.kezdolap` flag a [[Frontend]] tab registry **első** eleme
  (`Kezdőlap` · `/tabs/home` · `home-outline`). Bekapcsolva 5 gombos a tab-sor (Ionic 1–5 gombot
  elbír), kikapcsolva a Kezdőlap eltűnik és a `Menü` marad a végső mentsvár.
- **Login utáni default tab:** ha a `tab.kezdolap` engedélyezett → Kezdőlap; különben a registry
  **első engedélyezett** tabja (`firstEnabledTabRoute` — a `Menü` mindig létezik). A `/tabs` üres
  útvonalának átirányítása ezt a láncot használja, ugyanezt a `featureFlagGuard` is (letiltott flag
  deep linkje → következő engedélyezett tab).
- **Widget-verem (`HOME_WIDGETS`, config-vezérelt sorrend):** minden widget a saját `flag`-jével
  takarva jelenik meg (a tab registry mintája); a lista bővíthető egy új sorral + a hozzá tartozó
  render-ággal. Jelenlegi készlet:

| Widget | Flag | Tartalom |
|---|---|---|
| **Mai étkezés állása** (`today-nutrition`) | `tab.kaja` | A mai bevitt kalória + fehérje / szénhidrát / zsír a **mai célhoz** képest, a hátralévő mennyiséggel. Ugyanaz a szám, mint az [[Étkezés]] dashboardon: `computeDailyNutrition` a mai étkezésekre + `computeTdee` az aznapi aktivitás-kalóriával ([[Tápérték kalkulátor]]). Hiányos profilnál (nincs elég TDEE-bemenet) szám helyett link a [[Profile]]-ra. Ha egy mai tétel hivatkozott receptje/élelmiszere hiányzik, „hiányos" jelzés. |
| **Mai edzések** (`today-workouts`, `backlog/112`) | — (soronként flag-elve) | A mai (lokális naptári nap) lépésszám, edzésnapló, mászás, úszás, bicikli, röplabda és nyújtás ([[Nyújtás]], `backlog/169`) soronként, mindegyik saját extra-kalóriájával **és** egy összesített „Összesen" kcal sorral (`TodayWorkoutsService` — az `activity-kcal.ts` ugyanazon függvényei, mint a „Mai étkezés állása" widget `activityExtraKcal`-ja mögött, így a két szám sosem tér el). Soronként flag: lépés `menu.lepesszam`, edzésnapló `tab.edzes`, mászás `edzes.maszonaplo`, úszás `edzes.uszas`, bicikli `edzes.bicikli`, röplabda `edzes.roplabda`, nyújtás `edzes.nyujtas` (`HOME_TODAY_WORKOUT_ROWS`, ugyanaz a flag-minta, mint a `HOME_WIDGETS`-nél). Egy sor csak akkor jelenik meg, ha aznapra van adata; ha egy engedélyezett sornak sincs mai adata, „Ma még nem volt edzés" üres állapot; ha egyik sor flagje sincs bekapcsolva, a widget nem renderel semmit. |

### UI/UX elvárások

- `ion-header` / `ion-toolbar` a `HOME.TITLE` címmel; a `SyncStatusButton` a `end` slotban
  ([[Frontend]] app-shell chrome minden tabon — [[Backend-offline first]] §16). Előtte, szintén az
  `end` slotban, a `calendar-outline` ikon-gomb (`aria-label` = `HOME.WEEKLY.OPEN`) →
  `/tabs/home/week` ([[Heti adatok]]); a `kezdolap.hetiAdatok` flag takarja (kikapcsolva nincs gomb).
- A widgetek `ion-card`-ok, a `HOME_WIDGETS` sorrendjében, egymás alatt.
- A widgetek címkéi lokalizáltak ([[Nyelv választás]] — `HOME.*`).
- A „Mai étkezés állása" nutriens-soronként `bevitt / cél <mértékegység> (még X)` alakban jelenik meg.
- **Nincs önálló flagje a tab-nak:** a `tab.kezdolap` fedi a tabot és a Kezdőlap képernyőt; az egyes
  widgeteket a saját feature-flagjük takarja, a Heti adatok ikont / route-ot a `kezdolap.hetiAdatok`.

### Megjegyzések

#### Tudatos korlát

- A „Mai étkezés állása" widget a `TodayNutritionService`-ből renderel — ez **külön** implementáció
  ugyanazokból a repository-kból és `shared/` számítókból, mint az [[Étkezés]] dashboard `bars`
  chainje (nem közös komponens); a két hely szám-szinten megegyezik, de a dashboard progress-bar /
  szín-logikája nem került ide.
- A „Mai étkezés állása" és a „Mai edzések" számítása egy közös pure modulban él
  (`core/data/day-summary.ts`: `nutritionForDays` / `workoutsForDays`, `backlog/233`) — a
  `TodayNutritionService` és a `TodayWorkoutsService` a `[ma]` listára hívja, a [[Heti adatok]] a hét
  számolt napjaira; így a két widget kcal-összege és a heti összesítés is garantáltan egyezik.
- Nincs user által átrendezhető / testre szabható widget-sorrend az első körben (a `HOME_WIDGETS`
  tömb sorrendje fix, csak kód/config módosítja).
- Az appon belüli Kezdőlap widget-verem **külön** dolog az [[Android kezdőképernyő widget]]-től
  (launcher `AppWidgetProvider`) — az utóbbi a `TodayNutritionService` ugyanezt a számítását egy
  natív-olvasható pillanatképen át rendereli. A gyorsgomb-funkció kizárólag ott van: a saját
  `WIDGET_ROUTES` / `WIDGET.NEW_*` szerződésén (`core/widget/widget-snapshot.ts`) és a
  `drainPendingRoute()` deep-linken át, az appon belüli Kezdőlaptól függetlenül.
- A [[Szinkronizációs központ]] korábbi `/tabs/dashboard/sync` útvonala **továbbra is elavult** — a
  sync képernyő a `Menü` alatt él, nem ezen a tabon.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `pages/home/home.page.ts` — standalone, OnPush. A `widgets` a `HOME_WIDGETS`-ből szűri ki az
  engedélyezett widgeteket (`FeatureFlagsService.isEnabled`); a template `@switch`-csel rendereli a
  `key` alapján, a widgeteknek a `TodayNutritionService.summary` / `TodayWorkoutsService.summary`
  signalt adja inputként. `ionViewWillEnter` betölti a látszó widgetek szolgáltatását. A
  `weeklyEnabled` (`kezdolap.hetiAdatok`) dönt a fejléc naptár-ikonjáról.
- `pages/home/widgets/today-nutrition-widget.component.ts` — prezentációs: a `summary` input négy
  nutriens-sora + a hátralévő mennyiség; `!computable` ágon [[Profile]] link. `titleKey` /
  `incompleteKey` input (alapból `HOME.NUTRITION.*`) — a [[Heti adatok]] is ezt rendereli.
- `pages/home/widgets/today-workouts-widget.component.ts` — prezentációs: a `HOME_TODAY_WORKOUT_ROWS`
  flag-szűrt sorai közül csak azok renderelnek, amiknek a `summary` inputban van adata
  (`count > 0`); zárósor az összesített kcal; üres flag-készletnél a widget, üres adatnál csak egy
  sor nem renderel. `titleKey` / `emptyKey` input (alapból `HOME.WORKOUTS.*`).
- `core/config/home-widget-registry.ts` — `HOME_WIDGETS` (widget-sorrend + flag) és
  `HOME_TODAY_WORKOUT_ROWS` (a „Mai edzések" widget sor-katalógusa: key / flag / i18n-kulcs / ikon).
- `core/data/today-nutrition.service.ts` — `providedIn: 'root'`; a 11 releváns repository (`Meal`,
  `Recipe`, `Food`, `Profile`, `WorkoutSession`, `SwimLog`, `BikeRideLog`, `VolleyballLog`,
  `StretchSession`, `ClimbingSession`, `DailyStepLog`) signaljaiból `computed`:
  `nutritionForDays(..., [today()])` (`computeDailyNutrition` + `computeTdee` az aznapi
  `activity-kcal` kalóriákkal). `load()` betölti mind a 11-et.
- `core/data/today-workouts.service.ts` — `providedIn: 'root'`; `workoutsForDays(..., [today()])`:
  a mai (`shared/local-date.ts` `today()`) élő log-sorok darabszáma + `activity-kcal.ts` kalóriája
  aktivitásonként (lépés, edzésnapló, mászás, úszás, bicikli, röplabda, nyújtás) + az összeg
  (`totalKcal`). `load()` betölti a 7 log-repository-t + a `Profile`-t.
- `core/data/day-summary.ts` — a fenti két számítás pure, napok listájára paraméterezett alakja
  (közös a [[Heti adatok]]-kal).
- `core/config/tab-registry.ts` — a `Kezdőlap` az első `TabDef`; `firstEnabledTabRoute(featureFlags)`
  adja a default-tab / guard-fallback útvonalat.
- `app.routes.ts` — `tabs` gyerek `home` route `featureFlagGuard('tab.kezdolap')`-pal, gyerekei a
  `''` (Kezdőlap) és a `week` ([[Heti adatok]], `featureFlagGuard('kezdolap.hetiAdatok')`); a `''`
  átirányítás függvény alakú `redirectTo`, ami a `firstEnabledTabRoute`-ot hívja.
- `core/config/feature-flag.guard.ts` — a letiltott flag átirányítása is `firstEnabledTabRoute`
  (nem fix `/tabs/menu`).
- Flag: `assets/config/features.json` `tab.kezdolap` (első kulcs), `FeatureFlagKey` union + kulcslista.
  Nincs függősége (tab-flag, mint a `tab.kaja`).

#### Backend-offline

A Kezdőlap (és a [[Heti adatok]]) kizárólag a helyi store-ból / statikus configból renderel (tab registry, feature flag
asset, i18n, repository signalok) — nincs saját hálózati hívása. A „Mai étkezés állása" és a „Mai
edzések" widget is a helyi SQLite-ból számol, a delta pull után a repository signalokon keresztül
élőben frissül; Full-offline is teljes értékű. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

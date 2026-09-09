---
verifikalva: 2026-09-09
verifikalt_commit: 2d8fec8
---

# Kezdőlap

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]], [[Szinkronizációs központ]], [[Étkezés]], [[Tápérték kalkulátor]], [[Mászónapló]], [[Profile]] |

### Jelenlegi működés

A **Kezdőlap** az alsó tab-sor **első** eleme (`/tabs/home`), és — ha a `tab.kezdolap` flag be van
kapcsolva — a login utáni alapértelmezett nézet. Tartalma egy **config-vezérelt widget-verem**:
gyorsgombok a leggyakoribb létrehozó flow-khoz + a mai étkezés állása.

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
| **Gyorsgombok** (`quick-actions`) | — (mindig) | Gombonként flag-elt gyors-belépők (`HOME_QUICK_ACTIONS`): **Új étkezés** → `/tabs/food/meal/new` (`tab.kaja`), **Új mászás** → `/tabs/workout/climbing` mászás-hub (`edzes.maszonaplo`). Ha egyik gomb sem engedélyezett, a widget nem renderel semmit. |
| **Mai étkezés állása** (`today-nutrition`) | `tab.kaja` | A mai bevitt kalória + fehérje / szénhidrát / zsír a **mai célhoz** képest, a hátralévő mennyiséggel. Ugyanaz a szám, mint az [[Étkezés]] dashboardon: `computeDailyNutrition` a mai étkezésekre + `computeTdee` az aznapi aktivitás-kalóriával ([[Tápérték kalkulátor]]). Hiányos profilnál (nincs elég TDEE-bemenet) szám helyett link a [[Profile]]-ra. Ha egy mai tétel hivatkozott receptje/élelmiszere hiányzik, „hiányos" jelzés. |

- **Gyors-belépő cél:** az „Új mászás" a 4 mászó-kontextus **hubjára** visz (a kontextust ott
  választja a user); nincs „utoljára használt kontextus" emlékezet az első körben.

### UI/UX elvárások

- `ion-header` / `ion-toolbar` a `HOME.TITLE` címmel; a `SyncStatusButton` a `end` slotban
  ([[Frontend]] app-shell chrome minden tabon — [[Backend-offline first]] §16).
- A widgetek `ion-card`-ok, a `HOME_WIDGETS` sorrendjében, egymás alatt.
- A gyorsgombok `ion-button[expand=block]` sorok ikonnal + lokalizált címkével
  ([[Nyelv választás]] — `HOME.*`).
- A „Mai étkezés állása" nutriens-soronként `bevitt / cél <mértékegység> (még X)` alakban jelenik meg.
- **Nincs önálló flagje a tab-nak:** a `tab.kezdolap` fedi a tabot és a Kezdőlap képernyőt; az egyes
  widgeteket a saját feature-flagjük takarja.

### Megjegyzések

#### Tudatos korlát

- A „Mai étkezés állása" widget a `TodayNutritionService`-ből renderel — ez **külön** implementáció
  ugyanazokból a repository-kból és `shared/` számítókból, mint az [[Étkezés]] dashboard `bars`
  chainje (nem közös komponens); a két hely szám-szinten megegyezik, de a dashboard progress-bar /
  szín-logikája nem került ide.
- Nincs user által átrendezhető / testre szabható widget-sorrend az első körben (a `HOME_WIDGETS`
  tömb sorrendje fix, csak kód/config módosítja).
- A [[Szinkronizációs központ]] korábbi `/tabs/dashboard/sync` útvonala **továbbra is elavult** — a
  sync képernyő a `Menü` alatt él, nem ezen a tabon.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `pages/home/home.page.ts` — standalone, OnPush. A `widgets` a `HOME_WIDGETS`-ből szűri ki az
  engedélyezett widgeteket (`FeatureFlagsService.isEnabled`); a template `@switch`-csel rendereli a
  `key` alapján. `ionViewWillEnter` betölti a `TodayNutritionService`-t, ha a nutrition widget látszik.
- `pages/home/widgets/quick-actions-widget.component.ts` — a `HOME_QUICK_ACTIONS` flag-elt szűrése,
  `ion-button` + `routerLink` gombonként; üres listánál nem renderel.
- `pages/home/widgets/today-nutrition-widget.component.ts` — a `TodayNutritionService.summary`
  signal négy nutriens-sora + a hátralévő mennyiség; `!computable` ágon [[Profile]] link.
- `core/config/home-widget-registry.ts` — `HOME_WIDGETS` (widget-sorrend + flag) és
  `HOME_QUICK_ACTIONS` (gomb-katalógus: key / flag / route / ikon / címke).
- `core/data/today-nutrition.service.ts` — `providedIn: 'root'`; a 9 releváns repository (`Meal`,
  `Recipe`, `Food`, `Profile`, `WorkoutSession`, `SwimLog`, `BikeRideLog`, `ClimbingSession`,
  `DailyStepLog`) signaljaiból `computed` összegzés: `computeDailyNutrition` + `computeTdee`
  (`activity-kcal` aznapi kalóriákkal). `load()` betölti mind a 9-et.
- `core/config/tab-registry.ts` — a `Kezdőlap` az első `TabDef`; `firstEnabledTabRoute(featureFlags)`
  adja a default-tab / guard-fallback útvonalat.
- `app.routes.ts` — `tabs` gyerek `home` route `featureFlagGuard('tab.kezdolap')`-pal; a `''`
  átirányítás függvény alakú `redirectTo`, ami a `firstEnabledTabRoute`-ot hívja.
- `core/config/feature-flag.guard.ts` — a letiltott flag átirányítása is `firstEnabledTabRoute`
  (nem fix `/tabs/menu`).
- Flag: `assets/config/features.json` `tab.kezdolap` (első kulcs), `FeatureFlagKey` union + kulcslista.
  Nincs függősége (tab-flag, mint a `tab.kaja`).

#### Backend-offline

A Kezdőlap kizárólag a helyi store-ból / statikus configból renderel (tab registry, feature flag
asset, i18n, repository signalok) — nincs saját hálózati hívása. A „Mai étkezés állása" widget a
helyi SQLite-ból számol, a delta pull után a repository signalokon keresztül élőben frissül;
Full-offline is teljes értékű. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

---
verifikalva: 2026-10-21
verifikalt_commit: 9ba92f9
---

# Heti adatok

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kezdőlap]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]], [[Étkezés]], [[Tápérték kalkulátor]], [[Lépésszám követés]], [[Edzésnapló]], [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]], [[Röplabda napló]], [[Nyújtás]], [[Profile]], [[Naptár]], [[Heti terv]] |

### Jelenlegi működés

A **Heti adatok** a [[Kezdőlap]] heti párja (`/tabs/home/week`, `backlog/233`): ugyanazok a widgetek
(étkezés állása + edzések), de egy **hétfőtől vasárnapig** tartó hét összesítéseként. A Kezdőlap
fejlécének naptár-ikonjáról nyílik; belépéskor mindig az aktuális hetet mutatja, és vissza lehet
lapozni a korábbi hetekre.

### Funkcionális leírás

- **Belépési pont:** a Kezdőlap `ion-toolbar`-jában `calendar-outline` ikon-gomb az `end` slotban,
  a `SyncStatusButton` előtt; `aria-label` és `title` = `HOME.WEEKLY.OPEN` („Heti adatok”).
  Koppintásra `/tabs/home/week`. A `kezdolap.hetiAdatok` flag takarja: kikapcsolva nincs ikon, és
  a route `featureFlagGuard`-ja a deep linket az első engedélyezett tabra irányítja.
- **A hét:** hétfőtől vasárnapig (ISO-8601 — ugyanaz a konvenció, mint a [[Naptár]] hónap-rácsában
  és a [[Heti terv]]ben), a készülék helyi naptári napjaiban (`shared/local-date.ts`
  `startOfIsoWeek`).
- **Hétváltó** (második toolbar): `‹` előző hét · a tartomány `ÉÉÉÉ-HH-NN – ÉÉÉÉ-HH-NN` alakban
  (`HOME.WEEKLY.RANGE`) · `›` következő hét. Az aktuális héten a `›` le van tiltva (jövőbe nem lehet
  lépni); nem aktuális hétnél megjelenik az „Ez a hét” gomb (`HOME.WEEKLY.THIS_WEEK`). Minden
  belépés (`ionViewWillEnter`) visszaállít az aktuális hétre.
- **Számolt napok:** az aktuális héten hétfőtől **máig** (a mai nap is), lezárt héten mind a 7 nap.
  Az aktuális héten a tartalom tetején „7 napból N nap” felirat (`HOME.WEEKLY.DAYS_COUNTED`);
  lezárt hétnél nincs ilyen felirat.
- **Widget-verem (`WEEKLY_WIDGETS`):** ugyanazok a widgetek, flagek és sorrend, mint a
  `HOME_WIDGETS`-ben:

| Widget | Flag | Tartalom |
|---|---|---|
| **Heti étkezés állása** (`week-nutrition`) | `tab.kaja` | A számolt napokon bevitt kcal / fehérje / szénhidrát / zsír a számolt napok **napi céljainak összegéhez** képest, `bevitt / cél <me> (még X)` alakban. Bevitel: `computeDailyNutrition` azokra az étkezésekre, amelyek `eatenAt`-je (a készülék zónájában) egy számolt napra esik. Cél: minden számolt napra külön `computeTdee(profil, nap, activityExtraKcal(nap))` — az aznapi lépés- és edzéskalóriával —, napi kcal- és makró-célok összeadva. Hiányos profilnál szám helyett [[Profile]] link; ha bármely számolt nap egy tételének receptje/élelmiszere hiányzik, „hiányos" jelzés (`HOME.WEEKLY.NUTRITION_INCOMPLETE`). |
| **Heti edzések** (`week-workouts`) | — (soronként flag) | A „Mai edzések" sorai (`HOME_TODAY_WORKOUT_ROWS`: lépés, edzésnapló, mászás, úszás, bicikli, röplabda, nyújtás — ugyanazok a flagek és ikonok) a heti darabszámmal és heti kcal-összeggel; a lépés sorban a heti **összes lépésszám**. Zárósor: „Összesen" kcal. Egy sor csak akkor jelenik meg, ha a héten van adata; ha egy engedélyezett sornak sincs, „Ezen a héten még nem volt edzés" (`HOME.WEEKLY.NO_WORKOUTS`); ha egyik sor flagje sincs bekapcsolva, a widget nem renderel. |

- **Konzisztencia:** minden heti érték a számolt napok napi értékeinek összege, ugyanazokkal a
  függvényekkel számolva, mint a Kezdőlap mai widgetjei — egyetlen számolt napnál (hétfő) a heti
  számok pontosan megegyeznek a Kezdőlap számaival.

### UI/UX elvárások

- Fejléc: `ion-back-button` (`defaultHref="/tabs/home"`), cím `HOME.WEEKLY.TITLE` („Heti adatok”),
  `SyncStatusButton` az `end` slotban ([[Frontend]] app-shell chrome).
- A tab-sorban a Kezdőlap tab marad aktív (a route a `home` tab gyereke).
- A widgetek ugyanazok az `ion-card` komponensek, mint a Kezdőlapon, heti címekkel
  (`HOME.WEEKLY.NUTRITION_TITLE` / `HOME.WEEKLY.WORKOUTS_TITLE`).
- Minden felirat lokalizált ([[Nyelv választás]] — `HOME.WEEKLY.*`).

### Megjegyzések

#### Tudatos korlát

- A cél minden napra a **jelenlegi** profilból (testsúly, cél, kg/hét) számol, ahogy a napi
  számítás is — egy régi hét célja ezért nem a „korabeli" célt mutatja.
- Az a számolt nap is beleszámít a célba, amelyre nincs rögzített étkezés: a nem rögzített nap
  „lemaradásként" látszik, így a heti egyenleg őszinte marad.
- A dátumtartomány ISO-alakú (`ÉÉÉÉ-HH-NN`), ahogy az [[Étkezés]] dashboard napváltója is — nincs
  lokalizált hónapnév-formázás.
- Csak hét-szintű nézet van; havi / tetszőleges tartomány nincs.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `pages/home/weekly/weekly-overview.page.ts` — standalone, OnPush; a `WEEKLY_WIDGETS`-ből a
  flag-szűrt widgeteket `@switch`-csel rendereli, a hétváltó a `WeeklyOverviewService`
  metódusait hívja; `ionViewWillEnter` → `showCurrentWeek()` + `load()`.
- `core/data/weekly-overview.service.ts` — `providedIn: 'root'`; `weekStart` signal (a hét hétfője),
  `weekEnd`, `isCurrentWeek`, `countedDays` (`daysInRange(weekStart, min(weekEnd, today))`),
  `nutrition` és `workoutsSummary` `computed`; `previousWeek()` / `nextWeek()` (az aktuális héten
  no-op) / `showCurrentWeek()`; `load()` a 11 repository-t tölti.
- `core/data/day-summary.ts` — pure TS: `nutritionForDays(inputs, days, zone)`,
  `workoutsForDays(logs, days, weight)`, `activityExtraKcalForDay`. Ugyanezt hívja a
  `TodayNutritionService` és a `TodayWorkoutsService` a `[today]` listára, így a napi és a heti
  szám egy kódúton számol.
- `pages/home/widgets/today-{nutrition,workouts}-widget.component.ts` — prezentációs komponensek
  (`summary` kötelező input + `titleKey` / `incompleteKey` / `emptyKey` input, Kezdőlap-alapértékkel);
  a Kezdőlap és a Heti adatok is ezeket rendereli.
- `core/config/home-widget-registry.ts` — `WEEKLY_WIDGETS`.
- `shared/local-date.ts` — `startOfIsoWeek`, `daysInRange`.
- `app.routes.ts` — `tabs/home` gyerekei: `''` (Kezdőlap) és `week`
  (`featureFlagGuard('kezdolap.hetiAdatok')`).
- Flag: `kezdolap.hetiAdatok` (`features.json`, `FeatureFlagKey`), függőség: `tab.kezdolap`.

#### Backend-offline

A Heti adatok kizárólag a helyi store repository-signaljaiból számol (étkezések, receptek,
élelmiszerek, profil, lépés- és edzés-logok) — nincs saját hálózati hívása és nincs mutációja.
Backend-offline és Full-offline is teljes értékű; a delta pull után a signalokon át élőben frissül.
Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.

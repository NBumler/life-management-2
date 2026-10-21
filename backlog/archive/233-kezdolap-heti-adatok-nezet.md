---
id: 233
type: feature
status: done
title: Kezdőlap — „Heti adatok” nézet (a napi widgetek heti összesítője)
specs:
  - "[[Kezdőlap]]"
  - "[[Heti adatok]]"
flag: kezdolap.hetiAdatok
created: 2026-10-21
closed: 2026-10-21
---

# 233 — Kezdőlap — „Heti adatok” nézet

## Motiváció / probléma

A Kezdőlap csak a **mai** napot összesíti (mai étkezés + mai edzések). Nincs olyan hely, ahol
egy pillantással látszik, hogy **az adott héten** hogy áll a bevitel a célhoz képest, és mennyit
edzettem. Az új „Heti adatok” felület ugyanazokat az adatokat mutatja, mint a Kezdőlap, csak
heti szinten. Egyelőre ugyanaz a tartalom, új heti widgetek később jöhetnek.

## Jelenlegi működés

[[Kezdőlap]] (`/tabs/home`): `HOME_WIDGETS` config-vezérelt widget-verem, két widgettel:
- **Mai étkezés állása**: `TodayNutritionService`, `computeDailyNutrition` a mai étkezésekre +
  `computeTdee` az aznapi aktivitás-kalóriával; `bevitt / cél (még X)` kcal + 3 makró.
- **Mai edzések**: `TodayWorkoutsService`, soronként lépés / edzésnapló / mászás / úszás / bicikli /
  röplabda / nyújtás a darabszámmal és kcal-lal, plusz egy „Összesen” sor. Soronként flag
  (`HOME_TODAY_WORKOUT_ROWS`).

Heti nézet, gomb vagy route jelenleg nincs.

## Specifikáció

### Belépési pont: gomb a Kezdőlapon

- A Kezdőlap `ion-toolbar`-jában **ikon-gomb** a `SyncStatusButton` mellett, az `end` slotban
  (`calendar-outline` ikon). Akadálymentes címkéje (`aria-label`) és tooltipje a `HOME.WEEKLY.OPEN`
  kulcs (hu: „Heti adatok”, en: „Weekly overview”).
- A gombot a `kezdolap.hetiAdatok` flag takarja: kikapcsolt flagnél nincs gomb (nem marad letiltott
  gomb), és a route-ot is a `featureFlagGuard` védi.
- Koppintásra a `/tabs/home/week` útvonalra navigál.

### A „Heti adatok” felület (`/tabs/home/week`)

**Fejléc:** `ion-back-button` (vissza a Kezdőlapra), cím: `HOME.WEEKLY.TITLE` („Heti adatok”),
`SyncStatusButton` az `end` slotban, ahogy az app-shell minden képernyőjén.

**A hét kiválasztása:**
- A hét **hétfőtől vasárnapig** tart (ISO-8601, ugyanaz, mint a [[Naptár]] hónap-rácsában és a
  [[Heti terv]]ben). A napok a készülék helyi naptári napjai (`shared/local-date.ts`).
- Belépéskor az **aktuális hét** látszik.
- Hétváltó sáv a tartalom tetején: `‹` előző hét · dátumtartomány (pl. „okt. 20 – okt. 26.”,
  lokalizált formátum) · `›` következő hét. A `›` az aktuális héten **le van tiltva**, jövőbeli hétre
  nem lehet lépni. Ha nem az aktuális hét látszik, megjelenik egy „Ez a hét” gomb (`HOME.WEEKLY.THIS_WEEK`),
  ami visszaugrik.
- **Számolt napok:** az aktuális héten hétfőtől **máig** (a mai napot is beleértve), lezárt héten
  mind a 7 nap. A sáv alatt egy kis felirat jelzi, hány nap számít bele: „7 napból 3 nap”
  (`HOME.WEEKLY.DAYS_COUNTED`), lezárt hétnél ez nem jelenik meg.

**Widgetek:** ugyanaz a config-vezérelt minta, mint a Kezdőlapon. Egy új `WEEKLY_WIDGETS` registry
ugyanazokkal a flagekkel, ugyanabban a sorrendben:

| Widget | Flag | Tartalom |
|---|---|---|
| **Heti étkezés állása** (`week-nutrition`) | `tab.kaja` | A számolt napokon bevitt kcal / fehérje / szénhidrát / zsír a számolt napok **napi céljainak összegéhez** képest, `bevitt / cél <me> (még X)` alakban, mint a mai widgetben. Bevitel: `computeDailyNutrition` a hét számolt napjaira eső étkezésekre (`calendarDayInZone(eatenAt)` a tartományban). Cél: napról napra `computeTdee(profil, nap, activityExtraKcal(nap)).dailyAllowanceKcal` és a makró-célok, összeadva. Az `activityExtraKcal(nap)` ugyanaz a 7 `activity-kcal.ts` függvény, mint a mai widgetben, csak a megadott napra. Hiányos profilnál szám helyett [[Profile]] link; ha bármelyik számolt nap egy tételének receptje vagy élelmiszere hiányzik, „hiányos” jelzés. |
| **Heti edzések** (`week-workouts`) | — (soronként flag) | Ugyanazok a sorok, ikonok, flagek és sorrend, mint a „Mai edzések” widgetben (`HOME_TODAY_WORKOUT_ROWS` újrahasznosítva). Soronként a heti darabszám és a heti kcal-összeg, a lépés sorban a heti **összes lépésszám**. Zárósor: „Összesen” kcal. Egy sor csak akkor jelenik meg, ha a héten van adata. Ha egy engedélyezett sornak sincs heti adata, „Ezen a héten még nem volt edzés” (`HOME.WEEKLY.NO_WORKOUTS`) üres állapot. Ha egyik sor flagje sincs bekapcsolva, a widget nem renderel. |

**Konzisztencia-szabály:** az aktuális héten, ha csak a mai nap számít (hétfő), a heti számok
**pontosan** megegyeznek a Kezdőlap mai widgetjeinek számaival. Általánosan: a heti érték mindig a
napi értékek összege a számolt napokra, ugyanazokkal a függvényekkel számolva.

### Elfogadott korlátok (a lezáráskor a spec `#### Tudatos korlát` alá kerülnek)

- A cél-számítás minden napra a **jelenlegi** profilt (testsúly, cél, kg/hét) használja, ahogy a
  napi számítás is. Régi heteknél a cél ezért nem a „korabeli” célt mutatja.
- Az a számolt nap is beleszámít a célba, amelyre nincs rögzített étkezés. Egy nem rögzített nap
  emiatt „lemaradásként” látszik. Ez szándékos: a heti egyenleg őszinte marad.

## Elfogadási kritériumok

- [ ] Új flag: `kezdolap.hetiAdatok` (`features.json`, alapból `true`; `FeatureFlagKey` union +
      kulcslista). Kikapcsolva nincs fejléc-ikon, és a `/tabs/home/week` deep link a guard szerint
      átirányít.
- [ ] Kezdőlap fejléc: `calendar-outline` ikon-gomb az `end` slotban, `aria-label` =
      `HOME.WEEKLY.OPEN`, koppintásra `/tabs/home/week`.
- [ ] Route: `tabs` → `home/week` (lazy `WeeklyOverviewPage`, `featureFlagGuard('kezdolap.hetiAdatok')`),
      a tab-sor továbbra is a Kezdőlap tabot jelöli aktívnak.
- [ ] Hétváltó: hétfő–vasárnap tartomány, előző/következő, a jövő letiltva, „Ez a hét” gomb nem
      aktuális hétnél, „7 napból N nap” felirat az aktuális héten.
- [ ] `week-nutrition` widget: a számolt napok bevitele a napi célok összegéhez képest (kcal + 3 makró),
      profil-hiány ág, hiányos ág.
- [ ] `week-workouts` widget: soronkénti heti darabszám + kcal, lépés sorban a heti lépésszám,
      „Összesen” sor, üres állapot, flag-szűrés a `HOME_TODAY_WORKOUT_ROWS` szerint.
- [ ] A per-nap logika (napi étkezés-szűrés, `activityExtraKcal(nap)`, per-aktivitás tally) ki van
      emelve, és a mai és a heti szolgáltatás is ezt hívja. Így a heti érték garantáltan a napi
      értékek összege. Unit test: egy napos tartományra a heti eredmény megegyezik a mai
      szolgáltatáséval.
- [ ] Unit test: hét-határ számítás (hétfő/vasárnap, évváltás, az aktuális hét levágása máig).
- [ ] i18n: `HOME.WEEKLY.*` kulcsok hu + en, azonos placeholderekkel (`verify:i18n` zöld).
- [ ] Full-offline működik (csak helyi repository signalokból számol, nincs hálózati hívás).
- [ ] Zöld gate: test:ci + lint + build + `verify:outbox` + `verify:i18n`.
- [ ] Spec: új `documentation/Subfeatures/Heti adatok.md` (Szülő: [[Kezdőlap]], teljes sablon,
      `#### Backend-offline`-nal). A [[Kezdőlap]] specben: fejléc-ikon, flag, kapcsolódó link.
      [[Frontend]]: route- és flag-lista.

## Terv / döntési napló

- **2026-10-21, user döntések:**
  - A hét lapozható, az aktuális héttel indul, jövőbe nem lehet lépni.
  - A heti étkezés-cél a **számolt (eltelt) napok napi céljainak összege**. Nem a teljes heti
    keret, és nem napi átlag.
  - A belépési pont **fejléc-ikon** (nem tartalom-gomb).
- **Saját döntések (scoping):**
  - A hét hétfőtől vasárnapig tart, ugyanaz a konvenció, mint a Naptárban és a Heti tervben.
  - Saját flag (`kezdolap.hetiAdatok`), a projekt per-feature flag mintája szerint
    (pl. `edzes.hetiTerv`).
  - Child route a home tab alatt (`/tabs/home/week`), nem önálló tab.
  - Nincs backend-érintettség: minden szükséges adat (étkezések, logok, profil) már a helyi
    store-ban van.
- **Implementációs javaslat:**
  - `shared/local-date.ts`: `startOfIsoWeek(iso)` + `daysInRange(from, to)` helperek.
  - `core/data/`: egy `WeeklyOverviewService` (`providedIn: 'root'`) `weekStart` signallal.
    A `TodayNutritionService` és a `TodayWorkoutsService` per-nap számítását egy közös,
    napra paraméterezett pure függvénybe érdemes kiemelni (pl. `nutritionForDay(...)`,
    `workoutTallyForDay(...)`). Így a „heti = napi összeg” invariáns kódszinten is igaz, és nem
    kerül be egy harmadik párhuzamos implementáció a meglévő két „Tudatos korlát” mellé.
  - Widgetek: `pages/home/weekly/` alatt a page és a két widget-komponens.
- **Implementáció közben (2026-10-21):**
  - Új widget-komponensek helyett a két meglévő widget lett prezentációs (`summary` input +
    `titleKey` / `incompleteKey` / `emptyKey`), így a napi és a heti nézet ugyanazt a komponenst rendereli.
  - A dátumtartomány ISO-alakú (`ÉÉÉÉ-HH-NN – ÉÉÉÉ-HH-NN`), ahogy az Étkezés dashboard napváltója —
    a „lokalizált formátum” helyett; a spec `#### Tudatos korlát` alatt rögzíti.
  - A heti nézet minden belépéskor visszaáll az aktuális hétre.

## Lezáráskor (on-done)

- Frissített specek: [[Heti adatok]] (új Subfeature spec); [[Kezdőlap]] (fejléc-ikon, `kezdolap.hetiAdatok`,
  a widgetek prezentációsak, közös `day-summary.ts` — a „két külön implementáció” korlát megszűnt);
  [[Frontend]] (route-tábla, flag registry, `kezdolap.*` függőség)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-21 — Kezdőlap „Heti adatok” nézet (#233)
- Kód: `core/data/day-summary.ts`, `core/data/weekly-overview.service.ts`, `pages/home/weekly/`,
  `pages/home/widgets/*` (input-vezérelt), `core/config/home-widget-registry.ts` (`WEEKLY_WIDGETS`),
  `shared/local-date.ts` (`startOfIsoWeek`, `daysInRange`), `app.routes.ts`, `feature-flags.service.ts`

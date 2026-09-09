---
id: 95
type: feature
status: done
title: Kezdőképernyő — widgetek / gyorsgombok egyes funkciókhoz
specs:
  - "[[Frontend]]"
  - "[[Kezdőlap]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 95 — Kezdőképernyő — widgetek / gyorsgombok egyes funkciókhoz

## Motiváció / probléma

A kezdőlapon legyenek **widgetek / gyorsgombok** a leggyakoribb műveletekhez, hogy 0–1 tapról
elérhetők legyenek — pl.:

- „Új mászás" (a 4 mászó kontextus egyike / legutóbbi)
- „Új étkezés"
- „Mai étkezés állása" (bevitt kcal / makró a mai célhoz képest — kis állapot-widget)

Ez a [[096-uj-feature-kezdolap-dashboard-tab]] jegyben létrejövő kezdőlap **tartalma** — ez a
jegy a widget-készletről és a viselkedésükről szól.

## Jelenlegi működés

Nincs kezdőlap ([[Frontend]] → nincs Dashboard tab). Minden művelet a saját tabjából, tapokkal
érhető el.

## Elfogadási kritériumok

- [x] Widget-katalógus definiálva (`HOME_WIDGETS` + `HOME_QUICK_ACTIONS`): gyorsgombok widget
      (Új étkezés, Új mászás — mindegyik cím + ikon + cél-route) és „Mai étkezés állása" widget.
- [x] „Mai étkezés állása" widget a `TodayNutritionService`-ből (`computeDailyNutrition` +
      `computeTdee` — [[Tápérték kalkulátor]] / [[Étkezés]] mai összesítése, szám-szinten egyező),
      csak helyi store — Full-offline is működik.
- [x] „Új mászás" (mászás-hub) / „Új étkezés" (`/tabs/food/meal/new`) gyors-belépő.
- [x] Kikapcsolt feature flag → a widget / gomb nem jelenik meg (`HOME_WIDGETS` + `HOME_QUICK_ACTIONS`
      flag-szűrés a tab-registry mintájára); a gyorsgombok widget üres listánál nem renderel.
- [x] A widgetek sorrendje a `HOME_WIDGETS` tömbből jön (nem beégetett a template-be), új sorral +
      `@switch` ággal bővíthető.
- [x] `#### Backend-offline`: minden widget helyi repository-signalból renderel; a gyorsgombok
      pusztán navigáció. Lásd [[Backend-offline first]].

## Terv / döntési napló

_Függ a [[096-uj-feature-kezdolap-dashboard-tab]]-től (a hordozó képernyő)._

**Döntés:** fix widget-készlet és -sorrend az első körben (nincs user-átrendezés / testreszabás) — a
`HOME_WIDGETS` tömb a config, bővítés kód/config módosítással.

**Döntés:** az „Új mászás" gomb a 4 mászó-kontextus **hubjára** visz (nincs „utoljára használt
kontextus" emlékezet) — a hub a mászás egyetlen létrehozó belépője.

**Döntés:** a „Mai étkezés állása" widget **külön** `TodayNutritionService`-ből számol, nem egy közös
komponens az [[Étkezés]] dashboarddal — a számok megegyeznek (ugyanaz a `computeDailyNutrition` +
`computeTdee` chain), a dashboard progress-bar / szín-logikája nem került a widgetbe. Tudatos korlát
a [[Kezdőlap]] specben.

## Lezáráskor (on-done)

Commit: (ld. `IMPLEMENTATION_STATUS.md` 2026-09-09 — #95)

- **Widget-registry:** `core/config/home-widget-registry.ts` — `HOME_WIDGETS` (`quick-actions` flag
  nélkül, `today-nutrition` `tab.kaja`) + `HOME_QUICK_ACTIONS` (`new-meal` `tab.kaja` →
  `/tabs/food/meal/new`, `new-climb` `edzes.maszonaplo` → `/tabs/workout/climbing`).
- **Adatforrás:** `core/data/today-nutrition.service.ts` (`providedIn: 'root'`) — 9 repository
  (`Meal`/`Recipe`/`Food`/`Profile`/`WorkoutSession`/`SwimLog`/`BikeRideLog`/`ClimbingSession`/`DailyStepLog`)
  signaljából `computed` `summary` (`computable` + `incomplete` + 4 nutriens `{intake, goal}`);
  a `MealDashboardPage` `bars` chainjét reprodukálja. `load()` betölti mind a 9-et.
- **Komponensek:** `pages/home/widgets/quick-actions-widget.component.*` (flag-elt gombsor, üresen
  nem renderel), `pages/home/widgets/today-nutrition-widget.component.*` (`summary` négy sora +
  hátralévő; `!computable` ágon [[Profile]] link; `.scss`).
- **Oldal:** `pages/home/home.page.ts` átírva — `widgets` = `HOME_WIDGETS` flag-szűrve, template
  `@switch` a `key`-re; `ionViewWillEnter` → `TodayNutritionService.load()` (ha a nutrition widget
  látszik). A `#96` gyorslink-placeholder + `HOME.INTRO` eltávolítva.
- **i18n:** `HOME.QUICK.{TITLE,NEW_MEAL,NEW_CLIMB}` + `HOME.NUTRITION.*` (hu + en).
- **Teszt:** `home-widget-registry.spec.ts`, `today-nutrition.service.spec.ts`,
  `quick-actions-widget.component.spec.ts`, `today-nutrition-widget.component.spec.ts` (mind új),
  `home.page.spec.ts` átírva. Zöld kapu: FE lint ✓, `test:ci` **1647** ✓, build ✓,
  `verify:outbox` v6/36 ✓ (nincs outbox-érintés), backend `./gradlew test` ✓.
- **Spec:** [[Kezdőlap]] (widget-verem tábla + Tudatos korlát), `documentation/Architektúra/Frontend.md`
  (tab tábla + route-térkép sor), [[Étkezés]] + [[Mászónapló]] (`### UI/UX elvárások` — gyors-belépő,
  Kapcsolódó lista). Stamp `verifikalt_commit: 2d8fec8` a Frontend.md és a Kezdőlap.md fejlécén.
- **Nincs backend érintés** (frontend-only feature).

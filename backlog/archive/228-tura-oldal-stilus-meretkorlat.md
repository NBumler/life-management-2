---
id: 228
type: change-request
status: done
title: Túra — a tura.page.scss túllépi a komponens-stílus méret-figyelmeztetését
specs: []
flag: menu.tura
created: 2026-10-20
closed: 2026-10-20
---

# 228 — Túra — a tura.page.scss túllépi a komponens-stílus méret-figyelmeztetését

## Motiváció / probléma

Forrás: az 5. UX-szelet buildje (`2705df8`). Az `angular.json` `anyComponentStyle` budgetje
2 kB-nál figyelmeztet, 4 kB-nál hibával megállítja a buildet. A `tura.page.scss` lefordítva már az
5. szelet előtt 2,2 kB volt, most **3,4 kB** — a következő Túra-szeletek (lebegő sávok, katalógus,
letöltési panel) könnyen átlépik a 4 kB-ot, és akkor a build eltörik.

## Jelenlegi működés

- `frontend/src/app/pages/menu/tura/tura.page.scss` (~5,5 kB forrás, 295 sor) tartalmazza a teljes
  oldal stílusát: lebegő vezérlők, mód-sáv, tipp-sáv, piszkozat-kártya, előnézet, koppintásos
  turistaút-kártya, panelek, részletek-sheet, napok-szerkesztő.
- Már kiemelt komponensek saját stílussal: `elevation-profile`, `route-details`, `tura-legend`.

## Elfogadási kritériumok

- [x] A `tura.page.scss` lefordított mérete a 2 kB-os figyelmeztetési határ alá kerül, a budget
      emelése nélkül (a budget emelése csak indokolt, naplózott döntéssel).
- [x] Bontás önálló, OnPush standalone komponensekre ott, ahol a sablon-rész is önálló egység
      (javaslat: piszkozat-kártya, napok-szerkesztő, katalógus-panel, Útvonalaim-panel) — a stílus a
      komponenssel együtt költözik; közös tokenek / mixinek `shared` partialba.
- [x] Vizuálisan nincs változás: emulátoron 360 dp, hu + en screenshot előtte / utána minden fő állapotban.
- [x] `lint`, `test:ci`, `build` (budget-figyelmeztetés nélkül a Túra oldalra), `verify:i18n` zöld.

## Terv / döntési napló

- 2026-10-20 — kész, a budget emelése nélkül: a `tura.page.scss` 3,51 kB-ról 2 kB alá került (a build nem
  jelez a Túra oldalra). Négy önálló, OnPush standalone komponens, a stílusa együtt költözött:
  - `days-editor.component` — a piszkozat napjai (napi értékek, napváltó-választó, éjszakázó hely, megjegyzések);
    a választó opcióit a page számolja (`dayBreakOptions`), a változásokat eseményként kapja vissza;
  - `tura-mode-bar.component` — a Kézi / Turistaúton / Visszavonás / Törlés sáv (`DrawMode` típus innen);
  - `tapped-trails.component` — a koppintott turistaút(ak) színmintával és névvel (`TappedTrail` típus innen);
  - `map-hint.component` — a lebegő jelzés („Közelíts rá…”); a #226 töltésjelzője is ezt használja (`busy`).
  Közös partial nem kellett: a komponensek nem osztanak tokent (a mód-sáv a kártya keretét saját `:host`-ként hordja).
  Az első három bontás után 28 bájt hiányzott, ezért került ki a lebegő jelzés is.
  Vizuális ellenőrzés emulátoron 360 dp, hu + en: alapállapot, koppintott turistaút kártyája, „Közelíts rá”
  jelzés, Kézi mód piszkozattal, részletek-lap napváltóval (napi értékek, választó, utolsó nap, megjegyzés,
  napváltó törlése). „Előtte” képnek a korábbi (5–7.) szeletek screenshotjai szolgáltak, nem egy külön
  előtte-build; eltérést nem láttam.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #229, #227, #194, #228, #226
- Kód: `pages/menu/tura/`

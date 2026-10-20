---
id: 228
type: change-request
status: backlog
title: Túra — a tura.page.scss túllépi a komponens-stílus méret-figyelmeztetését
specs: []
flag: menu.tura
created: 2026-10-20
closed:
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

- [ ] A `tura.page.scss` lefordított mérete a 2 kB-os figyelmeztetési határ alá kerül, a budget
      emelése nélkül (a budget emelése csak indokolt, naplózott döntéssel).
- [ ] Bontás önálló, OnPush standalone komponensekre ott, ahol a sablon-rész is önálló egység
      (javaslat: piszkozat-kártya, napok-szerkesztő, katalógus-panel, Útvonalaim-panel) — a stílus a
      komponenssel együtt költözik; közös tokenek / mixinek `shared` partialba.
- [ ] Vizuálisan nincs változás: emulátoron 360 dp, hu + en screenshot előtte / utána minden fő állapotban.
- [ ] `lint`, `test:ci`, `build` (budget-figyelmeztetés nélkül a Túra oldalra), `verify:i18n` zöld.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #228
- Kód: `pages/menu/tura/`
